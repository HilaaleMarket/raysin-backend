import { Request, Response } from 'express';
import { prisma } from '../server.js';

// 1. SOO SAARISTA DHAMMAAN GANACSATADA (GET ALL VENDORS)
export const getVendors = async (req: Request, res: Response): Promise<void> => {
  try {
    const vendors = await prisma.vendor.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { products: true, orders: true }
        }
      }
    });

    res.status(200).json({
      success: true,
      data: vendors,
    });
    return;
  } catch (error: any) {
    console.error("Get Vendors Error:", error);
    res.status(500).json({ error: "Cilad ayaa ka dhacday soo saarista ganacsatada." });
    return;
  }
};

// 2. SOO SAARISTA GANACSADE GAAR AH (GET VENDOR BY ID)
export const getVendorById = async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      include: {
        products: true,
        orders: true,
      }
    });

    if (!vendor) {
      res.status(404).json({ error: "Ganacsadaha la doonayo ma jirto." });
      return;
    }

    res.status(200).json({
      success: true,
      data: vendor,
    });
    return;
  } catch (error: any) {
    console.error("Get Vendor By ID Error:", error);
    res.status(500).json({ error: "Cilad ayaa ka dhacday soo saarista ganacsadaha." });
    return;
  }
};

// 3. DIIWAANGELINTA GANACSADE CUSUB (CREATE VENDOR)
export const createVendor = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, phone, shopName, password, commissionRate } = req.body;

    if (!name || !phone) {
      res.status(400).json({ error: "Fadlan soo dhiib magaca (name) iyo taleefanka (phone)." });
      return;
    }

    const newVendor = await prisma.vendor.create({
      data: {
        name,
        email: email || null,
        phone,
        shopName: shopName || `${name}'s Store`,
        password: password || 'default_pass_123',
        commissionRate: commissionRate ? parseFloat(commissionRate) : 0.02,
      }
    });

    res.status(201).json({
      success: true,
      message: "Ganacsadaha si guul leh ayaa loo diiwaangeliyay!",
      data: newVendor,
    });
    return;
  } catch (error: any) {
    console.error("Create Vendor Error:", error);
    res.status(500).json({ error: "Cilad ayaa ka dhacday diiwaangelinta ganacsadaha.", details: error.message });
    return;
  }
};

// 4. CUSBOONAYSIINTA GANACSADA (UPDATE VENDOR)
export const updateVendor = async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { name, shopName, phone, email, commissionRate } = req.body;

    const updatedVendor = await prisma.vendor.update({
      where: { id: vendorId },
      data: {
        ...(name && { name }),
        ...(shopName && { shopName }),
        ...(phone && { phone }),
        ...(email && { email }),
        ...(commissionRate !== undefined && { commissionRate: parseFloat(commissionRate) }),
      }
    });

    res.status(200).json({
      success: true,
      message: "Xogta ganacsadaha waa la cusbooneysiiyay!",
      data: updatedVendor,
    });
    return;
  } catch (error: any) {
    console.error("Update Vendor Error:", error);
    res.status(500).json({ error: "Cilad ayaa ka dhacday cusbooneysiinta xogta ganacsadaha." });
    return;
  }
};