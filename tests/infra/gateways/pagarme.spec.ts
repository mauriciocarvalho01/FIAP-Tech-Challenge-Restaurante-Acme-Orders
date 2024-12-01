import { Pagarme, PaymentGateway } from '@/infra/gateways';

describe('Pagarme', () => {
  let sut: Pagarme;
  let order: PaymentGateway.Order;

  beforeEach(() => {
    sut = new Pagarme();
    order = {
      id: 1,
      orderId: '123',
      status: 'Recebido', // Adicionando a propriedade status
      createdAt: new Date().toISOString(), // Adicionando a propriedade createdAt
      orderProducts: [], // Adicionando a propriedade orderProducts
      totalPrice: 100,
    };
  });

  describe('pixGenerate', () => {
    it('should return a valid PixGenerateResponse', async () => {
      const result = await sut.pixGenerate(order);

      expect(result).toBeDefined();
      expect(result.paymentMethod).toBe('Pix');
      expect(result.pixUrl).toBeDefined();
      expect(result.pixCode).toBeDefined();
      expect(result.expirationDate).toBeInstanceOf(Date);
      expect(result.expirationDate.getTime()).toBeGreaterThan(Date.now());
    });

    it('should generate an expiration date 24 hours from now', async () => {
      const result = await sut.pixGenerate(order);

      const now = new Date();
      const expectedExpirationDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      // Diferença aceitável de até 1 segundo para evitar falhas devido ao tempo de execução
      expect(
        Math.abs(result.expirationDate.getTime() - expectedExpirationDate.getTime())
      ).toBeLessThanOrEqual(1000);
    });
  });

  describe('createOrderWithPix', () => {
    it('should create a Pix order with the expected data', async () => {
      const result = await (sut as any).createOrderWithPix(order);

      expect(result).toBeDefined();
      expect(result.paymentMethod).toBe('Pix');
      expect(result.pixUrl).toBe('https://example.com/pix'); // Verificar valores mockados
      expect(result.pixCode).toBe('1234567890'); // Verificar valores mockados
      expect(result.expirationDate).toBeInstanceOf(Date);
    });
  });
});
