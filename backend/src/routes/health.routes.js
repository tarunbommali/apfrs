// backend/src/routes/health.routes.js
import { Router } from 'express';
import { healthController } from '../controllers/health.controller.js';

const router = Router();

router.get('/health', (req, res) => healthController.check(req, res));
router.get('/health/ready', (req, res) => healthController.ready(req, res));
router.get('/health/live', (req, res) => healthController.live(req, res));

export default router;
