import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/authRoutes.js';
import apiRoutes from './routes/apiRoutes.js';
import orderRoutes from './routes/order.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const pool = new pg.Pool({ 
  connectionString: process.env.DATABASE_URL 
});

const adapter = new PrismaPg(pool);
export const prisma = new PrismaClient({ adapter });

app.use(cors({
  origin: '*', 
  credentials: true
}));

app.use(express.json());

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Hilaale Backend is running smoothly 🚀' });
});

app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);
app.use('/api/orders', orderRoutes);

app.listen(PORT, () => {
  console.log(`⚡️ [server]: Hilaale API Server wuxuu ka kiciyay http://localhost:${PORT}`);
});