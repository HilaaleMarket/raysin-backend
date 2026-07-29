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
    res.status(500).json({
      success: false,
      error: "Cilad ayaa ka dhacday soo saarista ganacsatada."
    });
    return;
  }
};

// 2. SOO SAARISTA GANACSADE GAAR AH (GET VENDOR BY ID)
export const getVendorById = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawId = req.params.id;
    const vendorId = Array.isArray(rawId) ? rawId[0] : rawId;

    if (!vendorId) {
      res.status(400).json({ success: false, error: "ID-ga ganacsadaha waa la waayay." });
      return;
    }

    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      include: {
        products: true,
        orders: true,
      }
    });

    if (!vendor) {
      res.status(404).json({ success: false, error: "Ganacsadaha la doonayo ma jiro." });
      return;
    }

    res.status(200).json({
      success: true,
      data: vendor,
    });
    return;
  } catch (error: any) {
    console.error("Get Vendor By ID Error:", error);
    res.status(500).json({
      success: false,
      error: "Cilad ayaa ka dhacday soo saarista ganacsadaha."
    });
    return;
  }
};

// 3. DIIWAANGELINTA GANACSADE CUSUB (CREATE VENDOR)
export const createVendor = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, phone, shopName, password, commissionRate } = req.body;

    if (!name || !phone) {
      res.status(400).json({
        success: false,
        error: "Fadlan soo dhiib magaca (name) iyo taleefanka (phone)."
      });
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
        status: 'pending', // Default status marka la abuurayo
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
    res.status(500).json({
      success: false,
      error: "Cilad ayaa ka dhacday diiwaangelinta ganacsadaha.",
      details: error.message
    });
    return;
  }
};

// 4. CUSBOONAYSIINTA XOGTA GANACSADA (UPDATE VENDOR DETAILS)
export const updateVendor = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawId = req.params.id;
    const vendorId = Array.isArray(rawId) ? rawId[0] : rawId;

    if (!vendorId) {
      res.status(400).json({ success: false, error: "ID-ga ganacsadaha waa la waayay." });
      return;
    }

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
    res.status(500).json({
      success: false,
      error: "Cilad ayaa ka dhacday cusbooneysiinta xogta ganacsadaha."
    });
    return;
  }
};

// 5. BEDDELIDA STATUS-KA GANACSADA (APPROVE / BLOCK / REJECT)
export const updateVendorStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    // Ka raadso ID-ga URL Params ama Body Payload
    const rawId = req.params.id || req.body.vendorId;
    const vendorId = Array.isArray(rawId) ? rawId[0] : rawId;
    const { status } = req.body;

    if (!vendorId) {
      res.status(400).json({ success: false, error: "ID-ga ganacsadaha waa la waayay." });
      return;
    }

    if (!status) {
      res.status(400).json({ success: false, error: "Status-ka cusub waa la waayay." });
      return;
    }

    const normalizedStatus = status.toLowerCase();
    const validStatuses = ['approved', 'pending', 'blocked', 'rejected'];

    if (!validStatuses.includes(normalizedStatus)) {
      res.status(400).json({
        success: false,
        error: `Status aan sax ahayn. Kuwa la oggol yahay: ${validStatuses.join(', ')}`,
      });
      return;
    }

    const updatedVendor = await prisma.vendor.update({
      where: { id: vendorId },
      data: { status: normalizedStatus },
    });

    res.status(200).json({
      success: true,
      message: `Status-ka ganacsadaha si guul leh ayaa loogu beddelay ${normalizedStatus}`,
      data: updatedVendor,
    });
    return;
  } catch (error: any) {
    console.error("Update Vendor Status Error:", error);
    res.status(500).json({
      success: false,
      error: "Cilad ayaa ka dhacday beddelida status-ka ganacsadaha.",
      details: error.message,
    });
    return;
  }
};