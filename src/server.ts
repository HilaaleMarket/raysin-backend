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

// 1. Array-ga origins-ka idanka leh
const allowedOrigins = [
  'https://hilaale.com',
  'https://www.hilaale.com',
  'http://localhost:3000',
  'http://localhost:5173'
];

// 2. Options-ka CORS-ka
const corsOptions = {
  origin: (origin: any, callback: any) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Permissive for testing
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
};

// 3. Middleware-yada CORS-ka iyo JSON Parsing
app.use(cors(corsOptions));
app.options(/(.*)/, cors(corsOptions));
app.use(express.json());

// Root endpoint (Si looga baaqsado 404 marka server-ka la ping-gareeyo)
app.get('/', (req, res) => {
  res.status(200).send('Raysin / Hilaale API Server is LIVE 🚀');
});

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Hilaale Backend is running smoothly 🚀' });
});

// Routes-ka Guud
app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);
app.use('/api/orders', orderRoutes);

app.listen(PORT, () => {
  console.log(`⚡️ [server]: Hilaale API Server wuxuu ka kiciyay http://localhost:${PORT}`);
});