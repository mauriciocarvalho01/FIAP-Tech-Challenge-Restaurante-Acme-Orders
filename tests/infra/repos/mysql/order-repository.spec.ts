import { Repository } from 'typeorm';
import { OrderRepository } from '@/infra/repos/mysql';
import { mock, MockProxy } from 'jest-mock-extended';
import { EntityError } from '@/infra/errors';
import {
  OrderStatus,
  OrderEntity,
  ProductEntity,
  OrderProductEntity,
  IngredientEntity,
  IngredientProductEntity,
  CategoryEntity
} from '@/infra/repos/mysql/entities';

describe('OrderRepository', () => {
  let mockRepository: MockProxy<Repository<any>>;
  let sut: OrderRepository;

  beforeEach(() => {
    // Mock do repositório
    mockRepository = mock<Repository<any>>();

    // Criar instância do OrderRepository
    sut = new OrderRepository(
      OrderEntity,
      ProductEntity,
      OrderProductEntity,
      IngredientEntity,
      IngredientProductEntity,
      CategoryEntity
    );

    // Mock para getRepository retornar o mockRepository
    jest.spyOn(sut, 'getRepository').mockReturnValue(mockRepository);
  });

  describe('OrderRepository Entity Getters', () => {
    it('should return a new OrderEntity instance', () => {
      const orderEntity = sut.getOrderEntity();
      expect(orderEntity).toBeInstanceOf(OrderEntity);
    });

    it('should return a new OrderProductEntity instance', () => {
      const orderProductEntity = sut.getOrderProductsEntity();
      expect(orderProductEntity).toBeInstanceOf(OrderProductEntity);
    });

    it('should return a new ProductEntity instance', () => {
      const productEntity = sut.getProductEntity();
      expect(productEntity).toBeInstanceOf(ProductEntity);
    });

    it('should return a new OrderProductEntity instance (getOrderProductEntity)', () => {
      const orderProductEntity = sut.getOrderProductEntity();
      expect(orderProductEntity).toBeInstanceOf(OrderProductEntity);
    });

    it('should return a new IngredientProductEntity instance', () => {
      const ingredientProductEntity = sut.getIngredientProductEntity();
      expect(ingredientProductEntity).toBeInstanceOf(IngredientProductEntity);
    });

    it('should return a new IngredientEntity instance', () => {
      const ingredientEntity = sut.getIngredientEntity();
      expect(ingredientEntity).toBeInstanceOf(IngredientEntity);
    });

    it('should return a new CategoryEntity instance', () => {
      const categoryEntity = sut.getCategoryEntity();
      expect(categoryEntity).toBeInstanceOf(CategoryEntity);
    });
  });


  describe('findOrders', () => {
    it('should return formatted orders with ingredientProducts and payments', async () => {
      const mockOrders = [
        {
          id: 1,
          orderId: 'order_1',
          status: OrderStatus.PRONTO,
          createdAt: new Date('2024-01-01T12:00:00Z'),
          client: {
            clientId: 'client_1',
            name: 'Client One',
            cpf: '12345678901',
            email: 'client1@example.com',
          },
          orderProducts: [
            {
              id: 1,
              product: {
                productId: 'product_1',
                name: 'Product One',
                description: 'Delicious product',
                price: 10.0,
                category: {
                  categoryId: 'category_1',
                  name: 'Category One',
                },
              },
              count: 2,
              ingredientProducts: [
                {
                  id: 1,
                  ingredient: {
                    ingredientId: 'ingredient_1',
                    name: 'Ingredient One',
                    description: 'Tasty ingredient',
                    price: 2.0,
                  },
                  count: 1,
                },
              ],
            },
          ]
        },
      ];

      // Mock do repositório
      mockRepository.find.mockResolvedValue(mockOrders);

      const result = await sut.findOrders();

      expect(result).toEqual([
        {
          id: 1,
          orderId: 'order_1',
          status: OrderStatus.PRONTO,
          createdAt: expect.any(Date),
          client: {
            clientId: 'client_1',
            name: 'Client One',
            cpf: '12345678901',
            email: 'client1@example.com',
          },
          orderProducts: [
            {
              id: 1,
              productId: 'product_1',
              name: 'Product One',
              description: 'Delicious product',
              count: 2,
              category: {
                categoryId: 'category_1',
                name: 'Category One',
              },
              price: 10.0,
              ingredientProducts: [
                {
                  id: 1,
                  ingredientId: 'ingredient_1',
                  name: 'Ingredient One',
                  description: 'Tasty ingredient',
                  count: 1,
                  price: 2.0,
                },
              ],
            },
          ]
        },
      ]);
    });

    it('should return formatted orders when there are orders found', async () => {
      const mockOrders = [
        {
          id: 1,
          orderId: 'order_1',
          status: OrderStatus.PRONTO,
          createdAt: new Date('2024-01-01T12:00:00Z'),
          client: {
            clientId: 'client_1',
            name: 'John Doe',
            cpf: '12345678900',
            email: 'john@example.com',
          },
          orderProducts: [
            {
              id: 1,
              product: {
                productId: 'product_1',
                name: 'Product 1',
                description: 'Description of Product 1',
                category: {
                  categoryId: 'category_1',
                  name: 'Category 1',
                },
                price: '100',
              },
              count: '2',
              ingredientProducts: [],
            },
          ]
        },
        {
          id: 2,
          orderId: 'order_2',
          status: OrderStatus.EM_PREPARACAO,
          createdAt: new Date('2024-01-02T12:00:00Z'), // data mais recente
          client: {
            clientId: 'client_2',
            name: 'Jane Doe',
            cpf: '09876543210',
            email: 'jane@example.com',
          },
          orderProducts: []
        },
      ];

      // Definir comportamento do repositório mockado
      mockRepository.find.mockResolvedValue(mockOrders);

      const result = await sut.findOrders();

      expect(result).toEqual([
        {
          id: 1,
          orderId: 'order_1',
          status: OrderStatus.PRONTO,
          createdAt: expect.any(Date),
          client: {
            clientId: 'client_1',
            name: 'John Doe',
            cpf: '12345678900',
            email: 'john@example.com',
          },
          orderProducts: [
            {
              id: 1,
              productId: 'product_1',
              name: 'Product 1',
              description: 'Description of Product 1',
              count: 2,
              category: {
                categoryId: 'category_1',
                name: 'Category 1',
              },
              price: 100,
              ingredientProducts: [],
            },
          ]
        },
        {
          id: 2,
          orderId: 'order_2',
          status: OrderStatus.EM_PREPARACAO,
          createdAt: expect.any(Date),
          client: {
            clientId: 'client_2',
            name: 'Jane Doe',
            cpf: '09876543210',
            email: 'jane@example.com',
          },
          orderProducts: []
        },
      ]);
    });

    it('should return orders sorted by status and createdAt in ascending order', async () => {
      const mockOrders = [
        {
          id: 1,
          orderId: 'order_1',
          status: OrderStatus.PRONTO,
          createdAt: new Date('2024-01-01T12:00:00Z'),
          client: {
            clientId: '1',
            cpf: '40386014500',
            email: 'jhon@gmail.com',
            name: 'John Doe'
          },
          orderProducts: []
        },
        {
          id: 2,
          orderId: 'order_2',
          status: OrderStatus.EM_PREPARACAO,
          createdAt: new Date('2024-01-02T12:00:00Z'),
          client: {
            clientId: '1',
            cpf: '40386014500',
            email: 'jhon@gmail.com',
            name: 'John Doe'
          },
          orderProducts: []
        },
        {
          id: 3,
          orderId: 'order_3',
          status: OrderStatus.PRONTO,
          createdAt: new Date('2024-01-03T12:00:00Z'), // Adicionando mais um pedido para verificar a ordenação
          client: {
            clientId: '1',
            cpf: '40386014500',
            email: 'jhon@gmail.com',
            name: 'John Doe'
          },
          orderProducts: []
        },
        {
          id: 4,
          orderId: 'order_4',
          status: OrderStatus.EM_PREPARACAO,
          createdAt: new Date('2024-01-01T15:00:00Z'), // Data anterior ao pedido 2
          client: {
            clientId: '1',
            cpf: '40386014500',
            email: 'jhon@gmail.com',
            name: 'John Doe'
          },
          orderProducts: []
        },
      ];

      // Definir comportamento do repositório mockado
      mockRepository.find.mockResolvedValue(mockOrders);

      const result = await sut.findOrders();

      expect(result).toEqual([
        {
          id: 1,
          orderId: 'order_1',
          status: OrderStatus.PRONTO,
          createdAt: expect.any(Date),
          client: {
            clientId: '1',
            cpf: '40386014500',
            email: 'jhon@gmail.com',
            name: 'John Doe'
          },
          orderProducts: []
        },
        {
          id: 3,
          orderId: 'order_3',
          status: OrderStatus.PRONTO,
          createdAt: expect.any(Date),
          client: {
            clientId: '1',
            cpf: '40386014500',
            email: 'jhon@gmail.com',
            name: 'John Doe'
          },
          orderProducts: [],
        },
        {
          id: 4,
          orderId: 'order_4',
          status: OrderStatus.EM_PREPARACAO,
          createdAt: expect.any(Date),
          client: {
            clientId: '1',
            cpf: '40386014500',
            email: 'jhon@gmail.com',
            name: 'John Doe'
          },
          orderProducts: []
        },
        {
          id: 2,
          orderId: 'order_2',
          status: OrderStatus.EM_PREPARACAO,
          createdAt: expect.any(Date),
          client: {
            clientId: '1',
            cpf: '40386014500',
            email: 'jhon@gmail.com',
            name: 'John Doe'
          },
          orderProducts: []
        },
      ]);
    });

    it('should return undefined when there are no orders', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await sut.findOrders();

      expect(result).toBeUndefined();
    });

    it('should throw an EntityError when there is an error in finding orders', async () => {
      const errorMessage = 'Database error';
      mockRepository.find.mockRejectedValue(new Error(errorMessage));

      await expect(sut.findOrders()).rejects.toThrow(EntityError);
      await expect(sut.findOrders()).rejects.toThrow(errorMessage);
    });
  });

  describe('findOrder', () => {
    it('should returns order', async () => {
      const mockOrder = {
        id: 1,
        orderId: '12345',
        status: 'PENDING',
        createdAt: new Date(),
        client: {
          clientId: 'C123',
          name: 'João Silva',
          cpf: '111.111.111-11',
          email: 'joao.silva@example.com',
        },
        orderProducts: [
          {
            id: 1,
            product: {
              productId: 'P123',
              name: 'Produto A',
              description: 'Descrição do produto A',
              category: {
                categoryId: 'CAT1',
                name: 'Categoria A',
              },
              price: '100.00',
            },
            count: '2',
            ingredientProducts: [
              {
                id: 1,
                ingredient: {
                  ingredientId: 'I123',
                  name: 'Ingrediente A',
                  description: 'Descrição do ingrediente A',
                  price: '10.00',
                },
                count: '1',
              },
            ],
          },
        ]
      };

      // Simulando o retorno da busca com o pedido mockado
      mockRepository.findOne.mockResolvedValue(mockOrder);

      const result = await sut.findOrder({ orderId: '12345' });

      expect(result).toEqual({
        id: 1,
        orderId: '12345',
        status: 'PENDING',
        createdAt: mockOrder.createdAt,
        client: {
          clientId: 'C123',
          name: 'João Silva',
          cpf: '111.111.111-11',
          email: 'joao.silva@example.com',
        },
        orderProducts: [
          {
            id: 1,
            productId: 'P123',
            name: 'Produto A',
            description: 'Descrição do produto A',
            count: 2,
            category: {
              categoryId: 'CAT1',
              name: 'Categoria A',
            },
            price: 100.0,
            ingredientProducts: [
              {
                id: 1,
                ingredientId: 'I123',
                name: 'Ingrediente A',
                description: 'Descrição do ingrediente A',
                count: '1',
                price: 10.0,
              },
            ],
          },
        ]
      });
    });

    it('should returns undefined if order not found', async () => {
      // Simulando o retorno de "null" quando o pedido não for encontrado
      mockRepository.findOne.mockResolvedValue(null);

      const result = await sut.findOrder({ orderId: 'not-found' });

      expect(result).toBeUndefined();
    });

    it('should throw an error if findOrder throws an exception', async () => {
      // Simulando um erro ao buscar o pedido
      const errorMessage = 'Erro na consulta ao banco de dados';
      mockRepository.findOne.mockRejectedValue(new Error(errorMessage));

      await expect(sut.findOrder({ orderId: '12345' })).rejects.toThrow(
        EntityError
      );
      await expect(sut.findOrder({ orderId: '12345' })).rejects.toThrow(
        errorMessage
      );
    });
  });

  describe('saveOrder', () => {
    it('should save an order successfully', async () => {
      const orderData = {
        orderId: 'order_1',
        status: 'PENDING',
        payment: [
          {
            paymentId: 'PAY123',
            totalPrice: 200.0,
            paymentMethod: 'CREDIT_CARD',
            status: 'PAID',
          },
        ],
        orderProducts: [
          {
            productId: 'P123',
            count: 2,
            ingredientProducts: [
              {
                ingredientId: 'I123',
                count: 1,
              },
            ],
          },
        ],
      };

      const mockSaveResult = {
        id: 1,
        orderId: orderData.orderId,
        status: orderData.status,
      };

      mockRepository.save.mockResolvedValue(mockSaveResult);

      const result = await sut.saveOrder(orderData);

      expect(result).toEqual({
        id: 1,
        status: orderData.status,
        orderId: orderData.orderId,
      });
    });

    it('should throw an EntityError if there is an error while saving the order', async () => {
      const orderData = {
        orderId: 'order_1',
        status: 'PENDING',
        payment: [
          {
            paymentId: 'PAY123',
            totalPrice: 200.0,
            paymentMethod: 'CREDIT_CARD',
            status: 'PAID',
          },
        ],
        orderProducts: [
          {
            productId: 'P123',
            count: 2,
            ingredientProducts: [
              {
                ingredientId: 'I123',
                count: 1,
              },
            ],
          },
        ],
      };

      const errorMessage = 'Database error';

      mockRepository.save.mockRejectedValue(new Error(errorMessage));

      await expect(sut.saveOrder(orderData)).rejects.toThrow(EntityError);
      await expect(sut.saveOrder(orderData)).rejects.toThrow(errorMessage);
    });
  });

  describe('saveOrderProduct', () => {
    it('should insert a new order product when it does not exist', async () => {
      const insertResult = {
        identifiers: [], // Defina os identifiers conforme necessário
        generatedMaps: [], // Ajuste conforme o esperado
        raw: { insertId: 123 },
      };

      const orderProductData = {
        count: 2,
        order: { id: 1 }, // Exemplo de estrutura
        product: { id: 1 }, // Exemplo de estrutura
      };

      // Mock para simular a inexistência do produto no pedido
      mockRepository.findOne.mockResolvedValue(null);

      // Mock para simular a inserção
      mockRepository.insert.mockResolvedValue(insertResult);

      const result = await sut.saveOrderProduct(orderProductData);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { 'order.id': 1, 'product.id': 1 },
      });
      expect(mockRepository.insert).toHaveBeenCalledWith(orderProductData);
      expect(result).toEqual({
        id: insertResult.raw.insertId,
        count: orderProductData.count,
        order: orderProductData.order,
        product: orderProductData.product,
      });
    });

    it('should update an existing order product', async () => {
      const existingOrderProduct = {
        id: 1,
        order: { id: 1 },
        product: { id: 1 },
        count: 1,
      };

      const orderProductData = {
        count: 2,
        order: { id: 1 }, // Exemplo de estrutura
        product: { id: 1 }, // Exemplo de estrutura
      };

      // Mock para simular a existência do produto no pedido
      mockRepository.findOne.mockResolvedValue(existingOrderProduct);

      // Mock para simular a atualização
      mockRepository.save.mockResolvedValue({
        ...existingOrderProduct,
        ...orderProductData,
      });

      const result = await sut.saveOrderProduct(orderProductData);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { 'order.id': 1, 'product.id': 1 },
      });
      expect(mockRepository.save).toHaveBeenCalledWith({
        ...existingOrderProduct,
        ...orderProductData,
      });
      expect(result).toEqual({
        id: existingOrderProduct.id,
        count: orderProductData.count,
        order: orderProductData.order,
        product: orderProductData.product,
      });
    });

    it('should throw an EntityError when an error occurs', async () => {
      const errorMessage = 'Database error';

      const orderProductData = {
        count: 2,
        order: { id: 1 }, // Exemplo de estrutura
        product: { id: 1 }, // Exemplo de estrutura
      };

      // Mock para simular um erro
      mockRepository.findOne.mockRejectedValue(new Error(errorMessage));

      await expect(sut.saveOrderProduct(orderProductData)).rejects.toThrow(
        EntityError
      );
      await expect(sut.saveOrderProduct(orderProductData)).rejects.toThrow(
        errorMessage
      );
    });
  });

  describe('saveIngredientProduct', () => {
    it('should insert a new ingredientProduct if it does not exist', async () => {
      const ingredientProductData = {
        count: 2,
        ingredient: { id: 1 }, // mock de ingrediente
        orderProduct: { id: 1 }, // mock de produto do pedido
      };

      const insertResult = {
        identifiers: [], // Defina os identifiers conforme necessário
        generatedMaps: [], // Ajuste conforme o esperado
        raw: { insertId: 123 },
      };

      mockRepository.findOne.mockResolvedValue(null); // simulando que não encontrou produto existente
      mockRepository.insert.mockResolvedValue(insertResult); // simulando a inserção com sucesso

      const result = await sut.saveIngredientProduct(ingredientProductData);

      expect(mockRepository.insert).toHaveBeenCalledWith(ingredientProductData);
      expect(result).toEqual({
        id: insertResult.raw.insertId,
        count: ingredientProductData.count,
        ingredient: ingredientProductData.ingredient,
        orderProduct: ingredientProductData.orderProduct,
      });
    });

    it('should update an existing ingredientProduct if it exists', async () => {
      const ingredientProductData = {
        count: 2,
        ingredient: { id: 1 }, // mock de ingrediente
        orderProduct: { id: 1 }, // mock de produto do pedido
      };

      const existingIngredientProduct = { id: 1, ...ingredientProductData };
      mockRepository.findOne.mockResolvedValue(existingIngredientProduct); // produto existente encontrado
      mockRepository.save.mockResolvedValue(existingIngredientProduct); // simula a atualização

      const result = await sut.saveIngredientProduct(ingredientProductData);

      expect(mockRepository.save).toHaveBeenCalledWith({
        ...existingIngredientProduct,
        ...ingredientProductData,
      });
      expect(result).toEqual({
        id: existingIngredientProduct.id,
        count: ingredientProductData.count,
        ingredient: ingredientProductData.ingredient,
        orderProduct: ingredientProductData.orderProduct,
      });
    });

    it('should throw an EntityError if an error occurs', async () => {
      const ingredientProductData = {
        count: 2,
        ingredient: { id: 1 }, // mock de ingrediente
        orderProduct: { id: 1 }, // mock de produto do pedido
      };

      const errorMessage = 'Database error';
      mockRepository.findOne.mockRejectedValue(new Error(errorMessage)); // simulando erro

      await expect(
        sut.saveIngredientProduct(ingredientProductData)
      ).rejects.toThrow(EntityError);
    });
  });

  describe('findProduct', () => {
    it('should return product when found', async () => {
      const mockProduct = {
        id: 1,
        productId: 'P123',
        name: 'Produto A',
        description: 'Descrição do produto A',
        price: '100.00',
        category: {
          categoryId: 'CAT1',
          name: 'Categoria A',
        },
      };

      // Mock para simular a busca de produto
      mockRepository.findOne.mockResolvedValue(mockProduct);

      const result = await sut.findProduct({ productId: 'P123' });

      expect(result).toEqual({
        id: mockProduct.id,
        productId: mockProduct.productId,
        name: mockProduct.name,
        description: mockProduct.description,
        price: 100.0, // Convertendo para número
        category: mockProduct.category,
      });
    });

    it('should return undefined if product not found', async () => {
      // Simulando o retorno de "null" quando o produto não for encontrado
      mockRepository.findOne.mockResolvedValue(null);

      const result = await sut.findProduct({ productId: 'not-found' });

      expect(result).toBeUndefined();
    });

    it('should throw an EntityError if an error occurs', async () => {
      const errorMessage = 'Database error';
      mockRepository.findOne.mockRejectedValue(new Error(errorMessage));

      await expect(sut.findProduct({ productId: 'P123' })).rejects.toThrow(
        EntityError
      );
      await expect(sut.findProduct({ productId: 'P123' })).rejects.toThrow(
        errorMessage
      );
    });
  });

  describe('findCategories', () => {
    it('should return formatted categories when categories are found', async () => {
      const mockCategories = [
        {
          id: 1,
          name: 'Category 1',
          products: [
            {
              id: 1,
              productId: 'P123',
              name: 'Product A',
              description: 'Description of Product A',
              price: '100.00',
            },
          ],
          ingredients: [
            {
              id: 1,
              ingredientId: 'I123',
              name: 'Ingredient A',
              description: 'Description of Ingredient A',
              price: '10.00',
            },
          ],
        },
      ];

      // Definindo o comportamento do repositório mockado
      mockRepository.find.mockResolvedValue(mockCategories);

      const result = await sut.findCategories();

      expect(result).toEqual([
        {
          id: 1,
          name: 'Category 1',
          products: mockCategories[0].products,
          ingredients: mockCategories[0].ingredients,
        },
      ]);
    });

    it('should return undefined when there are no categories found', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await sut.findCategories();

      expect(result).toBeUndefined();
    });

    it('should throw an EntityError when there is an error in finding categories', async () => {
      const errorMessage = 'Database error';
      mockRepository.find.mockRejectedValue(new Error(errorMessage));

      await expect(sut.findCategories()).rejects.toThrow(EntityError);
      await expect(sut.findCategories()).rejects.toThrow(errorMessage);
    });
  });

  describe('findIngredient', () => {
    it('should return formatted ingredient when ingredient is found', async () => {
      const mockIngredient = {
        id: 1,
        ingredientId: 'I123',
        name: 'Ingredient A',
        description: 'Description of Ingredient A',
        price: '10.00',
      };

      // Definindo o comportamento do repositório mockado
      mockRepository.findOne.mockResolvedValue(mockIngredient);

      const result = await sut.findIngredient({ ingredientId: 'I123' });

      expect(result).toEqual({
        id: 1,
        ingredientId: 'I123',
        name: 'Ingredient A',
        description: 'Description of Ingredient A',
        price: 10.0,
      });
    });

    it('should return undefined when ingredient is not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await sut.findIngredient({ ingredientId: 'I123' });

      expect(result).toBeUndefined();
    });

    it('should throw an EntityError when there is an error in finding the ingredient', async () => {
      const errorMessage = 'Database error';
      mockRepository.findOne.mockRejectedValue(new Error(errorMessage));

      await expect(
        sut.findIngredient({ ingredientId: 'I123' })
      ).rejects.toThrow(EntityError);
      await expect(
        sut.findIngredient({ ingredientId: 'I123' })
      ).rejects.toThrow(errorMessage);
    });
  });

  describe('deleteOrder', () => {
    it('should return delete result when order is deleted', async () => {
      const mockDeleteResult = {
        affected: 1,
        raw: {},
      };

      // Definindo o comportamento do repositório mockado
      mockRepository.delete.mockResolvedValue(mockDeleteResult);

      const result = await sut.deleteOrder({ orderId: 'O123' });

      expect(result).toEqual({
        orderId: 'O123',
        affected: 1,
      });
    });

    it('should return undefined when no order is deleted', async () => {
      const mockDeleteResult = {
        affected: 0,
        raw: {},
      };

      // Definindo o comportamento do repositório mockado
      mockRepository.delete.mockResolvedValue(mockDeleteResult);

      const result = await sut.deleteOrder({ orderId: 'O123' });

      expect(result).toBeUndefined();
    });

    it('should throw an EntityError when there is an error in deleting the order', async () => {
      const errorMessage = 'Database error';
      mockRepository.delete.mockRejectedValue(new Error(errorMessage));

      await expect(sut.deleteOrder({ orderId: 'O123' })).rejects.toThrow(
        EntityError
      );
      await expect(sut.deleteOrder({ orderId: 'O123' })).rejects.toThrow(
        errorMessage
      );
    });
  });

  describe('deleteOrderProduct', () => {
    it('should return delete result when order product is deleted', async () => {
      const mockDeleteResult = {
        affected: 1,
        raw: {}, // Adicionando uma propriedade raw vazia para satisfazer o tipo DeleteResult
      };

      const orderProductData = {
        order: { orderId: 'O123' },
        product: { productId: 'P456' },
      };

      // Definindo o comportamento do repositório mockado
      mockRepository.delete.mockResolvedValue(mockDeleteResult);

      const result = await sut.deleteOrderProduct(orderProductData);

      expect(result).toEqual({
        orderId: 'O123',
        productId: 'P456',
        affected: 1,
      });
    });

    it('should return undefined when no order product is deleted', async () => {
      const mockDeleteResult = {
        affected: 0,
        raw: {}, // Adicionando uma propriedade raw vazia
      };

      const orderProductData = {
        order: { orderId: 'O123' },
        product: { productId: 'P456' },
      };

      // Definindo o comportamento do repositório mockado
      mockRepository.delete.mockResolvedValue(mockDeleteResult);

      const result = await sut.deleteOrderProduct(orderProductData);

      expect(result).toBeUndefined();
    });

    it('should throw an EntityError when there is an error in deleting the order product', async () => {
      const errorMessage = 'Database error';
      const orderProductData = {
        order: { orderId: 'O123' },
        product: { productId: 'P456' },
      };

      mockRepository.delete.mockRejectedValue(new Error(errorMessage));

      await expect(sut.deleteOrderProduct(orderProductData)).rejects.toThrow(
        EntityError
      );
      await expect(sut.deleteOrderProduct(orderProductData)).rejects.toThrow(
        errorMessage
      );
    });
  });

  describe('deleteIngredientProduct', () => {
    it('should return delete result when ingredient product is deleted', async () => {
      const mockDeleteResult = {
        affected: 1,
        raw: {}, // Adicionando uma propriedade raw vazia para satisfazer o tipo DeleteResult
      };

      const ingredientProductData = {
        ingredient: { ingredientId: 'I123' },
        orderProduct: { orderProductId: 'OP456' },
      };

      // Definindo o comportamento do repositório mockado
      mockRepository.delete.mockResolvedValue(mockDeleteResult);

      const result = await sut.deleteIngredientProduct(ingredientProductData);

      expect(result).toEqual({
        ingredientId: 'I123',
        orderProductId: 'OP456',
        affected: 1,
      });
    });

    it('should return undefined when no ingredient product is deleted', async () => {
      const mockDeleteResult = {
        affected: 0,
        raw: {}, // Adicionando uma propriedade raw vazia
      };

      const ingredientProductData = {
        ingredient: { ingredientId: 'I123' },
        orderProduct: { orderProductId: 'OP456' },
      };

      // Definindo o comportamento do repositório mockado
      mockRepository.delete.mockResolvedValue(mockDeleteResult);

      const result = await sut.deleteIngredientProduct(ingredientProductData);

      expect(result).toBeUndefined();
    });

    it('should throw an EntityError when there is an error in deleting the ingredient product', async () => {
      const errorMessage = 'Database error';
      const ingredientProductData = {
        ingredient: { ingredientId: 'I123' },
        orderProduct: { orderProductId: 'OP456' },
      };

      mockRepository.delete.mockRejectedValue(new Error(errorMessage));

      await expect(
        sut.deleteIngredientProduct(ingredientProductData)
      ).rejects.toThrow(EntityError);
      await expect(
        sut.deleteIngredientProduct(ingredientProductData)
      ).rejects.toThrow(errorMessage);
    });
  });
});
