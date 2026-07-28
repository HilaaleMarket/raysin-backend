import { Request, Response } from 'express';
import { prisma } from '../server.js';
import { supabase } from '../config/supabaseClient.js';

// 1. ABUURISTA ALAABTA (CREATE PRODUCT)
export const createProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    let payload = req.body;

    if (req.body?.data && typeof req.body.data === 'string') {
      try {
        payload = JSON.parse(req.body.data);
      } catch (e) {
        console.error("JSON parse error on req.body.data", e);
      }
    }

    const { name, title, price, description, category, categoryId, vendorId, stock } = payload;
    const file = req.file;
    const productName = name || title;

    if (!productName || !price) {
      res.status(400).json({ error: 'Fadlan soo dhiib magaca alaabta (name) iyo qiimaha (price).' });
      return;
    }

    let imageUrl = payload.image || '';

    if (file) {
      const fileExt = file.originalname.split('.').pop();
      const fileName = `products/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          upsert: true,
        });

      if (uploadError) {
        console.error("Supabase Storage Error:", uploadError);
        res.status(500).json({ error: "Cilad baa ka dhacday kaydinta sawirka Supabase." });
        return;
      }

      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      imageUrl = urlData.publicUrl;
    }

    const activeVendorId = vendorId || (req as any).user?.id || 'v1';

    // 👈 XALKA: Qaaqaad 'any' si TypeScript-ku uusan ugu dhagin type undefined
    let categoryQuery: any = undefined;
    if (categoryId) {
      categoryQuery = { connect: { id: categoryId } };
    } else if (category) {
      categoryQuery = {
        connectOrCreate: {
          where: { name: String(category).trim().toLowerCase() },
          create: { name: String(category).trim().toLowerCase() },
        },
      };
    }

    const newProduct = await prisma.product.create({
      data: {
        name: productName,
        description: description || '',
        price: parseFloat(price),
        stock: stock ? parseInt(stock) : 0,
        image: imageUrl,
        vendor: { connect: { id: String(activeVendorId) } },
        ...(categoryQuery ? { category: categoryQuery } : {}),
      },
    });

    res.status(201).json({
      success: true,
      message: 'Alaabta iyo sawirka si toos ah ayaa loo kaydiyay!',
      data: newProduct,
    });
  } catch (error: any) {
    console.error("Create Product Error:", error);
    res.status(500).json({ error: 'Cilad baa ka dhacday abuurista alaabta.', details: error.message });
  }
};

// 2. SOO SAARISTA ALAABTA GANACSADU LEEYAHAY (GET MY PRODUCTS)
export const getMyProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = (req as any).user?.id || (req.query.vendorId as string);

    if (!vendorId) {
      res.status(400).json({ error: "Vendor ID is required" });
      return;
    }

    const products = await prisma.product.findMany({
      where: { vendorId: String(vendorId) },
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
export const getProducts = async (req: Request, res: Response): Promise<void> => {
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
    const productId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

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
    const productId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    let payload = req.body;

    if (req.body?.data && typeof req.body.data === 'string') {
      try {
        payload = JSON.parse(req.body.data);
      } catch (e) {
        console.error("JSON parse error on update", e);
      }
    }

    const { name, title, price, description, category, categoryId, stock } = payload;
    const file = req.file;

    let imageUrl = payload.image;

    if (file) {
      const fileExt = file.originalname.split('.').pop();
      const fileName = `products/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

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

    const updateData: any = {};
    if (name || title) updateData.name = name || title;
    if (description !== undefined) updateData.description = description;
    if (price) updateData.price = parseFloat(price);
    if (stock !== undefined) updateData.stock = parseInt(stock);
    if (imageUrl) updateData.image = imageUrl;

    if (categoryId) {
      updateData.category = { connect: { id: categoryId } };
    } else if (category) {
      updateData.category = {
        connectOrCreate: {
          where: { name: String(category).trim().toLowerCase() },
          create: { name: String(category).trim().toLowerCase() },
        },
      };
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
    res.status(500).json({ error: "Cilad ayaa ka dhacday cusbooneysiinta alaabta." });
  }
};

// 6. TIRTIRISTA ALAABTA (DELETE PRODUCT)
export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const productId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    await prisma.product.delete({
      where: { id: productId },
    });

    res.status(200).json({
      success: true,
      message: "Alaabta si toos ah ayaa loo tirtiray.",
    });
  } catch (error: any) {
    console.error("Delete Product Error:", error);
    res.status(500).json({ error: "Cilad ayaa ka dhacday tirtirista alaabta." });
  }
};