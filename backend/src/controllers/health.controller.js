// backend/src/controllers/health.controller.js
import { config } from '../config/index.js';
import { db } from '../config/database.js';
import { sendSuccess } from '../utils/response.js';

export class HealthController {
  check(req, res) {
    return sendSuccess(res, {
      status: 'ok',
      service: 'APFRS API Backend',
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      database: db.getConnectionStatus(),
      environment: config.nodeEnv,
    });
  }

  ready(req, res) {
    return sendSuccess(res, {
      status: 'ready',
      timestamp: new Date().toISOString(),
    });
  }

  live(req, res) {
    return sendSuccess(res, {
      status: 'alive',
      timestamp: new Date().toISOString(),
    });
  }
}

export const healthController = new HealthController();
export default healthController;
