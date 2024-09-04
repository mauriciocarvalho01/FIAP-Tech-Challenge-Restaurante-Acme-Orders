import { Order } from '../repos';

export interface PaymentService {
  processPaymentWebhook: (
    webhook: PaymentService.PaymentWebhookInput
  ) => PaymentService.GenericType;
  validatePaymentMethodRule: (paymentMethod: string) => boolean;
  savePayment: (
    paymentData: Order.InsertPaymentInput
  ) => Promise<Order.InsertPaymentOutput>;
}

export namespace PaymentService {
  export type GenericType<T = any> = T;

  export type PaymentWebhookInput = {
    id: number;
    live_mode: boolean;
    type: string;
    date_created: string;
    user_id: number;
    api_version: string;
    action: string;
    data: {
      id: string;
    };
  };
}
