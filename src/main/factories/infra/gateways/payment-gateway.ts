import { Pagarme, PaymentGateway } from '@/infra/gateways';

export const makePaymentGateway = (): PaymentGateway => {
  return new Pagarme();
};
