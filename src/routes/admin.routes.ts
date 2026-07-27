import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireAdmin } from '../middleware/adminMiddleware.js';

// Ka soo import-garayso functions-ka gudaha adminController.ts ku jira
// (Hubi magacyada aad u bixisay adminController.ts dhexdiisa)
import { 
  getAllVendors,        // ama getAdminVendors
  updateVendorStatus 
} from '../controllers/adminController.js';

const router = Router();

// 1. Get All Vendors (GET: /api/admin/vendors)
router.get('/vendors', authenticateToken, requireAdmin, getAllVendors);

// 2. Update Vendor Status (PATCH: /api/admin/vendors/:id/status)
router.patch('/vendors/:id/status', authenticateToken, requireAdmin, updateVendorStatus);

// 3. Fallback Update Vendor Status (PUT: /api/admin/vendors/status)
router.put('/vendors/status', authenticateToken, requireAdmin, updateVendorStatus);

export default router;