import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authMiddleware.js';

/**
 * requireAdmin Middleware
 * Waxaa la raddom-gareeyaa marka la rabo in la xaqiijiyo in qofka soo galay uu yahay Admin.
 * Fiiro gaar ah: Middleware-kani wuxuu had iyo jeer yimaadaa ka dib 'authenticateToken'.
 */
export const requireAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userRole = req.userRole;

    // 1. Hubi in adeegsaduhu soo galay (ka soo gudbay authenticateToken)
    if (!userRole) {
      res.status(401).json({ 
        success: false, 
        error: 'Fadlan marka hore iska diiwaangeli nidaamka.' 
      });
      return;
    }

    // 2. Hubi in doorka adeegsaduhu yahay ADMIN
    if (userRole !== 'ADMIN') {
      res.status(403).json({ 
        success: false, 
        error: 'Fadlan laguma oggola inaad gasho qaybtan. Admin oo kaliya ayaa geli kara.' 
      });
      return;
    }

    // Haddii wax walba sax yihiin, u gudbi talaabada xigta (Controller-ka)
    next();
  } catch (error) {
    console.error("Admin Authorization Middleware Error:", error);
    res.status(500).json({ 
      success: false, 
      error: 'Cilad baa ka dhacday hubinta awoodaha Admin-ka.' 
    });
  }
};