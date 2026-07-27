import { Request, Response } from 'express';
import { prisma } from '../server.js';

/**
 * 1. SOO SAARISTA DHAMMAAN IIBIYEYAASHA (Get All Vendors)
 */
export const getAllVendors = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.query; // 'PENDING', 'APPROVED', 'BLOCKED'

    const whereClause = status ? { status: (status as string).toUpperCase() as any } : {};

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
            products: true
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
 */
export const updateVendorStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    // 🎯 Hubi labada hab ee vendorId iyo status ku soo geli karaan (URL Param ama Body)
    const vendorId = req.params.id || req.body.vendorId || req.body.id;
    const rawStatus = req.body.status;

    if (!vendorId || !rawStatus) {
      res.status(400).json({ error: 'Fadlan soo dhiib vendorId iyo status-ka cusub.' });
      return;
    }

    const updatedStatus = rawStatus.toUpperCase();
    const allowedStatuses = ['PENDING', 'APPROVED', 'BLOCKED'];

    if (!allowedStatuses.includes(updatedStatus)) {
      res.status(400).json({ error: 'Status-ka aad dirtay ma aha mid shaqaynaya. Dooro: PENDING, APPROVED, ama BLOCKED.' });
      return;
    }

    // 1. Hubi in iibiyuhu jiro
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId }
    });

    if (!vendor) {
      res.status(404).json({ error: 'Iibiyahan (Vendor-kan) laga ma helin database-ka.' });
      return;
    }

    // 2. Cusboonaysii Status-ka iibiyaha
    const updatedVendor = await prisma.vendor.update({
      where: { id: vendorId },
      data: { status: updatedStatus as any },
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
 */
export const getAdminStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const totalRevenue = await prisma.order.aggregate({
      where: {
        status: 'PAID' as any
      },
      _sum: {
        totalAmount: true
      }
    });

    const totalUsers = await prisma.user.count();

    const totalVendors = await prisma.vendor.count();
    const approvedVendors = await prisma.vendor.count({ where: { status: 'APPROVED' as any } });
    const pendingVendors = await prisma.vendor.count({ where: { status: 'PENDING' as any } });

    const totalProducts = await prisma.product.count();

    const totalOrders = await prisma.order.count();
    const paidOrders = await prisma.order.count({ where: { status: 'PAID' as any } });

    res.status(200).json({
      success: true,
      data: {
        revenue: {
          totalUSD: totalRevenue._sum?.totalAmount || 0,
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