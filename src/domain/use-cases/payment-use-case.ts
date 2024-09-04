import { PaymentService } from '@/domain/contracts/use-cases';
import { TokenHandler } from '@/infra/gateways';
import { OrderRepository } from '@/infra/repos/mysql';
import { Order } from '@/domain/contracts/repos';

// Classe PaymentManager para encapsular a lógica de negócios relacionada ao processamento de pagamentos
export class PaymentManager implements PaymentService {
  constructor(
    private readonly orderRepo: OrderRepository,
    private readonly tokenHandler: TokenHandler
  ) {}

  //https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks#editor_10
  // Função para processar o webhook e retornar os dados do pagamento
  processPaymentWebhook(
    webhook: PaymentService.PaymentWebhookInput
  ): PaymentService.GenericType {
    const paymentData: PaymentService.GenericType = {
      paymentId: webhook.data.id,
      status: webhook.action.includes('created') ? 'Concluído' : 'Cancelado',
    };

    // Aqui, você pode adicionar lógica adicional para definir outras propriedades da entidade PaymentEntity,
    // como totalPrice, paymentMethod, pixUrl, pixCode, expirationDate, etc., se essas informações estiverem disponíveis no webhook.

    return paymentData;
  }

  // Forma de pagamento: Pix
  validatePaymentMethodRule(paymentMethod: string): boolean {
    const paymentMethods = ['PIX'];
    return paymentMethods.includes(paymentMethod.toLocaleUpperCase());
  }

  async savePayment(
    paymentData: Order.InsertPaymentInput
  ): Promise<Order.InsertPaymentOutput> {
    if (!paymentData.paymentId)
      paymentData.paymentId = this.tokenHandler.generateUuid();
    const order = await this.orderRepo.savePayment(paymentData);
    if (order === undefined) throw new Error('Cant insert payment');
    return order;
  }
}
