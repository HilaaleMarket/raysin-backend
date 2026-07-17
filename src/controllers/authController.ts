import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../server.js';

// Cadadka cusbada ee bcrypt (Salt Rounds)
const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'raysin_super_secret_key_2026';

/**
 * 1. DIIWAANGELINTA USER (Macaamiisha caadiga ah & Admin-ka)
 */
export const registerUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, phone, password, role } = req.body;

    // 1. Hubi in dhammaan xogtii loo baahnaa la keenay
    if (!name || !email || !phone || !password) {
      res.status(400).json({ error: 'Fadlan buuxi dhammaan meelaha bannaan.' });
      return;
    }

    // 2. Hubi haddii iimaylka ama telefoonka mar hore la isticmaalay
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { phone }]
      }
    });

    if (existingUser) {
      res.status(400).json({ error: 'Iimaylkan ama telefoonkan mar hore ayaa la isticmaalay.' });
      return;
    }

    // 3. Go'aami doorka qofka (Haddii aan la soo dirin doorku wuxuu noqonayaa USER)
    const userRole = role && ['USER', 'ADMIN'].includes(role.toUpperCase()) 
      ? role.toUpperCase() 
      : 'USER';

    // 4. Hash-garee furaha sirta ah (Password hashing)
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // 5. Ku keydi User-ka cusub Database-ka
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        password: hashedPassword,
        role: userRole
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true
      }
    });

    res.status(201).json({
      success: true,
      message: `${userRole} si guul leh ayaa loo diiwangeliyey.`,
      data: newUser
    });

  } catch (error: any) {
    console.error("User registration error:", error);
    res.status(500).json({ error: 'Cilad baa dhacday marka la diiwaangelinayey isticmaalaha.' });
  }
};

/**
 * 2. SOO GALKA USER (Login macaamiisha & Admin-ka)
 */
export const loginUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Fadlan buuxi iimaylka iyo password-ka.' });
      return;
    }

    // 1. Ka raadi user-ka database-ka
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ error: 'Iimaylka ama password-ka aad gelisay waa khalad.' });
      return;
    }

    // 2. Isbarbardhig labada password adoo isticmaalaya bcrypt
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      res.status(401).json({ error: 'Iimaylka ama password-ka aad gelisay waa khalad.' });
      return;
    }

    // 3. Dhaliso JWT Token ammaan ah (Wuxuu shaqaynayaa 24 saacadood)
    const token = jwt.sign(
      { id: user.id, role: user.role, type: 'USER' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(200).json({
      success: true,
      message: 'Si guul leh ayaad u soo gashay.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });

  } catch (error) {
    console.error("User login error:", error);
    res.status(500).json({ error: 'Cilad baa dhacday xilliga soo galka.' });
  }
};

/**
 * 3. DIIWAANGELINTA VENDOR (Iibiyayaasha)
 */
export const registerVendor = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, phone, password, shopName } = req.body;

    if (!name || !email || !phone || !password) {
      res.status(400).json({ error: 'Fadlan buuxi name, email, phone, iyo password.' });
      return;
    }

    const existingVendor = await prisma.vendor.findFirst({
      where: {
        OR: [{ email }, { phone }]
      }
    });

    if (existingVendor) {
      res.status(400).json({ error: 'Iimaylkan ama telefoonkan mar hore ayaa la isticmaalay.' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const newVendor = await prisma.vendor.create({
      data: {
        name,
        email,
        phone,
        password: hashedPassword,
        shopName: shopName || null,
        status: 'PENDING' // Admin-ka ayaa ansixin doona hadhow
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        shopName: true,
        status: true,
        createdAt: true
      }
    });

    res.status(201).json({
      success: true,
      message: 'Iibiyaha waa la diiwaangeliyey. Wuxuu sugayaa ansixinta Admin-ka.',
      data: newVendor
    });

  } catch (error) {
    console.error("Vendor registration error:", error);
    res.status(500).json({ error: 'Cilad baa ku dhacday diiwaangelinta iibiyaha.' });
  }
};

/**
 * 4. SOO GALKA VENDOR (Login Iibiyayaasha)
 */
export const loginVendor = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Fadlan buuxi iimaylka iyo password-ka.' });
      return;
    }

    const vendor = await prisma.vendor.findUnique({ where: { email } });
    if (!vendor) {
      res.status(401).json({ error: 'Iimaylka ama password-ka aad gelisay waa khalad.' });
      return;
    }

    // Hubi haddii Vendor-ka la xannibay ama aan weli la ansixin
    if (vendor.status !== 'APPROVED') {
      res.status(403).json({ 
        error: `Koontadaada lama geli karo. Xaaladeedu waa: ${vendor.status}. Fadlan la xiriir Admin-ka.` 
      });
      return;
    }

    const isPasswordMatch = await bcrypt.compare(password, vendor.password);
    if (!isPasswordMatch) {
      res.status(401).json({ error: 'Iimaylka ama password-ka aad gelisay waa khalad.' });
      return;
    }

    // U dhalis Token gaar u ah Vendor-ka
    const token = jwt.sign(
      { id: vendor.id, role: 'VENDOR', type: 'VENDOR' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(200).json({
      success: true,
      message: 'Si guul leh ayaad u soo gashay iibiye ahaan.',
      token,
      vendor: {
        id: vendor.id,
        name: vendor.name,
        email: vendor.email,
        shopName: vendor.shopName,
        status: vendor.status
      }
    });

  } catch (error) {
    console.error("Vendor login error:", error);
    res.status(500).json({ error: 'Cilad baa dhacday xilliga soo galka.' });
  }
};