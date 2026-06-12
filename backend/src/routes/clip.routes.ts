// =============================================================================
// Clip Routes
// =============================================================================

import { Router } from 'express';
import { z } from 'zod';
import * as clipController from '../controllers/clip.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate.middleware';

const router = Router();

router.use(authenticate as any);

// Validation schemas
const generateClipsSchema = z.object({
  preset: z.enum(['SHORT_15', 'SHORT_30', 'HIGHLIGHT_60', 'CUSTOM']).default('SHORT_30'),
  effects: z
    .object({
      autoZoom: z.boolean().optional(),
      dynamicCrop: z.boolean().optional(),
      slowMotion: z.boolean().optional(),
      slowMotionFactor: z.number().min(0.1).max(1).optional(),
      transitions: z.enum(['none', 'fade', 'dissolve', 'wipe']).optional(),
      captions: z.boolean().optional(),
      scoreboard: z.boolean().optional(),
    })
    .optional(),
});

const updateClipSchema = z.object({
  startTime: z.number().min(0).optional(),
  endTime: z.number().min(0).optional(),
  effects: z.record(z.unknown()).optional(),
  order: z.number().int().min(0).optional(),
  title: z.string().optional(),
});

// Routes
router.post(
  '/projects/:id/clips',
  validateBody(generateClipsSchema),
  clipController.generateClips as any,
);
router.get('/projects/:id/clips', clipController.getClips as any);
router.put('/clips/:id', validateBody(updateClipSchema), clipController.updateClip as any);
router.delete('/clips/:id', clipController.deleteClip as any);

export default router;
