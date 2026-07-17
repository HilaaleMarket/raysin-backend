import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/authRoutes.js';
import apiRoutes from './routes/apiRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// 1. Samee xiriirka PostgreSQL adoo isticmaalaya "pg" Pool
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL 
});

// 2. Ku xir Prisma adapter-keeda cusub
const adapter = new PrismaPg(pool);

// 3. Dhis PrismaClient adoo adeegsanaya adapter-ka (Prisma v7+)
export const prisma = new PrismaClient({ adapter });

app.use(cors({
  origin: '*', 
  credentials: true
}));

app.use(express.json());

// API Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Raysin Backend is running smoothly 🚀' });
});

// Routes-ka rasmiga ah
app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);

// Endpoint-ka tijaabada ah ee diiwaangelinta Vendor-ka
app.post('/api/vendors/register', async (req, res) => {
  try {
    const { name, email, phone, password, shopName } = req.body;

    if (!name || !email || !phone || !password) {
       res.status(400).json({ error: 'Fadlan buuxi name, email, phone, iyo password' });
       return;
    }

    const newVendor = await prisma.vendor.create({
      data: { 
        name, 
        email, 
        phone,
        password, // Fiiro gaar ah: Qaybta rasmiga ah dhexdeeda bcrypt baa lagu hash-gareeyaa
        shopName: shopName || null
      }
    });

    res.status(201).json({ success: true, data: newVendor });
  } catch (error: any) {
    console.error("Cilad baa ka dhacday abuurista Vendor-ka:", error);
    res.status(500).json({ error: 'Database error ama database-ka ayaan ku xirnayn backend-ka' });
  }
});

app.listen(PORT, () => {
  console.log(`⚡️ [server]: Raysin API Server wuxuu ka kiciyay http://localhost:${PORT}`);
});