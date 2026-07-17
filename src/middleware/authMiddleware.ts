import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'raysin_super_secret_key_2026';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  vendorId?: string;
  userRole?: string;
}

export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Fadlan soo gudbi Token-ka aqoonsiga.' });
    return;
  }

  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (err) {
      res.status(403).json({ error: 'Token-kaagu wuxuu u muuqdaa mid dhacay ama khaldan.' });
      return;
    }

    // Haddii uu qofku yahay Vendor
    if (decoded.type === 'VENDOR') {
      req.vendorId = decoded.id;
      req.userRole = 'VENDOR';
    } else {
      // Haddii uu qofku yahay User (Macmiil ama Admin)
      req.userId = decoded.id;
      req.userRole = decoded.role;
    }

    next();
  });
};