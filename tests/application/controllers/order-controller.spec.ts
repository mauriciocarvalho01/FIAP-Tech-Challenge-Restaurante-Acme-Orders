import { MessageBroker } from '@/domain/contracts/message-broker';
import { OrderController } from '@/application/controllers/order-controller'; // Ajuste o caminho conforme necessário
import { OrderRepository, RegisterRepository } from '@/infra/repos/mysql';
import { Validator } from '@/application/validation';
import { OrderService } from '@/domain/contracts/use-cases';
import { EntityError, TransactionError } from '@/infra/errors';
import { OrderServiceError } from '@/domain/errors';

import {
  ok,
  notFound,
  serverError,
  created,
  badRequest,
} from '@/application/helpers';
import { ordersMock } from '@/tests/application/controllers/mocks/orders';
import {
  OrderEntity,
  ProductEntity,
  OrderProductEntity,
  IngredientEntity,
  IngredientProductEntity,
} from '@/infra/repos/mysql/entities';

import { mock, MockProxy } from 'jest-mock-extended';

describe('sut', () => {
  let sut: OrderController;
  let mockOrderRepo: MockProxy<OrderRepository>;
  let mockRegisterRepo: MockProxy<RegisterRepository>;
  let mockValidator: MockProxy<Validator>;
  let mockOrderService: MockProxy<OrderService>;
  let mockMessageBroker: MockProxy<MessageBroker>;

  beforeEach(() => {
    mockOrderRepo = mock();
    mockRegisterRepo = mock();
    mockValidator = mock();
    mockOrderService = mock();
    mockMessageBroker = mock();

    sut = new OrderController(
      mockValidator,
      mockRegisterRepo,
      mockOrderRepo,
      mockOrderService,
      mockMessageBroker
    );
  });

  describe('handleGetOrders', () => {
    it('should return orders successfully', async () => {
      mockOrderRepo.findOrders.mockResolvedValue(ordersMock);
      mockOrderService.calculateOrderValues.mockReturnValue(ordersMock);

      const response = await sut.handleGetOrders();
      expect(response).toEqual(ok(ordersMock));
    });

    it('should return not found when no orders exist', async () => {
      mockOrderRepo.findOrders.mockResolvedValue(undefined);

      const response = await sut.handleGetOrders();
      expect(response).toEqual(notFound());
    });

    it('should return bad request when OrderServiceError occurs', async () => {
      const orderServiceError = new OrderServiceError(
        new Error('Order service error')
      );
      mockOrderRepo.findOrders.mockRejectedValue(orderServiceError);

      const response = await sut.handleGetOrders();
      expect(response).toEqual(
        badRequest(new Error(orderServiceError.message))
      );
    });

    it('should return bad request when EntityError occurs', async () => {
      const entityError = new EntityError('Entity error');
      mockOrderRepo.findOrders.mockRejectedValue(entityError);

      const response = await sut.handleGetOrders();
      expect(response).toEqual(badRequest(new Error(entityError.message)));
    });

    it('should return server error when an unknown error occurs', async () => {
      const error = new Error('Some unknown error');
      mockOrderRepo.findOrders.mockRejectedValue(error);

      const response = await sut.handleGetOrders();
      expect(response).toEqual(serverError(error));
    });
  });

  describe('handleGetOrder', () => {
    it('should return an order successfully', async () => {
      mockOrderRepo.findOrder.mockResolvedValue(ordersMock[0]);
      mockOrderService.calculateOrderValue.mockReturnValue(ordersMock[0]);

      const response = await sut.handleGetOrder({ orderId: '1' });
      expect(response).toEqual(ok(ordersMock[0]));
    });

    it('should return not found when order does not exist', async () => {
      mockOrderRepo.findOrder.mockResolvedValue(undefined);

      const response = await sut.handleGetOrder({ orderId: '1' });
      expect(response).toEqual(notFound());
    });

    it('should return bad request when OrderServiceError occurs', async () => {
      const orderServiceError = new OrderServiceError(
        new Error('Order service error')
      );
      mockOrderRepo.findOrder.mockResolvedValue(ordersMock[0]);
      mockOrderService.calculateOrderValue.mockImplementation(() => {
        throw orderServiceError;
      });

      const response = await sut.handleGetOrder({ orderId: '1' });
      expect(response).toEqual(
        badRequest(new Error(orderServiceError.message))
      );
    });

    it('should return bad request when EntityError occurs', async () => {
      const entityError = new EntityError('Entity error');
      mockOrderRepo.findOrder.mockResolvedValue(ordersMock[0]);
      mockOrderService.calculateOrderValue.mockImplementation(() => {
        throw entityError;
      });

      const response = await sut.handleGetOrder({ orderId: '1' });
      expect(response).toEqual(badRequest(new Error(entityError.message)));
    });

    it('should return server error when an unknown error occurs', async () => {
      const error = new Error('Some unknown error');
      mockOrderRepo.findOrder.mockRejectedValue(error);

      const response = await sut.handleGetOrder({ orderId: '1' });
      expect(response).toEqual(serverError(error));
    });
  });

  describe('handleCreateOrder', () => {
    it('should create an order successfully', async () => {
      const orderData = {
        clientId: '1',
        orderProducts: [
          {
            productId: '1',
            count: 2,
            ingredientProducts: [{ ingredientId: '1', count: 1 }],
          },
        ], // Incluindo ingredientProducts
      };

      // Definindo a entidade completa de um pedido
      const orderEntity = {
        id: 1,
        orderId: '1',
        status: 'Recebido',
        payment: { status: 'Pendente' },
        payments: [], // Adicionando 'payments'
        createdAt: new Date().toISOString(),
        orderProducts: [],
        totalPrice: 100,
      };

      const clientData = {
        clientId: '1',
        name: 'John Doe',
        cpf: '123.456.789-00',
        email: 'johndoe@example.com',
      };

      const productData = {
        id: 1,
        productId: '1',
        name: 'Produto Exemplo',
        description: 'Descrição do produto',
        price: 50,
        category: {
          id: 1,
          productId: '1',
          name: 'Categoria Exemplo',
          description: 'Descrição da categoria',
          price: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };

      const ingredientData = {
        id: 1,
        ingredientId: '1',
        name: 'Ingrediente Exemplo',
        description: 'Descrição do ingrediente',
        price: 10,
      };

      mockValidator.validate.mockResolvedValueOnce([]);
      mockOrderRepo.prepareTransaction.mockResolvedValue(undefined);
      mockOrderRepo.openTransaction.mockResolvedValue(undefined);
      mockOrderRepo.getProductEntity.mockReturnValue(new ProductEntity());
      mockOrderRepo.getOrderProductEntity.mockReturnValue(
        new OrderProductEntity()
      );
      mockOrderRepo.getOrderEntity.mockReturnValue(new OrderEntity());
      mockOrderRepo.getIngredientProductEntity.mockReturnValue(
        new IngredientProductEntity()
      );
      mockOrderRepo.getIngredientEntity.mockReturnValue(new IngredientEntity());
      mockOrderRepo.findProduct.mockResolvedValue(productData);
      mockOrderRepo.findIngredient.mockResolvedValue(ingredientData);
      mockRegisterRepo.findClientById.mockResolvedValue(clientData);
      mockOrderService.saveOrder.mockResolvedValue(orderEntity);
      mockOrderService.calculateOrderValue.mockReturnValue(orderEntity);
      mockOrderRepo.commit.mockResolvedValue(undefined);

      sut.handleGetOrder = jest.fn().mockResolvedValue({
        statusCode: 200,
        data: orderEntity,
      });

      const response = await sut.handleCreateOrder(orderData);

      expect(response).toEqual(created({ orderId: '1', status: 'Recebido' }));
    });

    it('should return bad request if no products', async () => {
      const orderData = { clientId: '1', orderProducts: [] };

      const response = await sut.handleCreateOrder(orderData);
      expect(response).toEqual(
        badRequest(new Error('Cannot save order: orderProducts not found'))
      );
    });

    it('should handle errors during order creation', async () => {
      const orderData = {
        clientId: '1',
        orderProducts: [{ productId: '1', count: 2 }],
      };
      const clientData = {
        clientId: '1',
        name: 'John Doe',
        cpf: '123.456.789-00',
        email: 'johndoe@example.com',
      };
      const error = new Error('Some error');
      mockValidator.validate.mockResolvedValueOnce([]);
      mockOrderRepo.prepareTransaction.mockResolvedValue(undefined);
      mockOrderRepo.openTransaction.mockResolvedValue(undefined);
      mockOrderRepo.getOrderEntity.mockReturnValue({});
      mockRegisterRepo.findClientById.mockResolvedValue(clientData);
      mockOrderService.saveOrder.mockRejectedValue(error);

      const response = await sut.handleCreateOrder(orderData);
      expect(response).toEqual(serverError(error));
    });

    it('should return bad request if validation fails', async () => {
      const orderData = {
        clientId: '1',
        orderProducts: [{ productId: '1', count: 2 }],
      };
      const clientData = {
        clientId: '1',
        name: 'John Doe',
        cpf: '123.456.789-00',
        email: 'johndoe@example.com',
      };

      const validationErrors = ['Validation error 1', 'Validation error 2'];
      mockValidator.validate.mockResolvedValueOnce(validationErrors);
      mockOrderRepo.prepareTransaction.mockResolvedValue(undefined);
      mockOrderRepo.openTransaction.mockResolvedValue(undefined);
      mockOrderRepo.getOrderEntity.mockReturnValue({});
      mockRegisterRepo.findClientById.mockResolvedValue(clientData);

      const response = await sut.handleCreateOrder(orderData);
      expect(response).toEqual(
        badRequest(new Error(JSON.stringify(validationErrors)))
      );
    });

    it('should return bad request if saveOrder fails', async () => {
      const orderData = {
        clientId: '1',
        orderProducts: [{ productId: '1', count: 2 }],
      };
      const clientData = {
        clientId: '1',
        name: 'John Doe',
        cpf: '123.456.789-00',
        email: 'johndoe@example.com',
      };

      mockValidator.validate.mockResolvedValueOnce([]);
      mockOrderRepo.prepareTransaction.mockResolvedValue(undefined);
      mockOrderRepo.openTransaction.mockResolvedValue(undefined);
      mockOrderRepo.getOrderEntity.mockReturnValue({});
      mockRegisterRepo.findClientById.mockResolvedValue(clientData);
      mockOrderService.saveOrder.mockResolvedValue(undefined);
      const response = await sut.handleCreateOrder(orderData);
      expect(response).toEqual(badRequest(new Error('Cannot save order')));
    });

    it('should return bad request if product not found', async () => {
      const orderData = {
        clientId: '1',
        orderProducts: [{ productId: '1', count: 2 }],
      };
      const clientData = {
        clientId: '1',
        name: 'John Doe',
        cpf: '123.456.789-00',
        email: 'johndoe@example.com',
      };
      const mockProduct = {
        id: 1,
        productId: '1',
        name: 'Produto Exemplo',
        description: 'Descrição do produto',
        price: 50,
        category: {
          id: 1,
          productId: '1',
          name: 'Categoria Exemplo',
          description: 'Descrição da categoria',
          price: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };

      const orderEntity = {
        id: 1,
        orderId: '1',
        status: 'Recebido',
        payment: { status: 'Pendente' },
        payments: [],
        createdAt: new Date().toISOString(),
        orderProducts: [],
        totalPrice: 100,
      };

      // Usando o produto simulado
      mockOrderRepo.getIngredientProductEntity.mockReturnValue(
        new IngredientProductEntity()
      );
      mockOrderService.saveOrder.mockResolvedValue(orderEntity);
      mockOrderRepo.getIngredientEntity.mockReturnValue(new IngredientEntity());
      mockOrderRepo.findProduct.mockResolvedValue(mockProduct); // Produto encontrado
      mockValidator.validate.mockResolvedValueOnce([]);
      mockOrderRepo.prepareTransaction.mockResolvedValue(undefined);
      mockOrderRepo.openTransaction.mockResolvedValue(undefined);
      mockOrderRepo.getOrderEntity.mockReturnValue({});
      mockRegisterRepo.findClientById.mockResolvedValue(clientData);
      mockOrderRepo.findProduct.mockResolvedValue(undefined); // Simulando que o produto não foi encontrado

      const response = await sut.handleCreateOrder(orderData);
      expect(response).toEqual(
        badRequest(new Error(`Product with ID 1 not found`))
      );
    });

    it('should return bad request if order product count is invalid', async () => {
      const orderData = {
        clientId: '1',
        orderProducts: [{ productId: '1', count: -1 }], // Contagem inválida
      };
      const clientData = {
        clientId: '1',
        name: 'John Doe',
        cpf: '123.456.789-00',
        email: 'johndoe@example.com',
      };

      const productData = {
        id: 1,
        productId: '1',
        name: 'Produto Exemplo',
        description: 'Descrição do produto',
        price: 50,
        category: {
          id: 1,
          productId: '1',
          name: 'Categoria Exemplo',
          description: 'Descrição da categoria',
          price: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };
      const orderEntity = {
        id: 1,
        orderId: '1',
        status: 'Recebido',
        payment: { status: 'Pendente' },
        payments: [],
        createdAt: new Date().toISOString(),
        orderProducts: [],
        totalPrice: 100,
      };

      mockOrderService.saveOrder.mockResolvedValue(orderEntity);
      mockValidator.validate.mockResolvedValueOnce([]);
      mockOrderRepo.prepareTransaction.mockResolvedValue(undefined);
      mockOrderRepo.openTransaction.mockResolvedValue(undefined);
      mockOrderRepo.getProductEntity.mockReturnValue(new ProductEntity());
      mockOrderRepo.getOrderProductEntity.mockReturnValue(
        new OrderProductEntity()
      );
      mockOrderRepo.getOrderEntity.mockReturnValue(new OrderEntity());
      mockRegisterRepo.findClientById.mockResolvedValue(clientData);
      mockOrderRepo.findProduct.mockResolvedValue(productData); // Produto encontrado

      const response = await sut.handleCreateOrder(orderData);
      expect(response).toEqual(
        badRequest(new Error(`Product with ID 1 could not count as -1`))
      );
    });

    it('should return bad request if ingredient not found', async () => {
      const orderData = {
        clientId: '1',
        orderProducts: [
          {
            productId: '1',
            count: 2,
            ingredientProducts: [{ ingredientId: '1', count: 1 }],
          },
        ],
      };
      const clientData = {
        clientId: '1',
        name: 'John Doe',
        cpf: '123.456.789-00',
        email: 'johndoe@example.com',
      };

      const productData = {
        id: 1,
        productId: '1',
        name: 'Produto Exemplo',
        description: 'Descrição do produto',
        price: 50,
        category: {
          id: 1,
          productId: '1',
          name: 'Categoria Exemplo',
          description: 'Descrição da categoria',
          price: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };

      const orderProductData = {
        id: 1, // Definindo um ID
        count: 2, // Usando o count do produto
        order: { orderId: '1' }, // Simulando o objeto de pedido
        product: productData, // Produto encontrado anteriormente
      };
      const orderEntity = {
        id: 1,
        orderId: '1',
        status: 'Recebido',
        payment: { status: 'Pendente' },
        payments: [],
        createdAt: new Date().toISOString(),
        orderProducts: [],
        totalPrice: 100,
      };

      mockOrderService.saveOrder.mockResolvedValue(orderEntity);
      mockValidator.validate.mockResolvedValueOnce([]);
      mockOrderRepo.prepareTransaction.mockResolvedValue(undefined);
      mockOrderRepo.openTransaction.mockResolvedValue(undefined);
      mockOrderRepo.getOrderEntity.mockReturnValue(new OrderEntity());
      mockOrderRepo.getProductEntity.mockReturnValue(new ProductEntity());
      mockOrderRepo.getOrderProductEntity.mockReturnValue(
        new OrderProductEntity()
      );
      mockRegisterRepo.findClientById.mockResolvedValue(clientData);
      mockOrderRepo.findProduct.mockResolvedValue(productData); // Produto encontrado
      mockOrderService.saveOrderProduct.mockResolvedValue(orderProductData);

      mockOrderRepo.findIngredient.mockResolvedValue(undefined); // Simulando que o ingrediente foi encontrado

      const response = await sut.handleCreateOrder(orderData);
      expect(response).toEqual(
        badRequest(new Error(`Ingredient with ID 1 not found`))
      );
    });

    it('should return bad request if ingredient product count is invalid', async () => {
      const orderData = {
        clientId: '1',
        orderProducts: [
          {
            productId: '1',
            count: 2,
            ingredientProducts: [{ ingredientId: '1', count: -1 }], // Contagem inválida
          },
        ],
      };

      const clientData = {
        clientId: '1',
        name: 'John Doe',
        cpf: '123.456.789-00',
        email: 'johndoe@example.com',
      };

      const productData = {
        id: 1,
        productId: '1',
        name: 'Produto Exemplo',
        description: 'Descrição do produto',
        price: 50,
        category: {
          id: 1,
          productId: '1',
          name: 'Categoria Exemplo',
          description: 'Descrição da categoria',
          price: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };

      const orderProductData = {
        id: 1, // Definindo um ID
        count: 2, // Usando o count do produto
        order: { orderId: '1' }, // Simulando o objeto de pedido
        product: productData, // Produto encontrado anteriormente
      };

      const ingredientData = {
        id: 1,
        ingredientId: '1',
        name: 'Ingrediente Exemplo',
        description: 'Descrição do ingrediente',
        price: 10,
      };

      const orderEntity = {
        id: 1,
        orderId: '1',
        status: 'Recebido',
        payment: { status: 'Pendente' },
        payments: [],
        createdAt: new Date().toISOString(),
        orderProducts: [],
        totalPrice: 100,
      };

      mockOrderService.saveOrder.mockResolvedValue(orderEntity);
      mockValidator.validate.mockResolvedValueOnce([]);
      mockOrderRepo.prepareTransaction.mockResolvedValue(undefined);
      mockOrderRepo.openTransaction.mockResolvedValue(undefined);
      mockOrderRepo.getOrderEntity.mockReturnValue(new OrderEntity());
      mockOrderRepo.getProductEntity.mockReturnValue(new ProductEntity());
      mockOrderRepo.getOrderProductEntity.mockReturnValue(
        new OrderProductEntity()
      );
      mockOrderRepo.getIngredientEntity.mockReturnValue(new IngredientEntity());
      mockOrderRepo.getIngredientProductEntity.mockReturnValue(
        new IngredientProductEntity()
      );
      mockRegisterRepo.findClientById.mockResolvedValue(clientData);
      mockOrderRepo.findProduct.mockResolvedValue(productData); // Produto encontrado
      mockOrderService.saveOrderProduct.mockResolvedValue(orderProductData);

      // Simulando que o ingrediente foi encontrado, mas com contagem inválida
      mockOrderRepo.findIngredient.mockResolvedValue(ingredientData);

      const response = await sut.handleCreateOrder(orderData);
      expect(response).toEqual(
        badRequest(new Error(`Product with ID 1 could not count as -1`))
      );
    });

    it('should send a message to the payment queue if order retrieval is successful', async () => {
      const orderData = {
        clientId: '1',
        orderProducts: [
          {
            productId: '1',
            count: 2,
            ingredientProducts: [{ ingredientId: '1', count: 1 }],
          },
        ], // Incluindo ingredientProducts
      };

      // Definindo a entidade completa de um pedido
      const orderEntity = {
        id: 1,
        orderId: '1',
        status: 'Recebido',
        client:{
          clientId: '1'
        },
        createdAt: new Date().toISOString(),
        orderProducts: [],
        totalPrice: 100,
      };

      const clientData = {
        clientId: '1',
        name: 'John Doe',
        cpf: '123.456.789-00',
        email: 'johndoe@example.com',
      };

      const productData = {
        id: 1,
        productId: '1',
        name: 'Produto Exemplo',
        description: 'Descrição do produto',
        price: 50,
        category: {
          id: 1,
          productId: '1',
          name: 'Categoria Exemplo',
          description: 'Descrição da categoria',
          price: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };

      const ingredientData = {
        id: 1,
        ingredientId: '1',
        name: 'Ingrediente Exemplo',
        description: 'Descrição do ingrediente',
        price: 10,
      };

      mockValidator.validate.mockResolvedValueOnce([]);
      mockOrderRepo.prepareTransaction.mockResolvedValue(undefined);
      mockOrderRepo.openTransaction.mockResolvedValue(undefined);
      mockOrderRepo.getProductEntity.mockReturnValue(new ProductEntity());
      mockOrderRepo.getOrderProductEntity.mockReturnValue(
        new OrderProductEntity()
      );
      mockOrderRepo.getOrderEntity.mockReturnValue(new OrderEntity());
      mockOrderRepo.getIngredientProductEntity.mockReturnValue(
        new IngredientProductEntity()
      );
      mockOrderRepo.getIngredientEntity.mockReturnValue(new IngredientEntity());
      mockOrderRepo.findProduct.mockResolvedValue(productData);
      mockOrderRepo.findIngredient.mockResolvedValue(ingredientData);
      mockRegisterRepo.findClientById.mockResolvedValue(clientData);
      mockOrderService.saveOrder.mockResolvedValue(orderEntity);
      mockOrderRepo.commit.mockResolvedValue(undefined);

      sut.handleGetOrder = jest.fn().mockResolvedValue({
        statusCode: 200,
        data: orderEntity,
      });

      mockMessageBroker.getChannel.mockReturnValue('paymentChannel');
      mockMessageBroker.sendToQueue.mockResolvedValueOnce(true);

      const response = await sut.handleCreateOrder(orderData);

      expect(mockMessageBroker.getChannel).toHaveBeenCalledWith('payment');
      expect(mockMessageBroker.sendToQueue).toHaveBeenCalledWith('paymentChannel', {
        queueName: 'payment',
        message: {
          paymentMethod: 'Pix',
          order: {
            orderId: orderEntity.orderId,
            status: orderEntity.status,
            totalValue: orderEntity.totalPrice,
            clientId: orderEntity.client?.clientId,
          },
        },
      });

      expect(response).toEqual(created({ orderId: '1', status: 'Recebido' }));
    });

    it('should return a bad request if order retrieval fails', async () => {
      const orderData = {
        clientId: '1',
        orderProducts: [
          {
            productId: '1',
            count: 2,
            ingredientProducts: [{ ingredientId: '1', count: 1 }],
          },
        ],
      };

      const orderEntity = {
        id: 1,
        orderId: '1',
        status: 'Recebido',
        client: {
          clientId: '1',
        },
        createdAt: new Date().toISOString(),
        orderProducts: [],
        totalPrice: 100,
      };

      const clientData = {
        clientId: '1',
        name: 'John Doe',
        cpf: '123.456.789-00',
        email: 'johndoe@example.com',
      };

      const productData = {
        id: 1,
        productId: '1',
        name: 'Produto Exemplo',
        description: 'Descrição do produto',
        price: 50,
        category: {
          id: 1,
          productId: '1',
          name: 'Categoria Exemplo',
          description: 'Descrição da categoria',
          price: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };

      const ingredientData = {
        id: 1,
        ingredientId: '1',
        name: 'Ingrediente Exemplo',
        description: 'Descrição do ingrediente',
        price: 10,
      };

      // Configurando os mocks
      mockValidator.validate.mockResolvedValueOnce([]);
      mockOrderRepo.prepareTransaction.mockResolvedValue(undefined);
      mockOrderRepo.openTransaction.mockResolvedValue(undefined);
      mockOrderRepo.getProductEntity.mockReturnValue(new ProductEntity());
      mockOrderRepo.getOrderProductEntity.mockReturnValue(new OrderProductEntity());
      mockOrderRepo.getOrderEntity.mockReturnValue(new OrderEntity());
      mockOrderRepo.getIngredientProductEntity.mockReturnValue(new IngredientProductEntity());
      mockOrderRepo.getIngredientEntity.mockReturnValue(new IngredientEntity());
      mockOrderRepo.findProduct.mockResolvedValue(productData);
      mockOrderRepo.findIngredient.mockResolvedValue(ingredientData);
      mockRegisterRepo.findClientById.mockResolvedValue(clientData);
      mockOrderService.saveOrder.mockResolvedValue(orderEntity);
      mockOrderRepo.commit.mockResolvedValue(undefined);

      // Configurando handleGetOrder para rejeitar
      const errorMessage = `Order ${orderEntity.orderId} not found`;
      sut.handleGetOrder = jest.fn().mockRejectedValue(new Error(errorMessage));

      // Executando o método
      const response = await sut.handleCreateOrder(orderData);

      // Verificando a resposta
      expect(response).toEqual(badRequest(new Error(errorMessage)));
    });


    it('should handle transaction errors correctly', async () => {
      const orderData = {
        clientId: '1',
        orderProducts: [{ productId: '1', count: 2 }],
      };

      const clientData = {
        clientId: '1',
        name: 'John Doe',
        cpf: '123.456.789-00',
        email: 'johndoe@example.com',
      };

      const productData = {
        id: 1,
        productId: '1',
        name: 'Produto Exemplo',
        description: 'Descrição do produto',
        price: 50,
        category: {
          id: 1,
          productId: '1',
          name: 'Categoria Exemplo',
          description: 'Descrição da categoria',
          price: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };

      const orderProductData = {
        id: 1, // Definindo um ID
        count: 2, // Usando o count do produto
        order: { orderId: '1' }, // Simulando o objeto de pedido
        product: productData, // Produto encontrado anteriormente
      };

      // Retornando um objeto com todas as propriedades necessárias
      const orderOutput = {
        id: 1, // Defina um ID válido
        status: 'Pendente', // Defina um status padrão
        orderId: '1',
      };

      // Mockando a validação, transações e dados do cliente
      mockValidator.validate.mockResolvedValueOnce([]);
      mockOrderRepo.prepareTransaction.mockResolvedValue(undefined);
      mockOrderRepo.openTransaction.mockResolvedValue(undefined);
      mockOrderRepo.getOrderEntity.mockReturnValue(new OrderEntity());
      mockOrderRepo.getProductEntity.mockReturnValue(new ProductEntity());
      mockOrderRepo.getOrderProductEntity.mockReturnValue(
        new OrderProductEntity()
      );
      mockOrderRepo.getIngredientEntity.mockReturnValue(new IngredientEntity());
      mockOrderRepo.getIngredientProductEntity.mockReturnValue(
        new IngredientProductEntity()
      );
      mockRegisterRepo.findClientById.mockResolvedValue(clientData);
      mockOrderRepo.findProduct.mockResolvedValue(productData); // Produto encontrado
      mockOrderService.saveOrderProduct.mockResolvedValue(orderProductData);

      mockOrderService.saveOrder.mockResolvedValue(orderOutput);

      // Simulando um erro de transação ao salvar o produto do pedido
      mockOrderService.saveOrderProduct.mockRejectedValue(
        new TransactionError(new Error('Transaction failed'))
      );

      const response = await sut.handleCreateOrder(orderData);
      expect(response).toEqual(badRequest(new Error('Transaction failed')));
    });
  });

  describe('handleUpdateOrder', () => {
    it('should update an order successfully', async () => {
      const orderData = {
        orderId: '1',
        orderProducts: [{ productId: '1', count: 2 }],
      };

      const orderEntity = {
        id: 1,
        orderId: '1',
        status: 'Recebido',
        payment: { status: 'Pendente' },
        payments: [],
        createdAt: new Date().toISOString(),
        orderProducts: [],
        totalPrice: 100,
      };

      const productData = {
        id: 1,
        productId: '1',
        name: 'Produto Exemplo',
        description: 'Descrição do produto',
        price: 50,
        category: {
          id: 1,
          productId: '1',
          name: 'Categoria Exemplo',
          description: 'Descrição da categoria',
          price: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };

      mockOrderRepo.getProductEntity.mockReturnValue(new ProductEntity());
      mockOrderRepo.findProduct.mockResolvedValue(productData);

      mockOrderRepo.getOrderProductEntity.mockReturnValue(
        new OrderProductEntity()
      );
      mockOrderRepo.getOrderEntity.mockReturnValue(new OrderEntity());
      mockValidator.validate.mockResolvedValueOnce([]);
      mockOrderRepo.prepareTransaction.mockResolvedValue(undefined);
      mockOrderRepo.openTransaction.mockResolvedValue(undefined);
      mockOrderRepo.findOrder.mockResolvedValue(orderEntity);
      mockOrderService.validateOrderStatusRule.mockReturnValue(true);
      mockOrderService.saveOrder.mockResolvedValue(orderEntity);
      mockOrderRepo.commit.mockResolvedValue(undefined);

      sut.handleGetOrder = jest.fn().mockResolvedValue({
        statusCode: 200,
        data: orderEntity,
      });

      const response = await sut.handleUpdateOrder(orderData);
      expect(response).toEqual(
        ok({ orderId: '1', status: orderEntity.status })
      );
    });

    it('should delete order product if count is zero', async () => {
      const orderData = {
        orderId: '1',
        orderProducts: [{ productId: '1', count: 0 }], // Definindo a quantidade como zero
      };

      const orderEntity = {
        id: 1,
        orderId: '1',
        status: 'Recebido',
        payment: { status: 'Pendente' },
        payments: [],
        createdAt: new Date().toISOString(),
        orderProducts: [],
        totalPrice: 100,
      };

      const productData = {
        id: 1,
        productId: '1',
        name: 'Produto Exemplo',
        description: 'Descrição do produto',
        price: 50,
        category: {
          id: 1,
          productId: '1',
          name: 'Categoria Exemplo',
          description: 'Descrição da categoria',
          price: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };

      // Mocking necessário
      mockOrderRepo.getProductEntity.mockReturnValue(new ProductEntity());
      mockOrderRepo.getOrderProductEntity.mockReturnValue(
        new OrderProductEntity()
      );
      mockOrderRepo.findOrder.mockResolvedValue(orderEntity);
      mockOrderRepo.findProduct.mockResolvedValue(productData);
      mockOrderService.validateOrderStatusRule.mockReturnValue(true);

      mockOrderRepo.getOrderEntity.mockReturnValue(new OrderEntity());
      mockOrderRepo.commit.mockResolvedValue(undefined);
      mockOrderRepo.deleteOrderProduct.mockResolvedValue(undefined); // Mock para o delete

      sut.handleGetOrder = jest.fn().mockResolvedValue({
        statusCode: 200,
        data: orderEntity,
      });

      const response = await sut.handleUpdateOrder(orderData);

      expect(response).toEqual(
        ok({ orderId: '1', status: orderEntity.status })
      );
      expect(mockOrderRepo.deleteOrderProduct).toHaveBeenCalled(); // Verificando se o delete foi chamado
    });

    it('should return bad request if saveOrder fails', async () => {
      const orderData = {
        clientId: '1',
        orderProducts: [{ productId: '1', count: 2 }],
      };
      const clientData = {
        clientId: '1',
        name: 'John Doe',
        cpf: '123.456.789-00',
        email: 'johndoe@example.com',
      };

      mockValidator.validate.mockResolvedValueOnce([]);
      mockOrderRepo.prepareTransaction.mockResolvedValue(undefined);
      mockOrderRepo.openTransaction.mockResolvedValue(undefined);
      mockOrderRepo.getOrderEntity.mockReturnValue({});
      mockRegisterRepo.findClientById.mockResolvedValue(clientData);
      mockOrderService.saveOrder.mockResolvedValue(undefined);
      const response = await sut.handleCreateOrder(orderData);
      expect(response).toEqual(badRequest(new Error('Cannot save order')));
    });

    it('should save an ingredient product if count is greater than zero', async () => {
      const orderData = {
        orderId: '1',
        orderProducts: [
          {
            productId: '1',
            count: 2,
            ingredientProducts: [{ ingredientId: '1', count: 1 }],
          },
        ],
      };

      const orderEntity = {
        id: 1,
        orderId: '1',
        status: 'Recebido',
        payment: { status: 'Pendente' },
        payments: [],
        createdAt: new Date().toISOString(),
        orderProducts: [],
        totalPrice: 100,
      };

      const productData = {
        id: 1,
        productId: '1',
        name: 'Produto Exemplo',
        description: 'Descrição do produto',
        price: 50,
        category: {
          id: 1,
          productId: '1',
          name: 'Categoria Exemplo',
          description: 'Descrição da categoria',
          price: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };

      // Exemplo de objeto com todas as propriedades necessárias
      const ingredientData = {
        id: 1,
        ingredientId: '1', // Adicione a propriedade ingredientId
        name: 'Ingrediente Exemplo', // Adicione a propriedade name
        description: 'Descrição do ingrediente', // Adicione a propriedade description
        price: 10, // Adicione a propriedade price
      };

      // Mocking necessário
      mockOrderRepo.getIngredientProductEntity.mockReturnValue(
        new IngredientProductEntity()
      );
      mockOrderRepo.getIngredientEntity.mockReturnValue(new IngredientEntity());
      mockOrderRepo.getProductEntity.mockReturnValue(new ProductEntity());
      mockOrderRepo.getOrderProductEntity.mockReturnValue(
        new OrderProductEntity()
      );
      mockOrderRepo.findIngredient.mockResolvedValue(ingredientData);
      mockOrderRepo.findOrder.mockResolvedValue(orderEntity);
      mockOrderRepo.findProduct.mockResolvedValue(productData);
      mockOrderService.validateOrderStatusRule.mockReturnValue(true);

      mockOrderRepo.getOrderEntity.mockReturnValue(new OrderEntity());
      mockOrderRepo.getIngredientProductEntity.mockReturnValue(
        new IngredientProductEntity()
      );
      mockOrderService.saveIngredientProduct.mockResolvedValue(undefined); // Simular que salvou com sucesso

      sut.handleGetOrder = jest.fn().mockResolvedValue({
        statusCode: 200,
        data: orderEntity,
      });

      const response = await sut.handleUpdateOrder(orderData);

      expect(response).toEqual(
        ok({ orderId: '1', status: orderEntity.status })
      );
      expect(mockOrderService.saveIngredientProduct).toHaveBeenCalledTimes(1); // Verificar se o save foi chamado
    });

    it('should delete an ingredient product if count is zero', async () => {
      const orderData = {
        orderId: '1',
        orderProducts: [
          {
            productId: '1',
            count: 2,
            ingredientProducts: [{ ingredientId: '1', count: 0 }], // Definindo a quantidade como zero
          },
        ],
      };

      const orderEntity = {
        id: 1,
        orderId: '1',
        status: 'Recebido',
        payment: { status: 'Pendente' },
        payments: [],
        createdAt: new Date().toISOString(),
        orderProducts: [],
        totalPrice: 100,
      };

      const productData = {
        id: 1,
        productId: '1',
        name: 'Produto Exemplo',
        description: 'Descrição do produto',
        price: 50,
        category: {
          id: 1,
          productId: '1',
          name: 'Categoria Exemplo',
          description: 'Descrição da categoria',
          price: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };

      // Exemplo de objeto com todas as propriedades necessárias
      const ingredientData = {
        id: 1,
        ingredientId: '1', // Adicione a propriedade ingredientId
        name: 'Ingrediente Exemplo', // Adicione a propriedade name
        description: 'Descrição do ingrediente', // Adicione a propriedade description
        price: 10, // Adicione a propriedade price
      };

      // Mocking necessário
      mockOrderRepo.getProductEntity.mockReturnValue(new ProductEntity());
      mockOrderRepo.getIngredientProductEntity.mockReturnValue(
        new IngredientProductEntity()
      );
      mockOrderRepo.getIngredientEntity.mockReturnValue(new IngredientEntity());
      mockOrderRepo.findIngredient.mockResolvedValue(ingredientData);
      mockOrderRepo.findOrder.mockResolvedValue(orderEntity);
      mockOrderRepo.findProduct.mockResolvedValue(productData);
      mockOrderService.validateOrderStatusRule.mockReturnValue(true);

      mockOrderRepo.getOrderProductEntity.mockReturnValue(
        new OrderProductEntity()
      );
      mockOrderRepo.getOrderEntity.mockReturnValue(new OrderEntity());
      mockOrderRepo.deleteIngredientProduct.mockResolvedValue(undefined); // Mock para delete

      sut.handleGetOrder = jest.fn().mockResolvedValue({
        statusCode: 200,
        data: orderEntity,
      });

      const response = await sut.handleUpdateOrder(orderData);

      expect(response).toEqual(
        ok({ orderId: '1', status: orderEntity.status })
      );
      expect(mockOrderRepo.deleteIngredientProduct).toHaveBeenCalledTimes(1); // Verificar se o delete foi chamado
    });

    it('should return bad request if ingredient is not found', async () => {
      const orderData = {
        orderId: '1',
        orderProducts: [
          {
            productId: '1',
            count: 2,
            ingredientProducts: [{ ingredientId: '1', count: 1 }],
          },
        ],
      };

      const orderEntity = {
        id: 1,
        orderId: '1',
        status: 'Recebido',
        payment: { status: 'Pendente' },
        payments: [],
        createdAt: new Date().toISOString(),
        orderProducts: [],
        totalPrice: 100,
      };

      const productData = {
        id: 1,
        productId: '1',
        name: 'Produto Exemplo',
        description: 'Descrição do produto',
        price: 50,
        category: {
          id: 1,
          productId: '1',
          name: 'Categoria Exemplo',
          description: 'Descrição da categoria',
          price: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };

      // Mocking necessário
      mockOrderRepo.getProductEntity.mockReturnValue(new ProductEntity());
      mockOrderRepo.getIngredientProductEntity.mockReturnValue(
        new IngredientProductEntity()
      );
      mockOrderRepo.getIngredientEntity.mockReturnValue(new IngredientEntity());
      mockOrderRepo.findOrder.mockResolvedValue(orderEntity);
      mockOrderRepo.findProduct.mockResolvedValue(productData);
      mockOrderRepo.findIngredient.mockResolvedValue(undefined); // Ingrediente não encontrado
      mockOrderService.validateOrderStatusRule.mockReturnValue(true);

      mockOrderRepo.getOrderProductEntity.mockReturnValue(
        new OrderProductEntity()
      );
      mockOrderRepo.getOrderEntity.mockReturnValue(new OrderEntity());

      const response = await sut.handleUpdateOrder(orderData);

      expect(response).toEqual(
        badRequest(new Error(`Ingredient with ID 1 not found`))
      );
    });

    it('should return bad request if orderId is not found', async () => {
      const orderData = { orderId: '', orderProducts: [] };

      const response = await sut.handleUpdateOrder(orderData);
      expect(response).toEqual(
        badRequest(new Error('Cannot update order: orderId not found'))
      );
    });

    it('should return bad request if orderProducts is not found', async () => {
      const orderData = { orderId: '1', orderProducts: [] };

      const response = await sut.handleUpdateOrder(orderData);
      expect(response).toEqual(
        badRequest(new Error('Cannot update order: orderProducts not found'))
      );
    });

    it('should return bad request if order is not found', async () => {
      const orderData = {
        orderId: '1',
        orderProducts: [{ productId: '1', count: 2 }],
      };

      const orderEntity = {
        id: 1,
        orderId: '1',
        status: 'Recebido',
        payment: { status: 'Pendente' },
        payments: [],
        createdAt: new Date().toISOString(),
        orderProducts: [],
        totalPrice: 100,
      };

      // Usando o produto simulado
      mockOrderService.saveOrder.mockResolvedValue(orderEntity);
      mockOrderRepo.findOrder.mockResolvedValue(undefined);

      const response = await sut.handleUpdateOrder(orderData);
      expect(response).toEqual(
        badRequest(new Error(`Order with ID ${orderData.orderId} not found`))
      );
    });

    it('should return bad request if order status cannot be updated', async () => {
      const orderData = {
        orderId: '1',
        orderProducts: [{ productId: '1', count: 2 }],
      };

      const orderEntity = {
        id: 1,
        orderId: '1',
        status: 'Enviado', // Status que não pode ser atualizado
        payment: { status: 'Pendente' },
        payments: [],
        createdAt: new Date().toISOString(),
        orderProducts: [],
        totalPrice: 100,
      };

      mockOrderRepo.findOrder.mockResolvedValue(orderEntity);
      mockOrderService.validateOrderStatusRule.mockReturnValue(false);

      const response = await sut.handleUpdateOrder(orderData);
      expect(response).toEqual(
        badRequest(
          new Error(
            `Cant not update order with ID ${orderData.orderId}, status ${orderEntity.status}`
          )
        )
      );
    });

    it('should return bad request if product is not found', async () => {
      const orderData = {
        orderId: '1',
        orderProducts: [{ productId: '1', count: 2 }],
      };

      const orderEntity = {
        id: 1,
        orderId: '1',
        status: 'Recebido',
        payment: {
          id: 1,
          paymentId: 'pay_1',
          totalPrice: 100,
          paymentMethod: 'Cartão de Crédito',
          status: 'Concluido',
          pixUrl: '',
          pixCode: '',
          expirationDate: new Date(),
          order: null,
        },
        payments: [
          {
            id: 1,
            paymentId: 'pay_1',
            totalPrice: 100,
            paymentMethod: 'Cartão de Crédito',
            status: 'Concluido',
            pixUrl: '',
            pixCode: '',
            expirationDate: new Date(),
            order: null,
          },
        ],
        createdAt: new Date().toISOString(),
        orderProducts: [],
        totalPrice: 100,
      };

      mockOrderRepo.findOrder.mockResolvedValue(orderEntity);
      mockOrderService.validateOrderStatusRule.mockReturnValue(true);
      mockOrderRepo.findProduct.mockResolvedValue(undefined); // Produto não encontrado

      const response = await sut.handleUpdateOrder(orderData);
      expect(response).toEqual(
        badRequest(new Error(`Product with ID 1 not found`))
      );
    });

    it('should return bad request if ingredient is not found', async () => {
      const orderData = {
        orderId: '1',
        orderProducts: [
          {
            productId: '1',
            count: 2,
            ingredientProducts: [{ ingredientId: '1', count: 1 }],
          },
        ],
      };

      const orderEntity = {
        id: 1,
        orderId: '1',
        status: 'Recebido',
        payment: { status: 'Pendente' },
        payments: [],
        createdAt: new Date().toISOString(),
        orderProducts: [],
        totalPrice: 100,
      };

      const productData = {
        id: 1,
        productId: '1',
        name: 'Produto Exemplo',
        description: 'Descrição do produto',
        price: 50,
        category: {
          id: 1,
          productId: '1',
          name: 'Categoria Exemplo',
          description: 'Descrição da categoria',
          price: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };

      mockOrderService.validateOrderStatusRule.mockReturnValue(true);
      mockOrderRepo.findOrder.mockResolvedValue(orderEntity);
      mockOrderRepo.findProduct.mockResolvedValue(productData); // Produto encontrado
      mockOrderRepo.findIngredient.mockResolvedValue(undefined); // Ingrediente não encontrado

      mockOrderRepo.getOrderProductEntity.mockReturnValue(
        new OrderProductEntity()
      );
      mockOrderRepo.getOrderEntity.mockReturnValue(new OrderEntity());
      mockOrderRepo.getProductEntity.mockReturnValue(new ProductEntity());

      const response = await sut.handleUpdateOrder(orderData);
      expect(response).toEqual(
        badRequest(new Error(`Ingredient with ID 1 not found`))
      );
    });

    it('should send a message to the payment queue if order retrieval is successful', async () => {
      const orderData = {
        clientId: '1',
        orderId: '1',
        orderProducts: [{ productId: '1', count: 2 }],
      };

      const orderEntity = {
        id: 1,
        orderId: '1',
        status: 'Recebido',
        client: {
          clientId: '1',
          id: 1,
          name: 'John Doe',
          cpf: '40380665800',
          email: 'john@doe.com.br'
        },
        createdAt: new Date().toISOString(),
        orderProducts: [],
        totalPrice: 100,
      };

      const productData = {
        id: 1,
        productId: '1',
        name: 'Produto Exemplo',
        description: 'Descrição do produto',
        price: 50,
        category: {
          id: 1,
          productId: '1',
          name: 'Categoria Exemplo',
          description: 'Descrição da categoria',
          price: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };

      mockOrderRepo.getProductEntity.mockReturnValue(new ProductEntity());
      mockOrderRepo.findProduct.mockResolvedValue(productData);

      mockOrderRepo.getOrderProductEntity.mockReturnValue(
        new OrderProductEntity()
      );
      mockOrderRepo.getOrderEntity.mockReturnValue(new OrderEntity());
      mockValidator.validate.mockResolvedValueOnce([]);
      mockOrderRepo.prepareTransaction.mockResolvedValue(undefined);
      mockOrderRepo.openTransaction.mockResolvedValue(undefined);
      mockOrderRepo.findOrder.mockResolvedValue(orderEntity);
      mockOrderService.validateOrderStatusRule.mockReturnValue(true);
      mockOrderService.saveOrder.mockResolvedValue(orderEntity);
      mockOrderRepo.commit.mockResolvedValue(undefined);

      sut.handleGetOrder = jest.fn().mockResolvedValue({
        statusCode: 200,
        data: orderEntity,
      });

      mockMessageBroker.getChannel.mockReturnValue('paymentChannel');
      mockMessageBroker.sendToQueue.mockResolvedValueOnce(true);

      const response = await sut.handleUpdateOrder(orderData);

      expect(mockMessageBroker.getChannel).toHaveBeenCalledWith('payment');
      expect(mockMessageBroker.sendToQueue).toHaveBeenCalledWith('paymentChannel', {
        queueName: 'payment',
        message: {
          paymentMethod: 'Pix',
          order: {
            orderId: orderEntity.orderId,
            status: orderEntity.status,
            totalValue: orderEntity.totalPrice,
            clientId: orderEntity.client?.clientId,
          },
        },
      });

      expect(response).toEqual(ok({ orderId: '1', status: 'Recebido' }));
    });

    it('should return a bad request if order retrieval fails', async () => {
      const orderData = {
        orderId: '1',
        orderProducts: [{ productId: '1', count: 2 }],
      };

      const orderEntity = {
        id: 1,
        orderId: '1',
        status: 'Recebido',
        payment: { status: 'Pendente' },
        payments: [],
        createdAt: new Date().toISOString(),
        orderProducts: [],
        totalPrice: 100,
      };

      const productData = {
        id: 1,
        productId: '1',
        name: 'Produto Exemplo',
        description: 'Descrição do produto',
        price: 50,
        category: {
          id: 1,
          productId: '1',
          name: 'Categoria Exemplo',
          description: 'Descrição da categoria',
          price: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };

      mockOrderRepo.getProductEntity.mockReturnValue(new ProductEntity());
      mockOrderRepo.findProduct.mockResolvedValue(productData);

      mockOrderRepo.getOrderProductEntity.mockReturnValue(
        new OrderProductEntity()
      );
      mockOrderRepo.getOrderEntity.mockReturnValue(new OrderEntity());
      mockValidator.validate.mockResolvedValueOnce([]);
      mockOrderRepo.prepareTransaction.mockResolvedValue(undefined);
      mockOrderRepo.openTransaction.mockResolvedValue(undefined);
      mockOrderRepo.findOrder.mockResolvedValue(orderEntity);
      mockOrderService.validateOrderStatusRule.mockReturnValue(true);
      mockOrderService.saveOrder.mockResolvedValue(orderEntity);
      mockOrderRepo.commit.mockResolvedValue(undefined);

      // Configurando handleGetOrder para rejeitar
      const errorMessage = `Order ${orderEntity.orderId} not found`;
      sut.handleGetOrder = jest.fn().mockRejectedValue(new Error(errorMessage));

      // Executando o método
      const response = await sut.handleUpdateOrder(orderData);

      // Verificando a resposta
      expect(response).toEqual(badRequest(new Error(errorMessage)));
    });

    it('should handle transaction errors correctly', async () => {
      const orderData = {
        orderId: '1',
        orderProducts: [{ productId: '1', count: 2 }],
      };

      const orderEntity = {
        id: 1,
        orderId: '1',
        status: 'Recebido',
        payment: { status: 'Pendente' },
        payments: [],
        createdAt: new Date().toISOString(),
        orderProducts: [],
        totalPrice: 100,
      };

      const productData = {
        id: 1,
        productId: '1',
        name: 'Produto Exemplo',
        description: 'Descrição do produto',
        price: 50,
        category: {
          id: 1,
          productId: '1',
          name: 'Categoria Exemplo',
          description: 'Descrição da categoria',
          price: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };

      mockOrderService.validateOrderStatusRule.mockReturnValue(true);
      mockOrderRepo.findOrder.mockResolvedValue(orderEntity);
      mockOrderRepo.findProduct.mockResolvedValue(productData); // Produto encontrado
      mockOrderRepo.findIngredient.mockResolvedValue(undefined); // Ingrediente não encontrado

      mockOrderRepo.getOrderProductEntity.mockReturnValue(
        new OrderProductEntity()
      );
      mockOrderRepo.getOrderEntity.mockReturnValue(new OrderEntity());
      mockOrderRepo.getProductEntity.mockReturnValue(new ProductEntity());
      mockOrderRepo.commit.mockResolvedValue(undefined);

      // Simulando um erro de transação
      mockOrderService.saveOrderProduct.mockRejectedValue(
        new TransactionError(new Error('Transaction failed'))
      );

      const response = await sut.handleUpdateOrder(orderData);
      expect(response).toEqual(badRequest(new Error('Transaction failed')));
    });

    it('should return serverError if unexpected error', async () => {
      const orderData = {
        orderId: '1',
        orderProducts: [{ productId: '1', count: 2 }],
      };

      const orderEntity = {
        id: 1,
        orderId: '1',
        status: 'Recebido',
        payment: { status: 'Pendente' },
        payments: [],
        createdAt: new Date().toISOString(),
        orderProducts: [],
        totalPrice: 100,
      };

      const productData = {
        id: 1,
        productId: '1',
        name: 'Produto Exemplo',
        description: 'Descrição do produto',
        price: 50,
        category: {
          id: 1,
          productId: '1',
          name: 'Categoria Exemplo',
          description: 'Descrição da categoria',
          price: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };

      mockOrderService.validateOrderStatusRule.mockReturnValue(true);
      mockOrderRepo.findOrder.mockResolvedValue(orderEntity);
      mockOrderRepo.findProduct.mockResolvedValue(productData); // Produto encontrado
      mockOrderRepo.findIngredient.mockResolvedValue(undefined); // Ingrediente não encontrado

      mockOrderRepo.getOrderProductEntity.mockReturnValue(
        new OrderProductEntity()
      );
      mockOrderRepo.getOrderEntity.mockReturnValue(new OrderEntity());
      mockOrderRepo.getProductEntity.mockReturnValue(new ProductEntity());
      mockOrderRepo.commit.mockResolvedValue(undefined);

      // Simulando um erro de transação
      mockOrderService.saveOrderProduct.mockRejectedValue(
        new Error('Unexpected error')
      );

      const response = await sut.handleUpdateOrder(orderData);
      expect(response).toEqual(serverError(new Error('Unexpected error')));
    });
  });

  describe('handleUpdateOrderStatus', () => {
    it('should update order status successfully', async () => {
      3333344;
      const orderData = { orderId: '1', status: 'Updated' };

      // Definindo um objeto completo para orderEntity com todos os campos exigidos por FindOrderOutput
      const orderEntity = {
        id: 1,
        orderId: '1',
        status: 'Recebido', // Status existente antes da atualização
        payments: [], // Simulando pagamentos
        createdAt: new Date().toISOString(),
        orderProducts: [], // Simulando produtos do pedido
        totalPrice: 100,
        client: undefined, // Cliente simulado, se necessário
      };

      // Mockando as dependências
      mockValidator.validate.mockResolvedValueOnce([]); // Sem erros de validação
      mockOrderRepo.getOrderEntity.mockReturnValue(new OrderEntity());
      mockOrderRepo.prepareTransaction.mockResolvedValue(undefined);
      mockOrderRepo.openTransaction.mockResolvedValue(undefined);
      mockOrderRepo.findOrder.mockResolvedValue(orderEntity); // Passando o orderEntity completo
      mockOrderService.validateOrderStatusRule.mockReturnValue(true); // Validação do status
      mockOrderService.saveOrder.mockResolvedValue(orderEntity);
      mockOrderRepo.commit.mockResolvedValue(undefined);

      // Executando o teste
      const response = await sut.handleUpdateOrderStatus(orderData);

      // Verificando a resposta
      expect(response).toEqual(
        ok({ orderId: '1', status: orderEntity.status })
      );
      0;
    });

    it('should return bad request if orderId is not provided', async () => {
      const orderData = { orderId: '', status: 'Updated' }; // orderId não fornecido

      const response = await sut.handleUpdateOrderStatus(orderData);

      expect(response).toEqual(
        badRequest(new Error('Cannot update order: orderId not found'))
      );
    });

    it('should return bad request if order is not found', async () => {
      const orderData = { orderId: '999', status: 'Updated' };

      mockOrderRepo.findOrder.mockResolvedValue(undefined); // Pedido não encontrado
      mockOrderRepo.getOrderEntity.mockReturnValue(new OrderEntity());
      mockValidator.validate.mockResolvedValueOnce([]);

      const response = await sut.handleUpdateOrderStatus(orderData);

      expect(response).toEqual(
        badRequest(new Error('Order with ID 999 not found'))
      );
    });

    it('should return bad request if validation fails', async () => {
      const orderData = { orderId: '1', status: 'Updated' };

      mockOrderRepo.getOrderEntity.mockReturnValue(new OrderEntity());
      // Simulando um erro de validação
      mockValidator.validate.mockResolvedValueOnce([
        { field: 'status', message: 'Invalid status' },
      ]);

      const response = await sut.handleUpdateOrderStatus(orderData);

      expect(response).toEqual(
        badRequest(new Error('[{"field":"status","message":"Invalid status"}]'))
      );
    });

    it('should return bad request if order status rule validation fails', async () => {
      const orderData = { orderId: '1', status: 'Updated' };

      // Ajuste do mock para incluir todas as propriedades exigidas pelo tipo FindOrderOutput
      const orderEntity = {
        id: 1,
        orderId: '1',
        status: 'Recebido',
        payments: [
          {
            id: 1,
            paymentId: '123',
            totalPrice: 100,
            paymentMethod: 'PIX',
            status: 'Pending',
            pixUrl: '',
            pixCode: '',
            expirationDate: new Date(),
            order: orderData, // Pode ser simulado conforme necessário
          },
        ],
        createdAt: new Date().toISOString(),
        orderProducts: [], // Simulando produtos do pedido
        totalPrice: 100,
      };

      mockOrderRepo.findOrder.mockResolvedValue(orderEntity); // Passando o orderEntity completo
      mockOrderService.validateOrderStatusRule.mockReturnValue(false); // Validação de regra falha
      mockOrderRepo.getOrderEntity.mockReturnValue(new OrderEntity());
      mockValidator.validate.mockResolvedValueOnce([]);

      const response = await sut.handleUpdateOrderStatus(orderData);

      expect(response).toEqual(
        badRequest(
          new Error(
            `Cant not update order status with ID 1, order status Recebido`
          )
        )
      );
    });

    it('should handle errors during order status update', async () => {
      const orderData = { orderId: '1', status: 'Updated' };

      // Ajuste do mock para incluir todas as propriedades exigidas pelo tipo FindOrderOutput
      const orderEntity = {
        id: 1,
        orderId: '1',
        status: 'Recebido',
        payments: [
          {
            id: 1,
            paymentId: '123',
            totalPrice: 100,
            paymentMethod: 'PIX',
            status: 'Pending',
            pixUrl: '',
            pixCode: '',
            expirationDate: new Date(),
            order: orderData, // Pode ser simulado conforme necessário
          },
        ],
        createdAt: new Date().toISOString(),
        orderProducts: [], // Simulando produtos do pedido
        totalPrice: 100,
      };

      mockValidator.validate.mockResolvedValueOnce([]);
      mockOrderRepo.findOrder.mockRejectedValue(new Error('Database error'));
      mockOrderRepo.getOrderEntity.mockReturnValue(new OrderEntity());

      const response = await sut.handleUpdateOrderStatus(orderData);

      expect(response).toEqual(serverError(new Error('Database error')));
    });

    it('should handle transaction errors correctly', async () => {
      const orderData = { orderId: '1', status: 'Updated' };

      // Ajuste do mock para incluir todas as propriedades exigidas pelo tipo FindOrderOutput
      const orderEntity = {
        id: 1,
        orderId: '1',
        status: 'Recebido',
        payments: [
          {
            id: 1,
            paymentId: '123',
            totalPrice: 100,
            paymentMethod: 'PIX',
            status: 'Pending',
            pixUrl: '',
            pixCode: '',
            expirationDate: new Date(),
            order: orderData, // Pode ser simulado conforme necessário
          },
        ],
        createdAt: new Date().toISOString(),
        orderProducts: [], // Simulando produtos do pedido
        totalPrice: 100,
      };

      mockValidator.validate.mockResolvedValueOnce([]);
      mockOrderRepo.findOrder.mockRejectedValue(
        new OrderServiceError(new Error('Order service error'))
      );
      mockOrderRepo.getOrderEntity.mockReturnValue(new OrderEntity());

      const response = await sut.handleUpdateOrderStatus(orderData);

      expect(response).toEqual(badRequest(new Error('Order service error')));
    });
  });

  describe('handleDeleteOrder', () => {
    it('should delete order successfully', async () => {
      const httpRequest = { orderId: '1' };

      const deletedOrder = {
        orderId: '1',
        affected: 1, // Incluindo a propriedade 'affected'
      };

      // Mockando as dependências
      mockOrderRepo.deleteOrder.mockResolvedValue(deletedOrder);

      // Executando o teste
      const response = await sut.handleDeleteOrder(httpRequest);

      // Verificando se a resposta é correta
      expect(response).toEqual(ok(deletedOrder));
    });

    it('should return notFound if the order does not exist', async () => {
      const httpRequest = { orderId: '999' }; // ID de uma ordem que não existe

      // Mockando as dependências
      mockOrderRepo.deleteOrder.mockResolvedValue(undefined);

      // Executando o teste
      const response = await sut.handleDeleteOrder(httpRequest);

      // Verificando se a resposta é "notFound"
      expect(response).toEqual(notFound());
    });

    it('should handle errors during order deletion', async () => {
      const httpRequest = { orderId: '1' };

      // Mockando um erro
      mockOrderRepo.deleteOrder.mockRejectedValue(new Error('Delete failed'));

      // Executando o teste
      const response = await sut.handleDeleteOrder(httpRequest);

      // Verificando se a resposta é "serverError"
      expect(response).toEqual(serverError(new Error('Delete failed')));
    });
  });
});
