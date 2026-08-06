import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 1. Diiwaangeli komishanka dalabka cusub & Hubi xadka cas
export const recordOrderCommission = async (req: Request, res: Response) => {
  try {
    const { vendorId, // @ts-ignore
          // @ts-ignore
          productId, amount, commissionRate = 0.05 } = req.body;
    const commissionFee = amount * commissionRate;

    const result = await prisma.$transaction(async (tx) => {
      // Create Order
      const order = await tx.order.create({
        data: {
          vendorId,
          // @ts-ignore
          // @ts-ignore
          productId,
          amount,
          commission: commissionFee,
        },
      });

      // Fetch or Create Wallet
      let wallet = await (tx as any).vendorWallet.findUnique({ where: { vendorId } });
      if (!wallet) {
        wallet = await (tx as any).vendorWallet.create({ data: { vendorId } });
      }

      const newDebt = wallet.accumulatedDebt + commissionFee;
      const isOverLimit = newDebt >= wallet.creditLimit;

      // Update Wallet Debt
      const updatedWallet = await (tx as any).vendorWallet.update({
        where: { vendorId },
        data: {
          accumulatedDebt: newDebt,
          isLocked: isOverLimit,
        },
      });

      // If Debt reaches Red Limit, deactivate all vendor products
      if (isOverLimit) {
        await tx.product.updateMany({
          where: { vendorId },
          data: { status: 'DRAFT' },
        });
      }

      return { order, updatedWallet };
    });

    return res.status(201).json({ success: true, data: result });
  } catch (error) {
    return res.status(500).json({ success: false, error: (error as Error).message });
  }
};

// 2. Marka iibiyuhu uu deynta bixiyo
export const clearVendorDebt = async (req: Request, res: Response) => {
  try {
    const { vendorId, paidAmount } = req.body;

    const wallet = await (prisma as any).vendorWallet.findUnique({ where: { vendorId } });
    if (!wallet) {
      return res.status(404).json({ success: false, message: 'Wallet not found' });
    }

    const remainingDebt = Math.max(0, wallet.accumulatedDebt - paidAmount);
    const shouldUnlock = remainingDebt < wallet.creditLimit;

    const updatedWallet = await (prisma as any).vendorWallet.update({
      where: { vendorId },
      data: {
        accumulatedDebt: remainingDebt,
        isLocked: !shouldUnlock,
      },
    });

    if (shouldUnlock) {
      await txProductStatus(vendorId, 'ACTIVE');
    }

    return res.status(200).json({ success: true, data: updatedWallet });
  } catch (error) {
    return res.status(500).json({ success: false, error: (error as Error).message });
  }
};

const txProductStatus = async (vendorId: string, status: string) => {
  await prisma.product.updateMany({
    where: { vendorId },
    data: { status },
  });
};