import express from 'express';
import { approveTransaction, getAdminDashboardStats } from '../controllers/wallet.controller.js';

const router = express.Router();

// Routes-ka maamulka lacagta hilaale
router.post('/approve', approveTransaction);
router.get('/admin/stats', getAdminDashboardStats);

export default router;