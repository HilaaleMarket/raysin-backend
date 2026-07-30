import { Request, Response } from 'express';
import { prisma } from '../server.js';
import { supabase } from '../config/supabaseClient.js';

// 1. ABUURISTA ALAABTA (CREATE PRODUCT)
export const createProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    let payload = req.body || {};

    // A. Haddii xogta JSON lagu soo dhex duubay payload.data
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

    // B. VENDOR RESOLUTION LOGIC
    const rawUserId = (req as any).user?.id;
    let targetVendorId: string | null = null;

    if (vendorId && vendorId !== "v1") {
      const vendorExists = await prisma.vendor.findUnique({ where: { id: String(vendorId) } });
      if (vendorExists) targetVendorId = vendorExists.id;
    }

    if (!targetVendorId && rawUserId) {
      const directVendor = await prisma.vendor.findUnique({ where: { id: String(rawUserId) } });
      if (directVendor) {
        targetVendorId = directVendor.id;
      } else {
        const userObj = await prisma.user.findUnique({
          where: { id: String(rawUserId) },
          select: { email: true }
        });

        if (userObj?.email) {
          const vendorByEmail = await prisma.vendor.findFirst({
            where: { email: userObj.email }
          });
          if (vendorByEmail) targetVendorId = vendorByEmail.id;
        }
      }
    }

    if (!targetVendorId) {
      const fallbackVendor = await prisma.vendor.findFirst();
      if (fallbackVendor) {
        targetVendorId = fallbackVendor.id;
      }
    }

    if (!targetVendorId) {
      const defaultVendor = await prisma.vendor.create({
        data: {
          name: "Main Store",
          shopName: "Hilaale Main Store",
          phone: "000000000",
          password: "default_secure_password_123"
        }
      });
      targetVendorId = defaultVendor.id;
    }

    // C. SUPABASE IMAGE UPLOAD (WITH FALLBACK)
    let imageUrl = payload.image || '';

    if (file) {
      try {
        const fileExt = file.originalname.split('.').pop();
        const fileName = `products/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('product-images') // ⚠️ Hubi in magaca Bucket-ku uu rasmiga u yahay 'product-images' Supabase-kaaga
          .upload(fileName, file.buffer, {
            contentType: file.mimetype,
            upsert: true,
          });

        if (uploadError) {
          console.error("Supabase Storage Upload Error:", uploadError.message);
          // Sawirka ha ka dhigin inuu baabi'iyo buuxinta foomka alaabta oo dhan
        } else {
          const { data: urlData } = supabase.storage
            .from('product-images')
            .getPublicUrl(fileName);

          if (urlData?.publicUrl) {
            imageUrl = urlData.publicUrl;
          }
        }
      } catch (imgErr) {
        console.error("Image Upload Failure:", imgErr);
      }
    }

    // D. CATEGORY RESOLUTION
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

    // E. CREATE PRODUCT IN DATABASE
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