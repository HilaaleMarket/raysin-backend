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

const storage = multer.memoryStorage();
const upload = multer({ storage });

const router = Router();

// 🛑 LAGU SAXAY: Wadadu waxay maraysaa root-ka '/' maadaama Express u magacawday '/api/products'
router.get('/', getProducts);
router.get('/my-products', authenticateToken, getMyProducts);
router.get('/:id', getProductById);

router.post('/', authenticateToken, upload.single('image'), createProduct);
router.put('/:id', authenticateToken, upload.single('image'), updateProduct);
router.delete('/:id', authenticateToken, deleteProduct);

export default router;