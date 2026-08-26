// backend/src/controllers/email.controller.js
import { emailService } from '../services/email.service.js';
import { sendSuccess } from '../utils/response.js';

export class EmailController {
  async sendEmail(req, res, next) {
    try {
      const { config, emailData } = req.body;
      const result = await emailService.sendEmail(emailData, config);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async sendBulkEmails(req, res, next) {
    try {
      const { config, emails } = req.body;
      const result = await emailService.sendBulkEmails(emails, config);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async getEmailStatus(req, res, next) {
    try {
      const status = emailService.getEmailStatus(req.params.id);
      if (!status) {
        return res.status(404).json({ success: false, error: 'Email status not found.' });
      }
      return sendSuccess(res, status);
    } catch (error) {
      next(error);
    }
  }

  async testSMTP(req, res, next) {
    try {
      const { config } = req.body;
      const result = await emailService.testConnection(config);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
}

export const emailController = new EmailController();
export default emailController;
