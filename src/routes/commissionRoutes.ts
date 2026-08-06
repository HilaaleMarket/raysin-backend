import { Router } from 'express';
import { recordOrderCommission, clearVendorDebt } from '../controllers/commissionController.js';

const router = Router();

router.post('/record-order', recordOrderCommission);
router.post('/pay-debt', clearVendorDebt);

export default router;