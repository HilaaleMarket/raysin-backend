import { Request, Response } from 'express';
import { prisma } from '../server.js';

export const processWalletTransfer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { paymentId } = req.body;

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId }
    });

    if (!payment) {
      res.status(404).json({ success: false, error: 'Lacag-bixinta lama helin' });
      return;
    }

    const order = await prisma.order.findUnique({
      where: { id: payment.orderId }
    });

    if (!order) {
      res.status(404).json({ success: false, error: 'Dalabka lama helin' });
      return;
    }

    await prisma.$transaction([
      prisma.wallet.update({
        where: { userId: order.userId },
        data: { balance: { decrement: payment.amount } }
      }),
      prisma.vendor.update({
        where: { id: order.vendorId },
        data: { balance: { increment: payment.amount } }
      })
    ]);

    res.status(200).json({ success: true, message: 'Wareejinta boorsada waa la dhameystiray' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Cilad baa ka dhacday boorsada' });
  }
};

export const getWalletBalance = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params.userId as string;

    const wallet = await prisma.wallet.findUnique({
      where: { userId }
    });

    if (!wallet) {
      res.status(404).json({ success: false, error: 'Wallet-ka lama helin' });
      return;
    }

    res.status(200).json({ success: true, balance: wallet.balance, points: wallet.points });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Cilad baa dhacday' });
  }
};