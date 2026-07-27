import { Router } from 'express';
import multer from 'multer';
import { createProduct } from '../controllers/productController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const storage = multer.memoryStorage();
const upload = multer({ storage });

const router = Router();

// Upload Single Image Form Route
router.post('/products', authenticateToken, upload.single('image'), createProduct);

export default router;