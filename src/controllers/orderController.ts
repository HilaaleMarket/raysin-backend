import { Response } from 'express';
import { prisma } from '../server.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';

interface CartItem {
  productId: string;
  quantity: number;
}

export const createOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId; // Halkan waxaan ka dhignay req.userId siday u diyaarisay authenticateToken
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
          throw new Error(`Alaabta "${product.title}" kama tirsana dukaan-kan.`);
        }

        if (product.stock < item.quantity) {
          throw new Error(`Alaabta "${product.title}" stock-keedu kuuma filna. Waxaa haray oo kaliya ${product.stock}.`);
        }

        const itemTotal = product.price * item.quantity;
        totalAmount += itemTotal;

        orderItemsData.push({
          productId: product.id,
          quantity: item.quantity,
          price: product.price
        });

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
          status: 'PENDING',
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

export const getUserOrders = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId; // Halkan ku beddel req.userId

    const orders = await prisma.order.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              select: { title: true, image: true }
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

export const getVendorOrders = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId; // Halkan ku beddel req.vendorId si uu ula jaanqaado middleware-ka

    const orders = await prisma.order.findMany({
      where: { vendorId },
      include: {
        items: {
          include: {
            product: {
              select: { title: true }
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