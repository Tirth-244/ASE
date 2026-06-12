// =============================================================================
// Project Routes
// =============================================================================

import { Router } from 'express';
import { z } from 'zod';
import * as projectController from '../controllers/project.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate.middleware';

const router = Router();

// All project routes require authentication
router.use(authenticate as any);

// Validation schemas
const createProjectSchema = z.object({
  youtubeUrl: z.string().url('Invalid URL format'),
});

// Routes
router.post('/', validateBody(createProjectSchema), projectController.createProject as any);
router.get('/', projectController.listProjects as any);
router.get('/:id', projectController.getProject as any);
router.get('/:id/stream', projectController.streamProjectVideo as any);
router.delete('/:id', projectController.deleteProject as any);

export default router;
