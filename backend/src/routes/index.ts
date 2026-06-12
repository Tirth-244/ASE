// =============================================================================
// Route Aggregator
// =============================================================================
// Combines all route modules and mounts them on the Express app.
// =============================================================================

import { Router } from 'express';
import authRoutes from './auth.routes';
import projectRoutes from './project.routes';
import analysisRoutes from './analysis.routes';
import clipRoutes from './clip.routes';
import exportRoutes from './export.routes';

const router = Router();

// Mount route modules
router.use('/auth', authRoutes);
router.use('/projects', projectRoutes);
router.use('/projects', analysisRoutes); // /projects/:id/analyze, /projects/:id/analysis
router.use('/', clipRoutes); // /projects/:id/clips, /clips/:id
router.use('/', exportRoutes); // /clips/:id/export, /exports/:id

export default router;
