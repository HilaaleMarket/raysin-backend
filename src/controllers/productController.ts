import { Request, Response } from 'express';
import { prisma } from '../server.js';
import { supabase } from '../config/supabaseClient.js';

export const createProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    let payload = req.body;

    // Haddii xogta lagu soo dhiibay FormData 'data' key-ga
    if (req.body.data && typeof req.body.data === 'string') {
      try {
        payload = JSON.parse(req.body.data);
      } catch (e) {
        console.error("JSON parse error on req.body.data", e);
      }
    }

    const { name, title, price, description, vendorId, category, stock, sku, tags } = payload;
    const file = req.file; // Sawirka laga soo upload-gareeyay Gallery/Camera-ga

    // Adeegso 'name' ama 'title' (Standardization)
    const productName = name || title;

    if (!productName || !price) {
      res.status(400).json({ error: 'Fadlan soo dhiib magaca alaabta (name) iyo qiimaha (price).' });
      return;
    }

    let imageUrl = payload.image || '';

    // 1. Haddii sawir file ah uu soo gaadhay, u dhiib Supabase Bucket
    if (file) {
      const fileExt = file.originalname.split('.').pop();
      const fileName = `products/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
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

      // 2. Soo saar Public URL-ka sawirka
      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      imageUrl = urlData.publicUrl;
    }

    // 3. Alaabta ku kaydi Prisma Database-ka
    const newProduct = await prisma.product.create({
      data: {
        name: productName,
        description: description || '',
        price: parseFloat(price),
        category: category || 'general',
        stock: stock ? parseInt(stock) : 0,
        sku: sku || `SKU-${Date.now()}`,
        image: imageUrl,
        tags: Array.isArray(tags) ? tags : (tags ? tags.split(',').map((t: string) => t.trim()) : []),
        vendorId: vendorId || (req as any).user?.id || 'v1',
      },
    });

    res.status(201).json({
      success: true,
      message: 'Alaabta iyo sawirka si toos ah ayaa loo kaydiyay!',
      data: newProduct,
    });
  } catch (error: any) {
    console.error("Create Product Error:", error);
    res.status(500).json({ error: 'Cilad baa ka dhacday abuurista alaabta.' });
  }
};