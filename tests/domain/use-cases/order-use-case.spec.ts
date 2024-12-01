import { TokenHandler } from '@/application/helpers';
import { OrderManager } from '@/domain/use-cases';
import { OrderServiceError } from '@/domain/errors';
import { OrderRepository } from '@/infra/repos/mysql';
import { mock, MockProxy } from 'jest-mock-extended';

describe('OrderManager', () => {
  let sut: OrderManager;
  let mockOrderRepo: MockProxy<OrderRepository>;
  let mockTokenHandler: MockProxy<TokenHandler>;

  beforeEach(() => {
    mockOrderRepo = mock<OrderRepository>();
    mockTokenHandler = mock<TokenHandler>();
    sut = new OrderManager(mockOrderRepo, mockTokenHandler);
  });

  describe('calculateOrderValues', () => {
    it('should calculate the order values correctly', () => {
      const orderData = [
        {
          id: 1,
          orderId: 'abc123',
          status: 'pending',
          payments: [],
          createdAt: '2024-10-19',
          client: null,
          orderProducts: [
            { price: 10, count: 2, ingredientProducts: [] },
          ],
          totalPrice: 20,
        },
      ];

      const result = sut.calculateOrderValues(orderData as any);
      expect(result[0]).toBeDefined();
      expect(result[0]?.totalPrice).toBe(20);
    });

    it('should calculate the order values including ingredients correctly', () => {
      const orderData = [
        {
          id: 1,
          orderId: 'abc123',
          status: 'pending',
          payments: [],
          createdAt: '2024-10-19',
          client: null,
          orderProducts: [
            { price: 10, count: 2, ingredientProducts: [{ price: 5, count: 2 }] },
          ],
          totalPrice: 0, // será recalculado
        },
      ];

      const result = sut.calculateOrderValues(orderData as any);
      expect(result[0]?.totalPrice).toBe(30); // 20 (produtos) + 10 (ingredientes)
    });

    it('should throw an error if orderData is not provided', () => {
      expect(() => sut.calculateOrderValues(null as any)).toThrow(
        new OrderServiceError(
          new Error('Order data not found to calculate total price')
        )
      );
    });
  });

  describe('calculateOrderValue', () => {
    it('should calculate the total price correctly', () => {
      const orderData = {
        id: 1,
        orderId: 'abc123',
        status: 'pending',
        payments: [],
        createdAt: '2024-10-19',
        client: null,
        orderProducts: [
          { price: 10, count: 2, ingredientProducts: [] },
        ],
        totalPrice: 20,
      };

      const result = sut.calculateOrderValue(orderData as any);
      expect(result.totalPrice).toBe(20);
    });

    it('should calculate the total price including ingredients', () => {
      const orderData = {
        id: 1,
        orderId: 'abc123',
        status: 'pending',
        payments: [],
        createdAt: '2024-10-19',
        client: null,
        orderProducts: [
          { price: 10, count: 2, ingredientProducts: [{ price: 5, count: 2 }] },
        ],
        totalPrice: 0, // deve ser recalculado
      };

      const result = sut.calculateOrderValue(orderData as any);
      expect(result.totalPrice).toBe(30); // 20 (produtos) + 10 (ingredientes)
    });

    it('should throw an error if orderData is not provided', () => {
      expect(() => sut.calculateOrderValue(null as any)).toThrow(
        new OrderServiceError(
          new Error('Order data not found to calculate total price')
        )
      );
    });
  });

  describe('validateOrderStatusRule', () => {
    it('should return false if old status not found', () => {
      const order = {
        status: 'any_status',
        payments: [{ status: 'Concluido' }],
      };

      const result = sut.validateOrderStatusRule(order, 'Em Preparação');
      expect(result).toBe(false);
    });

    it('should return false if new status is equal Em "Preparação" and old status not "Recebido"', () => {
      const order = {
        status: 'Pronto',
        payments: [{ status: 'Concluido' }],
      };

      const result = sut.validateOrderStatusRule(order, 'Em Preparação');
      expect(result).toBe(false);
    });

    it('should return false if new status is equal "Pronto" or old status is equal "Finalizado"', () => {
      const order = {
        status: 'Pronto',
        payments: [{ status: 'Concluido' }],
      };

      const result = sut.validateOrderStatusRule(order, '');
      expect(result).toBe(false);
    });

    it('should return false if new status is equal "Finalizado" or old status not "Pronto"', () => {
      const order = {
        status: 'Em Preparação',
        payments: [{ status: 'Concluido' }],
      };

      const result = sut.validateOrderStatusRule(order, 'Finalizado');
      expect(result).toBe(false);
    });

    it('should return true for a valid status change', () => {
      const order = {
        status: 'Recebido',
        payments: [{ status: 'Concluido' }],
      };

      const result = sut.validateOrderStatusRule(order, 'Em Preparação');
      expect(result).toBe(true);
    });

    it('should return false for an invalid status change', () => {
      const order = {
        status: 'Pronto',
        payments: [{ status: 'Concluido' }],
      };

      const result = sut.validateOrderStatusRule(order, 'Recebido');
      expect(result).toBe(false);
    });

    it('should return false for changing from "Finalizado" to any other status', () => {
      const order = {
        status: 'Finalizado',
        payments: [{ status: 'Concluido' }],
      };

      const result = sut.validateOrderStatusRule(order, 'Pronto');
      expect(result).toBe(false);
    });

    it('should return false for changing from "Em Preparação" to "Pronto"', () => {
      const order = {
        status: 'Em Preparação',
        payments: [{ status: 'Completado' }],
      };

      const result = sut.validateOrderStatusRule(order, 'Recebido');
      expect(result).toBe(false);
    });
  });

  describe('saveOrder', () => {
    it('should save the order and return the result', async () => {
      const orderData = { orderId: null };
      const savedOrder = { id: 1, status: 'pending', orderId: '123' };
      mockTokenHandler.generateUuid.mockReturnValue('123');
      mockOrderRepo.saveOrder.mockResolvedValue(savedOrder as any);

      const result = await sut.saveOrder(orderData as any);
      expect(result).toBe(savedOrder);
      expect(mockTokenHandler.generateUuid).toHaveBeenCalled();
    });

    it('should throw an error if the order is not saved', async () => {
      const orderData = { orderId: null };
      mockOrderRepo.saveOrder.mockResolvedValue(undefined);

      await expect(sut.saveOrder(orderData as any)).rejects.toThrow(
        new Error('Cant insert order')
      );
    });

    it('should throw an error if saveOrder throws an exception', async () => {
      const orderData = { orderId: null };
      mockOrderRepo.saveOrder.mockRejectedValue(new Error('Database error'));

      await expect(sut.saveOrder(orderData as any)).rejects.toThrow('Database error');
    });
  });

  describe('saveOrderProduct', () => {
    it('should save the order product and return the result', async () => {
      const productOrderData = { productId: 'product1' };
      const savedProductOrder = { productId: 'product1' };
      mockOrderRepo.saveOrderProduct.mockResolvedValue(savedProductOrder as any);

      const result = await sut.saveOrderProduct(productOrderData as any);
      expect(result).toBe(savedProductOrder);
    });

    it('should throw an error if the order product is not saved', async () => {
      const productOrderData = { productId: 'product1' };
      mockOrderRepo.saveOrderProduct.mockResolvedValue(undefined);

      await expect(sut.saveOrderProduct(productOrderData as any)).rejects.toThrow(
        new Error('Cant insert product order')
      );
    });

    it('should throw an error if saveOrderProduct throws an exception', async () => {
      const productOrderData = { productId: 'product1' };
      mockOrderRepo.saveOrderProduct.mockRejectedValue(new Error('Database error'));

      await expect(sut.saveOrderProduct(productOrderData as any)).rejects.toThrow('Database error');
    });
  });

  describe('saveIngredientProduct', () => {
    it('should save the ingredient product and return the result', async () => {
      const ingredientProductData = { ingredientId: 'ingredient1' };
      const savedIngredientProduct = { ingredientId: 'ingredient1' };
      mockOrderRepo.saveIngredientProduct.mockResolvedValue(savedIngredientProduct as any);

      const result = await sut.saveIngredientProduct(ingredientProductData as any);
      expect(result).toBe(savedIngredientProduct);
    });

    it('should throw an error if the ingredient product is not saved', async () => {
      const ingredientProductData = { ingredientId: 'ingredient1' };
      mockOrderRepo.saveIngredientProduct.mockResolvedValue(undefined);

      await expect(
        sut.saveIngredientProduct(ingredientProductData as any)
      ).rejects.toThrow(new Error('Cant insert ingredient product'));
    });

    it('should throw an error if saveIngredientProduct throws an exception', async () => {
      const ingredientProductData = { ingredientId: 'ingredient1' };
      mockOrderRepo.saveIngredientProduct.mockRejectedValue(new Error('Database error'));

      await expect(sut.saveIngredientProduct(ingredientProductData as any)).rejects.toThrow('Database error');
    });
  });
});
