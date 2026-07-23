import { Request, Response } from 'express';
import { prisma } from '../server.js';

/**
 * 1. SOO SAARISTA DHAMMAAN IIBIYEYAASHA (Get All Vendors)
 */
export const getAllVendors = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.query;

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
    res.status(500).json({ success: false, error: 'Cilad baa ku dhacday soo saarista liiska iibiyeyaasha.' });
  }
};

/**
 * 2. ANSIXINTA AMA XANNIBISTA IIBIYAHA (Update Vendor Status)
 */
export const updateVendorStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { vendorId, status } = req.body;

    if (!vendorId || !status) {
      res.status(400).json({ success: false, error: 'Fadlan soo dhiib vendorId iyo status-ka cusub.' });
      return;
    }

    const allowedStatuses = ['PENDING', 'APPROVED', 'BLOCKED'];
    const updatedStatus = (status as string).toUpperCase();

    if (!allowedStatuses.includes(updatedStatus)) {
      res.status(400).json({ success: false, error: 'Status-ka aad dirtay ma aha mid shaqaynaya. Dooro: PENDING, APPROVED, ama BLOCKED.' });
      return;
    }

    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId }
    });

    if (!vendor) {
      res.status(404).json({ success: false, error: 'Iibiyahan (Vendor-kan) laga ma helin database-ka.' });
      return;
    }

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
    res.status(500).json({ success: false, error: 'Cilad baa ku dhacday cusboonaysiinta xaaladda iibiyaha.' });
  }
};

/**
 * 3. XOGTA GANACSIGA GUUD (Get Admin Dashboard Statistics)
 */
export const getAdminStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const totalRevenue = await prisma.order.aggregate({
      where: {
        status: 'paid'
      },
      _sum: {
        totalAmount: true
      }
    });

    const totalUsers = await prisma.user.count();
    const totalVendors = await prisma.vendor.count();
    const approvedVendors = await prisma.vendor.count({ where: { status: 'APPROVED' } });
    const pendingVendors = await prisma.vendor.count({ where: { status: 'PENDING' } });
    const totalProducts = await prisma.product.count();
    const totalOrders = await prisma.order.count();
    const paidOrders = await prisma.order.count({ where: { status: 'paid' } });

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
    res.status(500).json({ success: false, error: 'Cilad baa ku dhacday soo saarista xogta dashboard-ka.' });
  }
};