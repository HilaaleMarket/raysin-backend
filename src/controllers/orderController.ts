import { Request, Response } from 'express';
import { prisma } from '../server.js';
import { OrderStatus } from '@prisma/client';

// 1. SAMAYNTA DALAB
export const createOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, vendorId, items, totalAmount, customerName, customerEmail, customerPhone, shippingAddress, city, notes } = req.body;

    const newOrder = await prisma.order.create({
      data: {
        userId,
        vendorId,
        customerName: customerName || 'Customer',
        customerEmail: customerEmail || 'customer@example.com',
        customerPhone: customerPhone || '000000000',
        shippingAddress: shippingAddress || 'N/A',
        city: city || 'Hargeisa',
        notes,
        totalAmount,
        status: OrderStatus.PENDING, // Enums Uppercase
        orderItems: { // Relation-ka saxda ah ee schema.prisma
          create: items.map((item: any) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price
          }))
        }
      },
      include: {
        orderItems: true
      }
    });

    res.status(201).json({ success: true, data: newOrder });
  } catch (error: any) {
    console.error("Create Order Error:", error);
    res.status(500).json({ success: false, error: error.message || 'Cilad baa ka dhacday samaynta dalabka' });
  }
};

// 2. HELIDA DALAB ID
export const getOrderById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    if (!id) {
      res.status(400).json({ success: false, error: 'ID-ga dalabka waa lagu doonayaa' });
      return;
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        vendor: true,
        user: true,
        orderItems: true
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

// 3. HELIDA DALABYADA USER-KA
export const getUserOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params.userId as string;

    const orders = await prisma.order.findMany({
      where: { userId },
      include: {
        vendor: true,
        orderItems: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ success: true, data: orders });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Cilad baa ka dhacday helida dalabyada user-ka' });
  }
};

// 4. HELIDA DALABYADA VENDOR-KA
export const getVendorOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.params.vendorId as string;

    const orders = await prisma.order.findMany({
      where: { vendorId },
      include: {
        user: true,
        orderItems: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ success: true, data: orders });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Cilad baa ka dhacday helida dalabyada vendor-ka' });
  }
};

// 5. ANSIXINTA DALABKA IYO KALA JARANSEYNTA DAKHLIGA
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

    if (order.status === OrderStatus.APPROVED) {
      return res.status(400).json({ success: false, error: 'Dalabkan mar hore ayaa la ansixiyey' });
    }

    const commissionRate = order.vendor.commissionRate ?? 0.02;
    const totalOrderAmount = order.totalAmount;
    const hilaaleCommission = totalOrderAmount * commissionRate;

    await prisma.$transaction([
      prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.APPROVED }
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

  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ success: false, error: error.message || 'Cilad baa ka dhacday kala jaranseynta dakhliga.' });
  }
};
// check