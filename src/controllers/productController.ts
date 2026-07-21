import { Response } from 'express';
import { prisma } from '../server.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';

// 1. Abuur alaab cusub (Iibiyaha soo galay kaliya)
export const createProduct = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, title, description, price, stock, categoryName } = req.body;
    const vendorId = req.vendorId;

    const productName = name || title;

    if (!productName || !price || !categoryName || !vendorId) {
      res.status(400).json({ error: 'Fadlan buuxi name/title, price, iyo categoryName' });
      return;
    }

    // Hubi ama abuur Category-ga
    const category = await prisma.category.upsert({
      where: { name: categoryName },
      update: {},
      create: { name: categoryName }
    });

    const newProduct = await prisma.product.create({
      data: {
        name: productName,
        description: description || '',
        price: parseFloat(price),
        stock: parseInt(stock) || 0,
        vendorId,
        categoryId: category.id
      }
    });

    res.status(201).json({ success: true, data: newProduct });
  } catch (error) {
    res.status(500).json({ error: 'Cilad baa ku dhacday abuurista alaabta.' });
  }
};

// 2. Soo saar alaabta uu leeyahay hal iibiye oo kaliya (Multi-vendor filter)
export const getMyProducts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const products = await prisma.product.findMany({
      where: { vendorId: req.vendorId },
      include: { category: true }
    });
    res.status(200).json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ error: 'Ma awoodno inaan helno alaabtaada.' });
  }
};