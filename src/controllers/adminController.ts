import { Request, Response } from 'express';
import { prisma } from '../server.js';

/**
 * 1. SOO SAARISTA DHAMMAAN IIBIYEYAASHA (Get All Vendors)
 * Admin-ku wuxuu liis ahaan u soo saari karaa dhammaan iibiyeyaasha isagoo ku shaandhayn kara Status.
 */
export const getAllVendors = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.query; // 'PENDING', 'APPROVED', 'BLOCKED'

    // Filter-ka haddii la soo diray xaalad gooni ah
    const whereClause = status ? { status: (status as string).toUpperCase() } : {};

    const vendors = await prisma.vendor.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        shopName: true,
        status: true,
        createdAt: true,
        _count: {
          select: {
            products: true // Tirada alaabta uu iibiyahan soo galiyay
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.status(200).json({
      success: true,
      count: vendors.length,
      data: vendors
    });
  } catch (error: any) {
    console.error("Admin Get All Vendors Error:", error);
    res.status(500).json({ error: 'Cilad baa ku dhacday soo saarista liiska iibiyeyaasha.' });
  }
};

/**
 * 2. ANSIXINTA AMA XANNIBISTA IIBIYAHA (Update Vendor Status)
 * Admin-ku wuxuu ka dhigi karaa Vendor-ka: APPROVED, BLOCKED, ama dib ugu celin karaa PENDING.
 */
export const updateVendorStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { vendorId, status } = req.body;

    // 1. Hubi in xogta muhiimka ah la soo diray
    if (!vendorId || !status) {
      res.status(400).json({ error: 'Fadlan soo dhiib vendorId iyo status-ka cusub.' });
      return;
    }

    const allowedStatuses = ['PENDING', 'APPROVED', 'BLOCKED'];
    const updatedStatus = status.toUpperCase();

    if (!allowedStatuses.includes(updatedStatus)) {
      res.status(400).json({ error: 'Status-ka aad dirtay ma aha mid shaqaynaya. Dooro: PENDING, APPROVED, ama BLOCKED.' });
      return;
    }

    // 2. Hubi in iibiyuhu jiro
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId }
    });

    if (!vendor) {
      res.status(404).json({ error: 'Iibiyahan (Vendor-kan) laga ma helin database-ka.' });
      return;
    }

    // 3. Cusboonaysii Status-ka iibiyaha
    const updatedVendor = await prisma.vendor.update({
      where: { id: vendorId },
      data: { status: updatedStatus },
      select: {
        id: true,
        name: true,
        shopName: true,
        status: true,
        updatedAt: true
      }
    });

    res.status(200).json({
      success: true,
      message: `Iibiyaha waxaa loo beddelay xaaladda: ${updatedStatus}`,
      data: updatedVendor
    });
  } catch (error: any) {
    console.error("Admin Update Vendor Status Error:", error);
    res.status(500).json({ error: 'Cilad baa ku dhacday cusboonaysiinta xaaladda iibiyaha.' });
  }
};

/**
 * 3. XOGTA GANACSIGA GUUD (Get Admin Dashboard Statistics)
 * Admin-ku wuxuu halkan ka dhex arkayaa dakhliga guud, tirada macaamiisha, iibiyeyaasha sugan, iyo alaabta.
 */
export const getAdminStats = async (req: Request, res: Response): Promise<void> => {
  try {
    // A. Xisaabi dakhliga guud ee ka dhashay dalabaadka la bixiyay (PAID)
    const totalRevenue = await prisma.order.aggregate({
      where: {
        status: 'PAID'
      },
      _sum: {
        totalAmount: true
      }
    });

    // B. Tiri dhammaan macaamiisha (Macaamiisha caadiga ah iyo Admin-ka)
    const totalUsers = await prisma.user.count();

    // C. Tiri iibiyeyaasha (Sida ay u kala qaybsan yihiin)
    const totalVendors = await prisma.vendor.count();
    const approvedVendors = await prisma.vendor.count({ where: { status: 'APPROVED' } });
    const pendingVendors = await prisma.vendor.count({ where: { status: 'PENDING' } });

    // D. Tiri dhammaan alaabta ku dhex jirta Raysin (Products)
    const totalProducts = await prisma.product.count();

    // E. Tiri dalabaadka guud (Total Orders) iyo inta la bixiyay
    const totalOrders = await prisma.order.count();
    const paidOrders = await prisma.order.count({ where: { status: 'PAID' } });

    res.status(200).json({
      success: true,
      data: {
        revenue: {
          totalUSD: totalRevenue._sum.totalAmount || 0,
        },
        users: {
          total: totalUsers
        },
        vendors: {
          total: totalVendors,
          approved: approvedVendors,
          pending: pendingVendors
        },
        products: {
          total: totalProducts
        },
        orders: {
          total: totalOrders,
          paid: paidOrders
        }
      }
    });
  } catch (error: any) {
    console.error("Admin Get Stats Error:", error);
    res.status(500).json({ error: 'Cilad baa ku dhacday soo saarista xogta dashboard-ka.' });
  }
};