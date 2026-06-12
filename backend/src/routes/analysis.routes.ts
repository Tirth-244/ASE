// =============================================================================
// Analysis Routes
// =============================================================================

import { Router } from 'express';
import * as analysisController from '../controllers/analysis.controller';
import { authenticate } from '../middleware/auth.middleware';
import { heavyLimiter } from '../middleware/rateLimit.middleware';

const router = Router();

// All analysis routes require authentication
router.use(authenticate as any);

// Routes
router.post('/:id/analyze', heavyLimiter, analysisController.startAnalysis as any);
router.get('/:id/analysis', analysisController.getAnalysis as any);
router.get('/:id/moments', analysisController.getMoments as any);

export default router;
