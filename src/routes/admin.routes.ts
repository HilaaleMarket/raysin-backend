import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireAdmin } from '../middleware/adminMiddleware.js';

import { 
  getAllVendors,
  updateVendorStatus,
  getAdminStats
} from '../controllers/adminController.js';

const router = Router();

// 1. Get Admin Dashboard Stats (GET: /api/admin/stats)
router.get('/stats', authenticateToken, requireAdmin, getAdminStats);

// 2. Get All Vendors (GET: /api/admin/vendors)
router.get('/vendors', authenticateToken, requireAdmin, getAllVendors);

// 3. Update Vendor Status (PATCH: /api/admin/vendors/:id/status)
router.patch('/vendors/:id/status', authenticateToken, requireAdmin, updateVendorStatus);

// 4. Fallback Update Vendor Status (PUT: /api/admin/vendors/status)
router.put('/vendors/status', authenticateToken, requireAdmin, updateVendorStatus);

// 5. Direct PUT ID Route (PUT: /api/admin/vendors/:id)
router.put('/vendors/:id', authenticateToken, requireAdmin, updateVendorStatus);

export default router;