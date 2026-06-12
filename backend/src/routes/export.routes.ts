// =============================================================================
// Export Routes
// =============================================================================

import { Router } from 'express';
import { z } from 'zod';
import * as exportController from '../controllers/export.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate.middleware';

const router = Router();

router.use(authenticate as any);

// Validation schemas
const startExportSchema = z.object({
  format: z.enum(['MP4', 'WEBM', 'MOV']).default('MP4'),
  resolution: z.string().default('1080x1920'),
  quality: z.enum(['low', 'medium', 'high', 'ultra']).default('high'),
});

// Routes
router.post(
  '/clips/:id/export',
  validateBody(startExportSchema),
  exportController.startExport as any,
);
router.get('/exports/:id', exportController.getExport as any);
router.get('/exports', exportController.listExports as any);
router.get('/exports/:id/download', exportController.downloadExport as any);

export default router;
