import { adaptExpressUpdatePaymentStatusRoute as updatePaymentStatus } from '@/main/adapters';
import { makeOrderController } from '@/main/factories/application/controllers';

import { Router } from 'express';

export default (router: Router): void => {
  router.post('/webhook', updatePaymentStatus(makeOrderController()));
};
