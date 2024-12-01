import { TokenHandler } from '@/application/helpers';
import { RegisterController } from '@/application/controllers';
import { Validator } from '@/application/validation';
import { RegisterRepository } from '@/infra/repos/mysql';
import { EntityError } from '@/infra/errors';
import { mock, MockProxy } from 'jest-mock-extended';

describe('RegisterController', () => {
  let sut: RegisterController;
  let validator: MockProxy<Validator>;
  let tokenHandler: MockProxy<TokenHandler>;
  let registerRepo: MockProxy<RegisterRepository>;

  const validClientInput = {
    cpf: '12345678900',
    name: 'any_name',
    email: 'any_email@mail.com', // Adicionando o campo 'email'
    clientId: 'any_client_id', // Adicionando o campo 'clientId'
  };

  beforeAll(() => {
    validator = mock<Validator>();
    tokenHandler = mock<TokenHandler>();
    registerRepo = mock<RegisterRepository>();
  });

  beforeEach(() => {
    sut = new RegisterController(validator, tokenHandler, registerRepo);
  });

  describe('handleGetClient', () => {
    it('should return 200 with client data if found', async () => {
      const clientData = validClientInput;
      registerRepo.findClient.mockResolvedValueOnce(clientData);

      const response = await sut.handleGetClient({ cpf: '12345678900' });

      expect(response).toEqual({
        statusCode: 200,
        data: clientData,
      });
      expect(registerRepo.findClient).toHaveBeenCalledWith({ cpf: '12345678900' });
    });

    it('should return 404 if client is not found', async () => {
      registerRepo.findClient.mockResolvedValueOnce(undefined);

      const response = await sut.handleGetClient({ cpf: '12345678900' });
      expect(response.statusCode).toBe(404);
      expect(response.data.message).toEqual('The request found no results');
    });

    it('should return 400 if getClientEntity returns undefined', async () => {
      registerRepo.getClientEntity.mockReturnValueOnce(undefined);

      const response = await sut.handleCreateClient(validClientInput);

      expect(response.statusCode).toBe(400);
      expect(response.data).toEqual(new Error('Client entity is undefined'));
    });

    it('should return 500 if findClient throws an error', async () => {
      const error = new Error('[ServerError: Server failed. Try again soon]');
      registerRepo.findClient.mockRejectedValueOnce(error);

      const response = await sut.handleGetClient({ cpf: '12345678900' });

      expect(response.statusCode).toBe(500);
      expect(response.data.message).toEqual('Server failed. Try again soon');
    });
  });

  describe('handleCreateClient', () => {
    it('should return 400 if validation fails', async () => {
      const validationErrors = ['Error in name field'];
      registerRepo.getClientEntity.mockReturnValueOnce(validClientInput); // Valor válido
      validator.validate.mockResolvedValueOnce(validationErrors);

      const response = await sut.handleCreateClient(validClientInput);

      expect(response.statusCode).toBe(400);
      expect(response.data).toEqual(new Error(JSON.stringify(validationErrors)));
    });

    it('should return 201 and create a client with generated clientId if clientId is not provided', async () => {
      const clientEntity = {
        cpf: '12345678900',
        name: 'any_name',
        email: 'any_email@mail.com',
      };

      // Simulando que o clientEntity não tem clientId
      validator.validate.mockResolvedValueOnce([]);
      registerRepo.getClientEntity.mockReturnValueOnce(clientEntity);
      tokenHandler.generateUuid.mockReturnValueOnce('generated_id');
      registerRepo.insertClient.mockResolvedValueOnce({ ...clientEntity, clientId: 'generated_id' });

      const response = await sut.handleCreateClient(clientEntity);

      expect(response.statusCode).toBe(201);
      expect(response.data).toEqual({
        clientId: 'generated_id',
        name: 'any_name',
      });
      expect(registerRepo.insertClient).toHaveBeenCalledWith({ ...clientEntity, clientId: 'generated_id' });
      expect(tokenHandler.generateUuid).toHaveBeenCalled();
    });

    it('should return 500 if insertClient throws an error', async () => {
      const clientEntity = { ...validClientInput, clientId: 'generated_id' };
      validator.validate.mockResolvedValueOnce([]);
      registerRepo.getClientEntity.mockReturnValueOnce(clientEntity);
      registerRepo.insertClient.mockRejectedValueOnce(new Error('any_error'));

      const response = await sut.handleCreateClient(validClientInput);

      expect(response.statusCode).toBe(500);
      expect(response.data.message).toEqual('Server failed. Try again soon');
    });

    it('should return 400 if insertClient returns undefined', async () => {
      const clientEntity = { ...validClientInput, clientId: 'generated_id' };
      validator.validate.mockResolvedValueOnce([]);
      registerRepo.getClientEntity.mockReturnValueOnce(clientEntity);
      registerRepo.insertClient.mockResolvedValueOnce(undefined);

      const response = await sut.handleCreateClient(validClientInput);

      expect(response.statusCode).toBe(400);
      expect(response.data).toEqual(new Error('Cant insert client'));
    });

    it('should return 400 if an EntityError is thrown', async () => {
      const clientEntity = { ...validClientInput, clientId: 'generated_id' };
      validator.validate.mockResolvedValueOnce([]);
      registerRepo.getClientEntity.mockReturnValueOnce(clientEntity);
      const entityError = new EntityError('Invalid entity');
      registerRepo.insertClient.mockRejectedValueOnce(entityError);

      const response = await sut.handleCreateClient(validClientInput);

      expect(response.statusCode).toBe(400);
      expect(response.data.message).toEqual('Invalid entity');
    });
  });
});
