import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'e8b9f42c12a86c07d35b912f718bc89456f08127389ab40112';

export interface AuthUserPayload {
  id: string;
  email?: string;
  role: 'USER' | 'VENDOR' | 'ADMIN' | string;
  shopName?: string;
  type?: string;
}

// Extends Express Request si uu req.body, req.params, req.headers, req.query u yeesho
export interface AuthenticatedRequest extends Request {
  user?: AuthUserPayload;
  userId?: string;
  vendorId?: string;
  userRole?: string;
}

export interface AuthRequest extends AuthenticatedRequest {}

export const authenticateToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Access Denied: Wax token ah oo la soo meelayn waayay.',
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    req.user = {
      id: decoded.id || decoded.userId || decoded.vendorId,
      email: decoded.email,
      role: (decoded.role || decoded.type || 'USER').toUpperCase(),
      shopName: decoded.shopName,
    };

    const type = decoded.type ? String(decoded.type).toUpperCase() : '';
    const role = decoded.role ? String(decoded.role).toUpperCase() : 'USER';

    if (type === 'VENDOR' || role === 'VENDOR') {
      req.vendorId = decoded.id || decoded.vendorId;
      req.userRole = 'VENDOR';
    } else {
      req.userId = decoded.id || decoded.userId;
      req.userRole = role;
    }

    next();
  } catch (error) {
    console.error('JWT Verification Error:', error);
    res.status(403).json({
      success: false,
      error: 'Token-ku waa khaldan yahay ama waa uu dhacay (Expired).',
    });
    return;
  }
};

export const requireVendorOrAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user && !req.userRole) {
    res.status(401).json({ success: false, error: 'User not authenticated' });
    return;
  }

  const role = (req.user?.role || req.userRole || '').toUpperCase();

  if (role === 'VENDOR' || role === 'ADMIN') {
    next();
    return;
  }

  res.status(403).json({
    success: false,
    error: 'Ogolaansho la aan: Qaybtan waxaa loo ogol yahay oo kaliya Iibiyeyaasha(Vendors).',
  });
  return;
};