import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../server.js';

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'hilaale_super_secret_key_2026';

/**
 * Helper Function oo JWT Token dhalisa
 */
const generateAuthToken = (id: string, role: string, type: 'USER' | 'VENDOR') => {
  return jwt.sign(
    { id, role, type },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
};

/**
 * 1. DIIWAANGELINTA USER
 */
export const registerUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, phone, password, role } = req.body;

    if (!name || !email || !phone || !password) {
      res.status(400).json({ success: false, error: 'Fadlan buuxi dhammaan meelaha bannaan.' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone.trim();

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: normalizedEmail }, { phone: normalizedPhone }]
      }
    });

    if (existingUser) {
      res.status(400).json({ success: false, error: 'Iimaylkan ama telefoonkan mar hore ayaa la isticmaalay.' });
      return;
    }

    // Role mapping (Upper/Lower case safe)
    let userRole: any = 'USER';
    if (role) {
      const upper = role.toUpperCase();
      if (['ADMIN', 'VENDOR', 'USER'].includes(upper)) {
        userRole = upper;
      }
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const generatedReferralCode = `REF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        phone: normalizedPhone,
        password: hashedPassword,
        role: userRole,
        referralCode: generatedReferralCode
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

    const token = generateAuthToken(newUser.id, newUser.role as string, 'USER');

    res.status(201).json({
      success: true,
      message: `${userRole} si guul leh ayaa loo diiwangeliyey.`,
      token,
      user: newUser
    });

  } catch (error: any) {
    console.error("User registration error:", error);
    res.status(500).json({ success: false, error: error.message || 'Cilad baa dhacday marka la diiwaangelinayey isticmaalaha.' });
  }
};

/**
 * 2. SOO GALKA USER
 */
export const loginUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, error: 'Fadlan buuxi iimaylka iyo password-ka.' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      res.status(401).json({ success: false, error: 'Iimaylka ama password-ka aad gelisay waa khalad.' });
      return;
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      res.status(401).json({ success: false, error: 'Iimaylka ama password-ka aad gelisay waa khalad.' });
      return;
    }

    const token = generateAuthToken(user.id, user.role as string, 'USER');

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

  } catch (error: any) {
    console.error("User login error:", error);
    res.status(500).json({ success: false, error: 'Cilad baa dhacday xilliga soo galka.' });
  }
};

/**
 * 3. DIIWAANGELINTA VENDOR
 */
export const registerVendor = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, phone, password, shopName } = req.body;

    if (!name || !email || !phone || !password || !shopName) {
      res.status(400).json({ success: false, error: 'Fadlan buuxi name, email, phone, password, iyo shopName.' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone.trim();

    const existingVendor = await prisma.vendor.findFirst({
      where: {
        OR: [{ email: normalizedEmail }, { phone: normalizedPhone }]
      }
    });

    if (existingVendor) {
      res.status(400).json({ success: false, error: 'Iimaylkan ama telefoonkan mar hore ayaa la isticmaalay.' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const newVendor = await prisma.vendor.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        phone: normalizedPhone,
        password: hashedPassword,
        shopName: shopName.trim(),
        status: 'pending'
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

    const token = generateAuthToken(newVendor.id, 'VENDOR', 'VENDOR');

    res.status(201).json({
      success: true,
      message: 'Iibiyaha waa la diiwaangeliyey.',
      token,
      vendor: newVendor
    });

  } catch (error: any) {
    console.error("Vendor registration error:", error);
    res.status(500).json({ success: false, error: error.message || 'Cilad baa ku dhacday diiwaangelinta iibiyaha.' });
  }
};

/**
 * 4. SOO GALKA VENDOR
 */
export const loginVendor = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, error: 'Fadlan buuxi iimaylka iyo password-ka.' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    const vendor = await prisma.vendor.findUnique({ where: { email: normalizedEmail } });
    if (!vendor) {
      res.status(401).json({ success: false, error: 'Iimaylka ama password-ka aad gelisay waa khalad.' });
      return;
    }

    if (vendor.status !== 'approved' && vendor.status !== 'pending') {
      res.status(403).json({ 
        success: false,
        error: `Koontadaada lama geli karo. Xaaladeedu waa: ${vendor.status}.` 
      });
      return;
    }

    const isPasswordMatch = await bcrypt.compare(password, vendor.password);
    if (!isPasswordMatch) {
      res.status(401).json({ success: false, error: 'Iimaylka ama password-ka aad gelisay waa khalad.' });
      return;
    }

    const token = generateAuthToken(vendor.id, 'VENDOR', 'VENDOR');

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

  } catch (error: any) {
    console.error("Vendor login error:", error);
    res.status(500).json({ success: false, error: 'Cilad baa dhacday xilliga soo galka.' });
  }
};