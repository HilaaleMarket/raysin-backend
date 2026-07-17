import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { createOrder, getUserOrders, getVendorOrders } from '../controllers/orderController.js';
import { requireAdmin } from '../middleware/adminMiddleware.js';
import { createProduct, getMyProducts } from '../controllers/productController.js';
import { processPayment } from '../controllers/paymentController.js';
import { getAllVendors, updateVendorStatus, getAdminStats } from '../controllers/adminController.js';

const router = Router();

// ==========================================
// 1. MACAMIILKA, DALABAADKA & LACAG-BIXINTA
// ==========================================
// Dalabaadka (Orders)
router.post('/orders', authenticateToken, createOrder);
router.get('/orders/my', authenticateToken, getUserOrders);
router.get('/orders/vendor', authenticateToken, getVendorOrders);

// Lacag-bixinta (Payments)
router.post('/payments/charge', authenticateToken, processPayment);

// ==========================================
// 2. ALAABTA IIBIYAHA (Vendor Protected Routes)
// ==========================================
router.post('/products', authenticateToken, createProduct);
router.get('/products/my', authenticateToken, getMyProducts);

// ==========================================
// 3. MAAMULKA GUUD (Admin Only Routes)
// ==========================================
router.get('/admin/vendors', authenticateToken, requireAdmin, getAllVendors);
router.post('/admin/vendors/status', authenticateToken, requireAdmin, updateVendorStatus);
router.get('/admin/stats', authenticateToken, requireAdmin, getAdminStats);

export default router;