import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { PaymentService } from '../services/paymentService.js';
import { prisma } from '../server.js';

export const processPayment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { orderId, gateway, payerPhone } = req.body;

    if (!orderId || !gateway || !payerPhone) {
      res.status(400).json({ error: 'Fadlan soo dhiib orderId, gateway, iyo payerPhone' });
      return;
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      res.status(404).json({ error: 'Dalabka (Order-ka) lama helin.' });
      return;
    }

    const paymentRecord = await prisma.payment.create({
      data: {
        orderId: order.id,
        amount: order.totalAmount,
        gateway: gateway.toUpperCase(),
        payerPhone,
        status: 'PENDING'
      }
    });

    let paymentResult;

    if (gateway.toUpperCase() === 'ZAAD') {
      paymentResult = await PaymentService.initiateZaadPayment(order.id, order.totalAmount, payerPhone);
    } else if (gateway.toUpperCase() === 'EDAHAB') {
      paymentResult = await PaymentService.initiateEDahabPayment(order.id, order.totalAmount, payerPhone);
    } else {
      res.status(400).json({ error: 'Gateway-ga aad dooratay Raysin ma taageerto.' });
      return;
    }

    if (paymentResult.success) {
      await prisma.$transaction([
        prisma.payment.update({
          where: { id: paymentRecord.id },
          data: { status: 'SUCCESS', transactionId: paymentResult.transactionId }
        }),
        prisma.order.update({
          where: { id: order.id },
          data: { status: 'paid' }
        })
      ]);
      res.status(200).json({ success: true, transactionId: paymentResult.transactionId });
    } else {
      await prisma.payment.update({
        where: { id: paymentRecord.id },
        data: { status: 'FAILED' }
      });
      res.status(400).json({ success: false, error: paymentResult.errorMessage });
    }
  } catch (error) {
    res.status(500).json({ error: 'Cilad baa ka dhacday socodsiinta lacagta.' });
  }
};