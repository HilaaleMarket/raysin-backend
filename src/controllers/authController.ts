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
 * 2. SOO GALKA USER (Aqbalsan Email, Phone, ama Vendor Fallback)
 */
export const loginUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawInput = req.body.email || req.body.identifier || req.body.phone;
    const password = req.body.password;

    if (!rawInput || !password) {
      res.status(400).json({ success: false, error: 'Fadlan buuxi iimaylka/telefoonka iyo password-ka.' });
      return;
    }

    const cleanInput = rawInput.trim();
    const lowerInput = cleanInput.toLowerCase();

    console.log("🔍 [LOGIN ATTEMPT]: Searching for:", cleanInput);

    // A. Marka hore ku raadi USER Table-ka (Email ama Phone)
    let account = await prisma.user.findFirst({
      where: {
        OR: [
          { email: lowerInput },
          { phone: cleanInput }
        ]
      }
    });

    let accountType: 'USER' | 'VENDOR' = 'USER';

    // B. Haddii laga waayo User Table-ka, ku raadi VENDOR Table-ka
    if (!account) {
      const vendorAccount = await prisma.vendor.findFirst({
        where: {
          OR: [
            { email: lowerInput },
            { phone: cleanInput }
          ]
        }
      });

      if (vendorAccount) {
        account = vendorAccount as any;
        accountType = 'VENDOR';
      }
    }

    // C. Haddii labada Table-ba laga waayo xogtaas
    if (!account) {
      console.log("❌ [LOGIN ERROR]: User/Vendor not found in Supabase DB for:", cleanInput);
      res.status(401).json({ success: false, error: 'Iimaylka/telefoonka ama password-ka aad gelisay waa khalad.' });
      return;
    }

    console.log(`✅ [LOGIN MATCH]: Found account in ${accountType} table. ID: ${account.id}`);

    // D. Hubi Password-ka
    const isPasswordMatch = await bcrypt.compare(password, account.password);
    
    if (!isPasswordMatch) {
      console.log("❌ [LOGIN ERROR]: Bcrypt Password Mismatch for:", cleanInput);
      res.status(401).json({ success: false, error: 'Iimaylka/telefoonka ama password-ka aad gelisay waa khalad.' });
      return;
    }

    console.log("🔑 [LOGIN SUCCESS]: Password matched successfully!");

    const userRole = (account as any).role || (accountType === 'VENDOR' ? 'VENDOR' : 'USER');
    const token = generateAuthToken(account.id, userRole, accountType);

    res.status(200).json({
      success: true,
      message: 'Si guul leh ayaad u soo gashay.',
      token,
      user: {
        id: account.id,
        name: account.name,
        email: account.email,
        phone: account.phone,
        role: userRole
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
 * 4. SOO GALKA VENDOR (Aqbalsan Email AMA Phone)
 */
export const loginVendor = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawInput = req.body.email || req.body.identifier || req.body.phone;
    const password = req.body.password;

    if (!rawInput || !password) {
      res.status(400).json({ success: false, error: 'Fadlan buuxi iimaylka/telefoonka iyo password-ka.' });
      return;
    }

    const cleanInput = rawInput.trim();
    const lowerInput = cleanInput.toLowerCase();

    // Ku raadi Email ama Phone
    const vendor = await prisma.vendor.findFirst({
      where: {
        OR: [
          { email: lowerInput },
          { phone: cleanInput }
        ]
      }
    });

    if (!vendor) {
      res.status(401).json({ success: false, error: 'Iimaylka/telefoonka ama password-ka aad gelisay waa khalad.' });
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
      res.status(401).json({ success: false, error: 'Iimaylka/telefoonka ama password-ka aad gelisay waa khalad.' });
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
        phone: vendor.phone,
        shopName: vendor.shopName,
        status: vendor.status
      }
    });

  } catch (error: any) {
    console.error("Vendor login error:", error);
    res.status(500).json({ success: false, error: 'Cilad baa dhacday xilliga soo galka.' });
  }
};