import { Request, Response } from 'express';
import { prisma } from '../server.js';
import { supabase } from '../config/supabaseClient.js';

interface AuthRequest extends Request {
  user?: {
    id: string;
    email?: string;
    role?: string;
  };
}

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

    const { name, title, price, description, category, categoryId, vendorId, stock } = payload;
    const file = req.file;
    const productName = (name || title || '').trim();

    const parsedPrice = parseFloat(price);
    if (!productName || isNaN(parsedPrice)) {
      res.status(400).json({ error: 'Fadlan soo dhiib magaca alaabta (name) iyo qiimaha saxda ah (price).' });
      return;
    }

    const rawUserId = req.user?.id;
    const userEmail = req.user?.email;
    let targetVendorId: string | null = null;

    if (vendorId && vendorId !== "v1") {
      const vendorExists = await prisma.vendor.findUnique({ where: { id: String(vendorId) } });
      if (vendorExists) targetVendorId = vendorExists.id;
    }

    if (!targetVendorId && rawUserId) {
      const directVendor = await prisma.vendor.findUnique({ where: { id: String(rawUserId) } });
      if (directVendor) {
        targetVendorId = directVendor.id;
      } else if (userEmail) {
        const vendorByEmail = await prisma.vendor.findFirst({
          where: { email: userEmail }
        });
        if (vendorByEmail) targetVendorId = vendorByEmail.id;
      }
    }

    if (!targetVendorId) {
      res.status(401).json({
        error: 'Adoo mahadsan, ma haysatid akoon Vendor ah oo sax ah ama log-in kuma adid.'
      });
      return;
    }

    // Upload-ka sawirka (Supabase Storage)
    let imageUrl = payload.image || '';

    if (file) {
      try {
        const fileExt = file.originalname.split('.').pop() || 'png';
        // Magac gaar ah oo toos ah, iyada oo aan la gelin sub-folder aan loo baahnayn
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        console.log(`📸 Uploading file to Supabase: ${fileName} (${file.mimetype})`);

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(fileName, file.buffer, {
            contentType: file.mimetype,
            cacheControl: '3600',
            upsert: true,
          });

        if (uploadError) {
          console.error("❌ Supabase Storage Upload Error:", uploadError.message);
        } else {
          const { data: urlData } = supabase.storage
            .from('product-images')
            .getPublicUrl(fileName);

          if (urlData?.publicUrl) {
            imageUrl = urlData.publicUrl;
            console.log("✅ Sawirka si sax ah ayaa loo upload-gareeyay:", imageUrl);
          }
        }
      } catch (imgErr) {
        console.error("❌ Image Upload Failure:", imgErr);
      }
    }

    let resolvedCategoryId: string | null = null;

    if (categoryId) {
      const catExists = await prisma.category.findUnique({ where: { id: String(categoryId) } });
      if (catExists) resolvedCategoryId = catExists.id;
    }

    if (!resolvedCategoryId && category) {
      const catName = String(category).trim();
      const existingCat = await prisma.category.findFirst({
        where: { name: { equals: catName, mode: 'insensitive' } }
      });

      if (existingCat) {
        resolvedCategoryId = existingCat.id;
      } else {
        const newCat = await prisma.category.create({
          data: { name: catName }
        });
        resolvedCategoryId = newCat.id;
      }
    }

    const parsedStock = parseInt(stock, 10);

    const newProduct = await prisma.product.create({
      data: {
        name: productName,
        description: description || '',
        price: parsedPrice,
        stock: isNaN(parsedStock) ? 0 : parsedStock,
        image: imageUrl,
        vendorId: targetVendorId,
        ...(resolvedCategoryId ? { categoryId: resolvedCategoryId } : {}),
      },
    });

    res.status(201).json({
      success: true,
      message: 'Alaabta si toos ah ayaa loo kaydiyay!',
      data: newProduct,
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

    if (!targetVendorId && rawUserId) {
      const vendor = await prisma.vendor.findFirst({
        where: {
          OR: [
            { id: String(rawUserId) },
            { email: userEmail || '' }
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
      where: { vendorId: targetVendorId },
      orderBy: { createdAt: 'desc' },
      include: { category: true }
    });

    res.status(200).json({
      success: true,
      data: products,
    });
  } catch (error: any) {
    console.error("Get My Products Error:", error);
    res.status(500).json({ error: "Cilad ayaa ka dhacday soo saarista alaabtaada." });
  }
};

// 3. SOO SAARISTA DHAMMAAN ALAABTA (GET ALL PRODUCTS)
export const getProducts = async (_req: Request, res: Response): Promise<void> => {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
      include: { category: true }
    });

    res.status(200).json({
      success: true,
      data: products,
    });
  } catch (error: any) {
    console.error("Get Products Error:", error);
    res.status(500).json({ error: "Cilad ayaa ka dhacday soo saarista alaabooyinka." });
  }
};

// 4. SOO SAARISTA ALAAB GAAR AH (GET PRODUCT BY ID)
export const getProductById = async (req: Request, res: Response): Promise<void> => {
  try {
    const productId = String(req.params.id);

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { category: true }
    });

    if (!product) {
      res.status(404).json({ error: "Alaabta la doonayo ma jirto." });
      return;
    }

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error: any) {
    console.error("Get Product By ID Error:", error);
    res.status(500).json({ error: "Cilad ayaa ka dhacday soo saarista alaabta." });
  }
};

// 5. CUSBOONAYSIINTA ALAABTA (UPDATE PRODUCT)
export const updateProduct = async (req: Request, res: Response): Promise<void> => {
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

    const { name, title, price, description, category, categoryId, stock } = payload;
    const file = req.file;

    let imageUrl = payload.image;

    if (file) {
      const fileExt = file.originalname.split('.').pop() || 'png';
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          upsert: true,
        });

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(fileName);
        imageUrl = urlData.publicUrl;
      }
    }

    const updateData: Record<string, any> = {};
    if (name || title) updateData.name = name || title;
    if (description !== undefined) updateData.description = description;

    if (price !== undefined) {
      const parsedPrice = parseFloat(price);
      if (!isNaN(parsedPrice)) updateData.price = parsedPrice;
    }

    if (stock !== undefined) {
      const parsedStock = parseInt(stock, 10);
      if (!isNaN(parsedStock)) updateData.stock = parsedStock;
    }

    if (imageUrl) updateData.image = imageUrl;

    if (categoryId) {
      const catExists = await prisma.category.findUnique({ where: { id: String(categoryId) } });
      if (catExists) updateData.categoryId = catExists.id;
    } else if (category) {
      const catName = String(category).trim();
      const existingCat = await prisma.category.findFirst({
        where: { name: { equals: catName, mode: 'insensitive' } }
      });

      if (existingCat) {
        updateData.categoryId = existingCat.id;
      } else {
        const newCat = await prisma.category.create({ data: { name: catName } });
        updateData.categoryId = newCat.id;
      }
    }

    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: updateData,
    });

    res.status(200).json({
      success: true,
      message: "Alaabta waa la cusbooneysiiyay!",
      data: updatedProduct,
    });
  } catch (error: any) {
    console.error("Update Product Error:", error);
    if (error.code === 'P2025') {
      res.status(404).json({ error: "Alaabta la doonayo in la cusbooneysiiyo ma jirto." });
      return;
    }
    res.status(500).json({ error: "Cilad ayaa ka dhacday cusbooneysiinta alaabta." });
  }
};

// 6. TIRTIRISTA ALAABTA (DELETE PRODUCT)
export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const productId = String(req.params.id);

    await prisma.product.delete({
      where: { id: productId },
    });

    res.status(200).json({
      success: true,
      message: "Alaabta si toos ah ayaa loo tirtiray.",
    });
  } catch (error: any) {
    console.error("Delete Product Error:", error);
    if (error.code === 'P2025') {
      res.status(404).json({ error: "Alaabta la doonayo in la tirtiro ma jirto." });
      return;
    }
    res.status(500).json({ error: "Cilad ayaa ka dhacday tirtirista alaabta." });
  }
};