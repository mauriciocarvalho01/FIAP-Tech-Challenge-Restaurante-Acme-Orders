import { ProductController } from '@/application/controllers/product-controller';
import { OrderRepository } from '@/infra/repos/mysql';
import { ok, notFound, serverError } from '@/application/helpers';
import { mock, MockProxy } from 'jest-mock-extended';

describe('ProductController', () => {
  let sut: ProductController;
  let mockOrderRepo: MockProxy<OrderRepository>;

  beforeEach(() => {
    mockOrderRepo = mock();
    sut = new ProductController(mockOrderRepo);
  });

  describe('handleGetProduct', () => {
    it('should return a product successfully', async () => {
      const productMock = {
        id: 1,
        productId: 'P1',
        name: 'Product 1',
        description: 'Description of Product 1',
        price: 100,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        category: {
          id: 1, // Alterado para string
          productId: 'P2',
          name: 'Category Product',
          description: 'Description of Category Product',
          price: 50,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };

    // Given/Arrange/Dado que
      mockOrderRepo.findProduct.mockResolvedValue(productMock);

    // When/Act/Execute a ação
      const response = await sut.handleGetProduct({ productId: '1' });

    // Then/Assert/Entao o resultado é
      expect(response).toEqual(ok(productMock));
    });

    it('should return not found when product does not exist', async () => {
      mockOrderRepo.findProduct.mockResolvedValue(undefined);

      const response = await sut.handleGetProduct({ productId: '1' });

      expect(response).toEqual(notFound());
    });

    it('should return server error when an unknown error occurs', async () => {
      const error = new Error('Some unknown error');
      mockOrderRepo.findProduct.mockRejectedValue(error);

      const response = await sut.handleGetProduct({ productId: '1' });

      expect(response).toEqual(serverError(error));
    });
  });

  describe('handleGetCategories', () => {
    it('should return categories successfully', async () => {
      const categoriesMock = [
        {
          id: 1, // Alterado para string
          name: 'Category 1',
          products: [
            {
              id: 1, // Alterado para string
              productId: 'P1',
              name: 'Product 1',
              description: 'Description of Product 1',
              price: 100,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              category: {
                id: 1, // Alterado para string
                productId: 'P2',
                name: 'Category Product',
                description: 'Description of Category Product',
                price: 50,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            },
          ],
          ingredients: [
            {
              id: 1,
              ingredientId: 'I1', // Adicionado para compatibilidade
              name: 'Ingredient 1',
              description: 'Description of Ingredient 1', // Adicionado para compatibilidade
              quantity: '100g',
              createdAt: new Date().toISOString(), // Adicionado para compatibilidade
              updatedAt: new Date().toISOString(), // Adicionado para compatibilidade
            },
          ],
        },
      ];



      mockOrderRepo.findCategories.mockResolvedValue(categoriesMock);

      const response = await sut.handleGetCategories();

      expect(response).toEqual(ok(categoriesMock));
    });

    it('should return not found when no categories exist', async () => {
      mockOrderRepo.findCategories.mockResolvedValue(undefined);

      const response = await sut.handleGetCategories();

      expect(response).toEqual(notFound());
    });

    it('should return server error when an unknown error occurs', async () => {
      const error = new Error('Some unknown error');
      mockOrderRepo.findCategories.mockRejectedValue(error);

      const response = await sut.handleGetCategories();

      expect(response).toEqual(serverError(error));
    });
  });
});
