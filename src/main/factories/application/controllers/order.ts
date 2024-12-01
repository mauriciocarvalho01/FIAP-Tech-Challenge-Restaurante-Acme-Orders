import {
  makeOrderRepo,
  makeRegisterRepo,
} from '@/main/factories/infra/repos/mysql';
import {
  makeOrderService
} from '@/main/factories/domain/use-cases';
import { OrderController } from '@/application/controllers';
import { makeMessageBroker } from '@/main/factories/infra/message-broker';
import { makeValidator } from '@/main/factories/application/validation';

export const makeOrderController = (): OrderController => {
  return new OrderController(
    makeValidator(),
    makeRegisterRepo(),
    makeOrderRepo(),
    makeOrderService(),
    makeMessageBroker()
  );
};
