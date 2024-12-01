import { ClientEntity } from '@/infra/repos/mysql/entities';
import { Repository } from 'typeorm';
import { RegisterRepository } from '@/infra/repos/mysql';
import { Register } from '@/domain/contracts/repos';
import { EntityError } from '@/infra/errors';
import { mock, MockProxy } from 'jest-mock-extended';

describe('RegisterRepository', () => {
  let sut: RegisterRepository;
  let clientEntityMock: MockProxy<Register.GenericType>;
  let mockRepository: MockProxy<any>;

  beforeEach(() => {
    mockRepository = mock<Repository<any>>();
    clientEntityMock = mock<Register.GenericType>();

    sut = new RegisterRepository(ClientEntity);

    // Mock para getRepository retornar o mockRepository
    jest.spyOn(sut, 'getRepository').mockReturnValue(mockRepository);
  });

  describe('findClient', () => {
    it('should return client data when found', async () => {
      const clientData: Register.FindClientOutput = {
        clientId: '123',
        name: 'John Doe',
        cpf: '111.222.333-44',
        email: 'johndoe@example.com',
      };

      mockRepository.findOne.mockResolvedValue(clientData);

      const result = await sut.findClient({ cpf: '111.222.333-44' });

      expect(result).toEqual(clientData);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { cpf: '111.222.333-44' },
      });
    });

    it('should return undefined when client is not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await sut.findClient({ cpf: '111.222.333-44' });

      expect(result).toBeUndefined();
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { cpf: '111.222.333-44' },
      });
    });
  });

  describe('findClientById', () => {
    it('should return client data by ID when found', async () => {
      const clientData: Register.FindClientOutput = {
        id: 1,
        clientId: '123',
        name: 'John Doe',
        cpf: '111.222.333-44',
        email: 'johndoe@example.com',
      };

      mockRepository.findOne.mockResolvedValue(clientData);

      const result = await sut.findClientById({ clientId: '123' });

      expect(result).toEqual(clientData);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { clientId: '123' },
      });
    });

    it('should return undefined when client is not found by ID', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await sut.findClientById({ clientId: '123' });

      expect(result).toBeUndefined();
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { clientId: '123' },
      });
    });
  });

  describe('insertClient', () => {
    it('should insert client successfully and return the clientId and name', async () => {
      const clientData: Register.InsertClientInput = {
        clientId: '123',
        name: 'John Doe',
        cpf: '111.222.333-44',
        email: 'johndoe@example.com',
      };

      mockRepository.insert.mockResolvedValue(clientData);

      const result = await sut.insertClient(clientData);

      expect(result).toEqual({
        clientId: '123',
        name: 'John Doe',
      });
      expect(mockRepository.insert).toHaveBeenCalledWith(clientData);
    });

    it('should throw EntityError when an error occurs during insertion', async () => {
      const clientData: Register.InsertClientInput = {
        clientId: '123',
        name: 'John Doe',
        cpf: '111.222.333-44',
        email: 'johndoe@example.com',
      };

      const error = new Error('Database error');
      mockRepository.insert.mockRejectedValue(error);

      await expect(sut.insertClient(clientData)).rejects.toThrow(EntityError);
      expect(mockRepository.insert).toHaveBeenCalledWith(clientData);
    });
  });

  describe('getClientEntity', () => {
    it('should return an instance of clientEntity', () => {

      const result = sut.getClientEntity();

      expect(result).toBeInstanceOf(ClientEntity);
    });
  });

});
