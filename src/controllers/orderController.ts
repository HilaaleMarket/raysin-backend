import { Request, Response } from 'express';
import { prisma } from '../server.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { OrderStatus } from '@prisma/client';

interface CartItem {
  productId: string;
  quantity: number;
}

// 1. ABUURISTA DALABKA
export const createOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const { vendorId, shippingAddress, items } = req.body;

    if (!userId) {
      res.status(401).json({ error: 'Fadlan marka hore iska diiwaangeli nidaamka.' });
      return;
    }

    if (!vendorId || !shippingAddress || !items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Fadlan soo dhiib vendorId, shippingAddress, iyo alaabta aad dalbanayso.' });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      let totalAmount = 0;
      const orderItemsData = [];

      for (const item of items as CartItem[]) {
        const product = await tx.product.findUnique({
          where: { id: item.productId }
        });

        if (!product) {
          throw new Error(`Alaabtan (ID: ${item.productId}) lagama helin nidaamka.`);
        }

        if (product.vendorId !== vendorId) {
          throw new Error(`Alaabta "${product.name}" kama tirsana dukaan-kan.`);
        }

        if (product.stock < item.quantity) {
          throw new Error(`Alaabta "${product.name}" stock-keedu kuuma filna. Waxaa haray oo kaliya ${product.stock}.`);
        }

        const itemTotal = product.price * item.quantity;
        totalAmount += itemTotal;

        // ✅ Koodhka saxda ah (Sii Type ama any[]):
const orderItemsData: { productId: string; quantity: number; price: number }[] = [] as { productId: string; quantity: number; price: number }[];

        await tx.product.update({
          where: { id: product.id },
          data: {
            stock: {
              decrement: item.quantity
            }
          }
        });
      }

      const newOrder = await tx.order.create({
        data: {
          userId,
          vendorId,
          shippingAddress,
          totalAmount,
          status: OrderStatus.pending,
          items: {
            create: orderItemsData
          }
        },
        include: {
          items: true
        }
      });

      return newOrder;
    });

    res.status(201).json({
      success: true,
      message: 'Dalabkaaga waa la geliyey, wuxuu sugayaa lacag-bixinta.',
      data: result
    });

  } catch (error: any) {
    console.error("Create Order Error:", error.message);
    res.status(400).json({ error: error.message || 'Cilad baa ku dhacday abuurista dalabka.' });
  }
};

// 2. SOO SAARISTA DALABAADKA MACMIILKA
export const getUserOrders = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;

    const orders = await prisma.order.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              select: { name: true, image: true }
            }
          }
        },
        vendor: {
          select: { shopName: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    console.error("Get User Orders Error:", error);
    res.status(500).json({ error: 'Cilad baa ku dhacday soo saarista dalabaadkaaga.' });
  }
};

// 3. SOO SAARISTA DALABAADKA IIBIYAHA
export const getVendorOrders = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId;

    const orders = await prisma.order.findMany({
      where: { vendorId },
      include: {
        items: {
          include: {
            product: {
              select: { name: true }
            }
          }
        },
        user: {
          select: { name: true, phone: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    console.error("Get Vendor Orders Error:", error);
    res.status(500).json({ error: 'Cilad baa ku dhacday soo saarista dalabaadka iibiyaha.' });
  }
};

// 4. ANSIDINTA DALABKA IYO KALA JARANSEYNTA DAKHLIGA
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

    if (order.status === OrderStatus.approved) {
      return res.status(400).json({ success: false, error: 'Dalabkan mar hore ayaa la ansixiyey' });
    }

    const commissionRate = order.vendor.commissionRate || 0.02;
    const totalOrderAmount = order.totalAmount;
    const hilaaleCommission = totalOrderAmount * commissionRate;

    await prisma.$transaction([
      prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.approved }
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