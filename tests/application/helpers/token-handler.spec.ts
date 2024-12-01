import { TokenHandler } from '@/application/helpers';
import { JwtPayload, verify as jwtVerify } from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

// Mockando as dependências externas
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  genSalt: jest.fn(),
}));
jest.mock('uuid', () => ({
  v4: jest.fn(),
}));

describe('TokenHandler', () => {
  let sut: TokenHandler;
  const secret = 'test_secret';
  const data = 'test_data';

  beforeEach(() => {
    sut = new TokenHandler(secret);
    jest.clearAllMocks();
  });

  describe('validate', () => {
    it('should validate a token and return the apiName', async () => {
      const token = 'valid_token';
      const payload: JwtPayload = { apiName: 'someApi' };

      (jwtVerify as jest.Mock).mockReturnValue(payload);

      const result = await sut.validate({ token });

      expect(result).toBe('someApi');
      expect(jwtVerify).toHaveBeenCalledWith(token, secret);
    });

    it('should use default secret if no secret is provided', async () => {
      const token = 'valid_token';
      const payload: JwtPayload = { apiName: 'someApi' };
      sut = new TokenHandler(); // Sem secret fornecido

      (jwtVerify as jest.Mock).mockReturnValue(payload);

      const result = await sut.validate({ token });

      expect(result).toBe('someApi');
      expect(jwtVerify).toHaveBeenCalledWith(token, 'any_secret');
    });

    it('should throw an error if token validation fails', async () => {
      const token = 'invalid_token';

      (jwtVerify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(sut.validate({ token })).rejects.toThrow('Invalid token');
    });
  });

  describe('encrypt', () => {
    it('should hash data using bcrypt', async () => {
      const salt = 'test_salt';
      const hashedData = 'hashed_data';

      (bcrypt.genSalt as jest.Mock).mockResolvedValue(salt);
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedData);

      const result = await sut.encrypt(data);

      expect(result).toBe(hashedData);
      expect(bcrypt.genSalt).toHaveBeenCalled();
      expect(bcrypt.hash).toHaveBeenCalledWith(data, salt);
    });
  });

  describe('generateUuid', () => {
    it('should generate a UUID', () => {
      const uuid = 'test_uuid';
      (uuidv4 as jest.Mock).mockReturnValue(uuid);

      const result = sut.generateUuid();

      expect(result).toBe(uuid);
      expect(uuidv4).toHaveBeenCalled();
    });
  });

  describe('authorization', () => {
    it('should return an instance of Authorization', () => {
      const result = sut.authorization();

      expect(result).toBeInstanceOf(Object); // Substituir pelo tipo específico se necessário
    });
  });
});
