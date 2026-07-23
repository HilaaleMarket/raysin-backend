import express, { Request, Response } from 'express';
import cors, { CorsOptions } from 'cors';
import dotenv from 'dotenv';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

// Ku dar .js extensions-ka import kasta oo relative ah:
import authRoutes from './routes/authRoutes.js';
import apiRoutes from './routes/apiRoutes.js';
import orderRoutes from './routes/order.routes.js'; // Haddii faylkani uu ku yaal src/routes/order.routes.ts
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Prisma Client & PostgreSQL Adapter Setup
const pool = new pg.Pool({ 
  connectionString: process.env.DATABASE_URL 
});

const adapter = new PrismaPg(pool);
export const prisma = new PrismaClient({ adapter });

// 1. Array-ga origins-ka idanka leh (ku dar Network IP-gaaga haddii aad mobaylka ka tijaabinayso)
const allowedOrigins = [
  'https://hilaale.com',
  'https://www.hilaale.com',
  'http://localhost:3000',
  'http://localhost:5173'
];

// 2. Options-ka CORS-ka ee la hagaajiyay
const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allows requests without origin (like mobile apps, curl, or Postman) or allowed origins
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // Permissive fallback during testing
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
};

// 3. Middleware-yada CORS iyo JSON Parsing
app.use(cors(corsOptions));

// Si toos ah uga jawaab OPTIONS (Preflight Requests) dhammaan routes-ka
app.options('*', cors(corsOptions));

app.use(express.json());

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.status(200).send('Raysin / Hilaale API Server is LIVE 🚀');
});

// Health Check Endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: 'Hilaale Backend is running smoothly 🚀' });
});

// Routes-ka Guud
app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);
app.use('/api/orders', orderRoutes);

// Server Listening
app.listen(PORT, () => {
  console.log(`⚡️ [server]: Hilaale API Server wuxuu ka kiciyay http://localhost:${PORT}`);
});