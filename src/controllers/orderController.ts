import { Request, Response } from 'express';
import { prisma } from '../server.js';
import { OrderStatus } from '@prisma/client';

// 1. SAMAYNTA DALAB
export const createOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, vendorId, items, totalAmount } = req.body;

    const newOrder = await prisma.order.create({
      data: {
        userId,
        vendorId,
        totalAmount,
        status: OrderStatus.PENDING, // 👈 Sax: PENDING (uppercase)
        items: {
          create: items
        }
      }
    });

    res.status(201).json({ success: true, data: newOrder });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Cilad baa ka dhacday samaynta dalabka' });
  }
};

// 2. HELIDA DALAB ID AAN PENDING AHAYN
export const getOrderById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    if (!id) {
      res.status(400).json({ success: false, error: 'ID-ga dalabka waa halkan lagu darayaa' });
      return;
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        vendor: true,
        user: true,
        items: true
      }
    });

    if (!order) {
      res.status(404).json({ success: false, error: 'Dalabka lama helin' });
      return;
    }

    res.status(200).json({ success: true, data: order });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Cilad baa ka dhacday raadinta dalabka' });
  }
};

// 3. HELIDA DALABYADA USER-KA (getUserOrders)
export const getUserOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params.userId as string;

    const orders = await prisma.order.findMany({
      where: { userId },
      include: {
        vendor: true,
        items: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ success: true, data: orders });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Cilad baa ka dhacday helida dalabyada user-ka' });
  }
};

// 4. HELIDA DALABYADA VENDOR-KA (getVendorOrders)
export const getVendorOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.params.vendorId as string;

    const orders = await prisma.order.findMany({
      where: { vendorId },
      include: {
        user: true,
        items: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ success: true, data: orders });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Cilad baa ka dhacday helida dalabyada vendor-ka' });
  }
};

// 5. ANSIDINTA DALABKA IYO KALA JARANSEYNTA DAKHLIGA
export const approveDirectVendorPayment = async (req: Request, res: Response) => {
  const orderId = req.params.orderId as string;

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { vendor: true }
    });

    if (!order) {
      return res.status(404).json({ success: false, error: 'Dalabka lama helin' });
    }

    if (!order.vendor || !order.vendorId) {
      return res.status(400).json({ success: false, error: 'Vendor-ka dalabkan kama tirsana nidaamka' });
    }

    if (order.status === OrderStatus.APPROVED) { // 👈 Sax: APPROVED (uppercase)
      return res.status(400).json({ success: false, error: 'Dalabkan mar hore ayaa la ansixiyey' });
    }

    const commissionRate = order.vendor.commissionRate ?? 0.02;
    const totalOrderAmount = order.totalAmount;
    const hilaaleCommission = totalOrderAmount * commissionRate;

    await prisma.$transaction([
      prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.APPROVED } // 👈 Sax: APPROVED (uppercase)
      }),
      
      prisma.companyWallet.upsert({
        where: { id: 'HILAALE_GLOBAL_WALLET' },
        update: {
          totalEarnings: { increment: hilaaleCommission }
        },
        create: {
          id: 'HILAALE_GLOBAL_WALLET',
          totalEarnings: hilaaleCommission
        }
      }),

      prisma.vendor.update({
        where: { id: order.vendorId },
        data: {
          totalSales: { increment: totalOrderAmount }
        }
      })
    ]);

    return res.status(200).json({
      success: true,
      message: 'Lacagta guud waxay toos u gaartay Vendor-ka, Komishankana waxaa lagu shubay Hilaale Wallet.',
      data: {
        vendorReceivedDirectly: totalOrderAmount,
        hilaaleWalletEarned: hilaaleCommission
      }
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: 'Cilad baa ka dhacday kala jaranseynta dakhliga.' });
  }
};