import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// 🎯 Fure-yaasha JWT secret-ka (ku kaydi .env faylkaaga)
const JWT_SECRET = process.env.JWT_SECRET || 'raysin_secret_key_12345';

// Sida uu u eg yahay Payload-ka JWT-gaaga
export interface AuthUserPayload {
    id: string;
    email: string;
    role: 'USER' | 'VENDOR' | 'ADMIN';
    shopName?: string;
}

// Ku dar 'user' Custom Property si uu Express Request u aqoodo
export interface AuthenticatedRequest extends Request {
    user?: AuthUserPayload;
}

/**
 * 🔒 Middleware-ka Guud ee Hubiya Token-ka (Authenticate)
 */
export const authenticateToken = (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) => {
    // 1. Ka soo saar Header-ka Authorization (waxay u imanaysaa "Bearer <token>")
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    // Haddii uu Token-ku vanti yahay
    if (!token) {
        return res.status(401).json({
            success: false,
            error: 'Access Denied: Wax token ah oo la soo meelayn waayay. Fadlan soo gal koontadaada.',
        });
    }

    try {
        // 2. Hubi (Verify) saxnimada Token-ka
        const decoded = jwt.verify(token, JWT_SECRET) as AuthUserPayload;

        // 3. Ku dhibic xogta decoded-ka ah `req.user`
        req.user = decoded;

        // U gudb wax-ka-qabashada middleware-ka ama controller-ka xiga
        next();
    } catch (error) {
        console.error('JWT Verification Error:', error);
        return res.status(403).json({
            success: false,
            error: 'Token-ku waa khaldan yahay ama waa uu dhacay (Expired).',
        });
    }
};

/**
 * 🏬 Middleware-ka Hubiya Door-ka (Role Check): VENDOR ama ADMIN oo kaliya
 */
export const requireVendorOrAdmin = (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) => {
    if (!req.user) {
        return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    const role = req.user.role?.toUpperCase();

    if (role === 'VENDOR' || role === 'ADMIN') {
        return next();
    }

    return res.status(403).json({
        success: false,
        error: 'Ogolaansho la aan: Qaybtan waxaa loo ogol yahay oo kaliya Iibiyeyaasha(Vendors).',
    });
};