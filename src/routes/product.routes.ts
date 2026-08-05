import { Router } from 'express';
import multer from 'multer';
import {
  createProduct,
  getProducts,
  getMyProducts,
  getProductById,
  updateProduct,
  deleteProduct
} from '../controllers/productController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

// Setup multer memory storage oo leh xaddiga xajmiga faylka (Max 10MB)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB per file
});

const router = Router();

// 🟢 GET Routes
router.get('/', getProducts);
router.get('/my-products', authenticateToken, getMyProducts);
router.get('/:id', getProductById);

// 🟢 POST & PUT Routes
// `upload.any()` wuxuu maareynayaa 'image', 'images', ama Field kasta oo fayl ah oo ka yimaada Frontend-ka
router.post('/', authenticateToken, upload.any(), createProduct);
router.put('/:id', authenticateToken, upload.any(), updateProduct);

// 🟢 DELETE Route
router.delete('/:id', authenticateToken, deleteProduct);

export default router;