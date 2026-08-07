import { registerEmailJobHandler } from './service';

registerEmailJobHandler();

export {
  deliverEmail,
  getEmailStatus,
  queueEmail,
  registerEmailJobHandler,
  type EmailInput,
} from './service';
