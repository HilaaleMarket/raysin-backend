import { Request, Response } from 'express';
import { prisma } from '../server.js';
import { supabase } from '../config/supabaseClient.js';

interface AuthRequest extends Request {
  user?: {
    id: string;
    email?: string;
    role?: string;
  };
  files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] };
  file?: Express.Multer.File;
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

// Helper cusub oo Object-ka Category/Vendor toos ka tirtiraya si Skaner-ku Alert u bixin
const sanitizeProduct = (product: any) => {
  if (!product) return null;
  const { category, vendor, ...rest } = product;

  return {
    ...rest,
    categoryName: category?.name || product.categoryName || 'Uncategorized',
    vendorName: vendor?.name || product.vendorName || 'Vendor',
  };
};

// 1. Soo helitaanka Vendor ID sax ah (Fixed logic edge-cases)
const getTargetVendorId = async (vendorId?: string, userId?: string, userEmail?: string): Promise<string | null> => {
  if (vendorId && vendorId !== 'v1') {
    const vendorExists = await prisma.vendor.findUnique({ where: { id: String(vendorId) } });
    if (vendorExists) return vendorExists.id;
  }
  
  if (userId) {
    const directVendor = await prisma.vendor.findUnique({ where: { id: String(userId) } });
    if (directVendor) return directVendor.id;
  }

  if (userEmail) {
    const vendorByEmail = await prisma.vendor.findFirst({ where: { email: userEmail } });
    if (vendorByEmail) return vendorByEmail.id;
  }

  return null;
};

// 2. Sawirrada Upload-ka Supabase
const uploadFileToSupabase = async (file: Express.Multer.File): Promise<string | null> => {
  try {
    const fileExt = file.originalname.split('.').pop() || 'png';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(fileName, file.buffer, { contentType: file.mimetype, upsert: true });

    if (uploadError) {
      console.error("Supabase Upload Error:", uploadError.message);
      return null;
    }

    const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(fileName);
    return urlData?.publicUrl || null;
  } catch (error) {
    console.error("File upload helper error:", error);
    return null;
  }
};

// 3. Category Resolution
const resolveCategoryId = async (categoryId?: string, categoryName?: string): Promise<string | null> => {
  if (categoryId) {
    const catExists = await prisma.category.findUnique({ where: { id: String(categoryId) } });
    if (catExists) return catExists.id;
  }

  if (categoryName) {
    const trimmedName = String(categoryName).trim();
    if (!trimmedName) return null;

    const existingCat = await prisma.category.findFirst({
      where: { name: { equals: trimmedName, mode: 'insensitive' } }
    });

    if (existingCat) return existingCat.id;

    const newCat = await prisma.category.create({ data: { name: trimmedName } });
    return newCat.id;
  }

  return null;
};

// ==========================================
// CONTROLLERS
// ==========================================

// 1. ABUURISTA ALAABTA (CREATE PRODUCT)
export const createProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    let payload = req.body || {};

    if (payload.data && typeof payload.data === 'string') {
      try {
        payload = JSON.parse(payload.data);
      } catch (e) {
        console.error("JSON parse error on req.body.data:", e);
      }
    }

    const { name, title, price, originalPrice, description, category, categoryId, vendorId, stock } = payload;
    const productName = (name || title || '').trim();
    const parsedPrice = parseFloat(price);

    if (!productName || isNaN(parsedPrice)) {
      res.status(400).json({ error: 'Fadlan soo dhiib magaca alaabta (name) iyo qiimaha saxda ah (price).' });
      return;
    }

    const targetVendorId = await getTargetVendorId(vendorId, req.user?.id, req.user?.email);
    if (!targetVendorId) {
      res.status(401).json({ error: 'Adoo mahadsan, ma haysatid akoon Vendor ah oo sax ah ama log-in kuma adid.' });
      return;
    }

    let uploadedUrls: string[] = [];
    let fileList: Express.Multer.File[] = [];

    if (req.files) {
      fileList = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
    } else if (req.file) {
      fileList = [req.file];
    }

    if (fileList.length > 0) {
      const results = await Promise.all(fileList.map(file => uploadFileToSupabase(file)));
      uploadedUrls = results.filter((url): url is string => url !== null);
    }

    if (payload.images && Array.isArray(payload.images)) {
      uploadedUrls = [...uploadedUrls, ...payload.images];
    } else if (payload.image && typeof payload.image === 'string') {
      uploadedUrls.push(payload.image);
    }

    const resolvedCategoryId = await resolveCategoryId(categoryId, category);
    const parsedStock = parseInt(stock, 10);
    const parsedOriginalPrice = originalPrice ? parseFloat(originalPrice) : null;

    const newProduct = await prisma.product.create({
      data: {
        name: productName,
        description: description || '',
        price: parsedPrice,
        originalPrice: parsedOriginalPrice && !isNaN(parsedOriginalPrice) ? parsedOriginalPrice : null,
        stock: isNaN(parsedStock) ? 0 : parsedStock,
        image: uploadedUrls[0] || payload.image || '',
        images: uploadedUrls,
        vendorId: targetVendorId,
        isDeleted: false, // 🛡️ Hakinta tir-tirida
        status: 'ACTIVE',  // 🛡️ Alaabta active ka dhig
        ...(resolvedCategoryId ? { categoryId: resolvedCategoryId } : {}),
      },
      include: {
        category: { select: { name: true } },
        vendor: { select: { name: true } },
      }
    });

    res.status(201).json({
      success: true,
      message: 'Alaabta si toos ah ayaa loo kaydiyay!',
      data: sanitizeProduct(newProduct),
    });
  } catch (error: any) {
    console.error("Create Product Error:", error);
    res.status(500).json({ error: 'Cilad baa ka dhacday abuurista alaabta.', details: error.message });
  }
};

// 2. SOO SAARISTA ALAABTA GANACSADU LEEYAHAY (GET MY PRODUCTS)
export const getMyProducts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rawUserId = req.user?.id;
    const userEmail = req.user?.email;
    const queryVendorId = req.query.vendorId as string;

    let targetVendorId = queryVendorId;

    if (!targetVendorId && (rawUserId || userEmail)) {
      const vendor = await prisma.vendor.findFirst({
        where: {
          OR: [
            ...(rawUserId ? [{ id: String(rawUserId) }] : []),
            ...(userEmail ? [{ email: userEmail }] : [])
          ]
        }
      });
      if (vendor) targetVendorId = vendor.id;
    }

    if (!targetVendorId) {
      res.status(400).json({ error: "Vendor ID is required" });
      return;
    }

    const products = await prisma.product.findMany({
      where: { 
        vendorId: targetVendorId,
        isDeleted: false // 🛡️ Vendor-ku MA ARAKO alaabta uu hore u tirtiray
      },
      orderBy: { createdAt: 'desc' },
      include: {
        category: { select: { name: true } },
        vendor: { select: { name: true } },
      }
    });

    const safeProducts = products.map(sanitizeProduct);

    res.status(200).json({ success: true, data: safeProducts });
  } catch (error: any) {
    console.error("Get My Products Error:", error);
    res.status(500).json({ error: "Cilad ayaa ka dhacday soo saarista alaabtaada." });
  }
};

// 3. SOO SAARISTA DHAMMAAN ALAABTA (GET ALL PRODUCTS FOR BUYERS)
export const getProducts = async (_req: Request, res: Response): Promise<void> => {
  try {
    const products = await prisma.product.findMany({
      where: {
        isDeleted: false, // 🛡️ IIBSADUHU MA ARAKO alaabta la tirtiray
        status: 'ACTIVE'   // 🛡️ Kaliya kuwa active ah
      },
      orderBy: { createdAt: 'desc' },
      include: {
        category: { select: { name: true } },
        vendor: { select: { name: true } },
      }
    });

    const safeProducts = products.map(sanitizeProduct);

    res.status(200).json({ success: true, data: safeProducts });
  } catch (error: any) {
    console.error("Get Products Error:", error);
    res.status(500).json({ error: "Cilad ayaa ka dhacday soo saarista alaabooyinka." });
  }
};

// 4. SOO SAARISTA ALAAB GAAR AH (GET PRODUCT BY ID)
export const getProductById = async (req: Request, res: Response): Promise<void> => {
  try {
    const productId = String(req.params.id);

    const product = await prisma.product.findFirst({
      where: { 
        id: productId,
        isDeleted: false // 🛡️ Laguma heli karo ID-ga alaab tirtiran
      },
      include: {
        category: { select: { name: true } },
        vendor: { select: { name: true } },
      }
    });

    if (!product) {
      res.status(404).json({ error: "Alaabta la doonayo ma jirto ama waa la tirtiray." });
      return;
    }

    res.status(200).json({ success: true, data: sanitizeProduct(product) });
  } catch (error: any) {
    console.error("Get Product By ID Error:", error);
    res.status(500).json({ error: "Cilad ayaa ka dhacday soo saarista alaabta." });
  }
};

// 5. CUSBOONAYSIINTA ALAABTA (UPDATE PRODUCT)
export const updateProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const productId = String(req.params.id);
    let payload = req.body || {};

    if (payload.data && typeof payload.data === 'string') {
      try {
        payload = JSON.parse(payload.data);
      } catch (e) {
        console.error("JSON parse error on update:", e);
      }
    }

    const existingProduct = await prisma.product.findFirst({ 
      where: { id: productId, isDeleted: false } 
    });

    if (!existingProduct) {
      res.status(404).json({ error: "Alaabta la doonayo in la cusbooneysiiyo ma jirto." });
      return;
    }

    const currentVendorId = await getTargetVendorId(undefined, req.user?.id, req.user?.email);
    if (req.user?.role !== 'ADMIN' && existingProduct.vendorId !== currentVendorId) {
      res.status(403).json({ error: "Umaramaidid inaad cusbooneysiiso alaab aannad lehayn." });
      return;
    }

    const { name, title, price, originalPrice, description, category, categoryId, stock } = payload;
    const updateData: Record<string, any> = {};

    if (name || title) updateData.name = (name || title).trim();
    if (description !== undefined) updateData.description = description;

    if (price !== undefined) {
      const parsedPrice = parseFloat(price);
      if (!isNaN(parsedPrice)) updateData.price = parsedPrice;
    }

    if (originalPrice !== undefined) {
      const parsedOriginal = parseFloat(originalPrice);
      updateData.originalPrice = !isNaN(parsedOriginal) ? parsedOriginal : null;
    }

    if (stock !== undefined) {
      const parsedStock = parseInt(stock, 10);
      if (!isNaN(parsedStock)) updateData.stock = parsedStock;
    }

    let finalImages: string[] = payload.existingImages
      ? (Array.isArray(payload.existingImages) ? payload.existingImages : [payload.existingImages])
      : [...existingProduct.images];

    let fileList: Express.Multer.File[] = [];
    if (req.files) {
      fileList = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
    } else if (req.file) {
      fileList = [req.file];
    }

    if (fileList.length > 0) {
      const newUrls = await Promise.all(fileList.map(file => uploadFileToSupabase(file)));
      const validNewUrls = newUrls.filter((url): url is string => url !== null);
      finalImages = [...finalImages, ...validNewUrls];
    }

    if (finalImages.length > 0) {
      updateData.images = finalImages;
      updateData.image = finalImages[0];
    } else if (payload.image) {
      updateData.image = payload.image;
    }

    const resolvedCategoryId = await resolveCategoryId(categoryId, category);
    if (resolvedCategoryId) {
      updateData.categoryId = resolvedCategoryId;
    }

    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: updateData,
      include: {
        category: { select: { name: true } },
        vendor: { select: { name: true } },
      }
    });

    res.status(200).json({ success: true, message: "Alaabta waa la cusbooneysiiyay!", data: sanitizeProduct(updatedProduct) });
  } catch (error: any) {
    console.error("Update Product Error:", error);
    res.status(500).json({ error: "Cilad ayaa ka dhacday cusbooneysiinta alaabta." });
  }
};

// 6. TIRTIRISTA AMAANKA AH (SOFT DELETE PRODUCT)
export const deleteProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const productId = String(req.params.id);

    const existingProduct = await prisma.product.findUnique({ where: { id: productId } });
    if (!existingProduct) {
      res.status(404).json({ error: "Alaabta la doonayo in la tirtiro ma jirto." });
      return;
    }

    const currentVendorId = await getTargetVendorId(undefined, req.user?.id, req.user?.email);
    if (req.user?.role !== 'ADMIN' && existingProduct.vendorId !== currentVendorId) {
      res.status(403).json({ error: "Umaramaidid inaad tirtirto alaab aannad lehayn." });
      return;
    }

    // 🛡️ SOFT DELETE IMPLEMENTATION:
    // Halkii toos Database-ka looga saari lahaa, waxaa loo dhigayaa `isDeleted: true` iyo `status: ARCHIVED`
    // Tani waxay dhowreysa xisaabtii iyo amarradii (Orders) hore ee macamiilku ku iibsadeen!
    await prisma.product.update({
      where: { id: productId },
      data: {
        isDeleted: true,
        status: 'ARCHIVED'
      }
    });

    res.status(200).json({ success: true, message: "Alaabta si toos ah ayaa loo tirtiray." });
  } catch (error: any) {
    console.error("Delete Product Error:", error);
    res.status(500).json({ error: "Cilad ayaa ka dhacday tirtirista alaabta." });
  }
};