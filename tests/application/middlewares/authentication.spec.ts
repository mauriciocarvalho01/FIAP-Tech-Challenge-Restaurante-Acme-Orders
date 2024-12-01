import { AuthenticationMiddleware } from '@/application/middlewares';
import { forbidden, ok, TokenHandler, Authorization } from '@/application/helpers';
import { Validator } from '@/application/validation';
import { env } from '@/main/config/env';
import { logger } from '@/infra/helpers';
import { mock, MockProxy } from 'jest-mock-extended';

jest.mock('@/infra/helpers')

describe('AuthenticationMiddleware', () => {
  let sut: AuthenticationMiddleware;
  let tokenHandler: MockProxy<TokenHandler>;
  let validator: MockProxy<Validator>;
  let mockAuthorization: MockProxy<Authorization>;

  beforeEach(() => {
    mockAuthorization = mock();
    tokenHandler = mock();
    validator = mock();
    sut = new AuthenticationMiddleware(tokenHandler, validator);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handle', () => {
    it('should return ok when authorization is valid and IP is allowed', async () => {
      env.checkIpAuthorization = true;
      env.whitelistIps = '192.168.0.1,192.168.0.2';

      const authorization = 'valid-token';
      const apiName = 'someApi';

      tokenHandler.validate.mockResolvedValue(apiName);
      tokenHandler.authorization.mockReturnValue(mockAuthorization);
      validator.validate.mockResolvedValue([]);

      const response = await sut.handle({ authorization, ip: '192.168.0.1' });

      expect(response).toEqual(ok({ apiName }));
    });

    it('should return forbidden if IP validation is enabled but no IP is provided', async () => {
      env.checkIpAuthorization = true;
      env.whitelistIps = '192.168.0.1,192.168.0.2';

      const response = await sut.handle({ authorization: 'valid-token' }); // IP não fornecido

      expect(response).toEqual(forbidden());
    });

    it('should return forbidden when IP is not allowed', async () => {
      env.checkIpAuthorization = true;
      env.whitelistIps = '192.168.0.1,192.168.0.2';

      const response = await sut.handle({ authorization: 'valid-token', ip: '192.168.0.3' });

      expect(response).toEqual(forbidden());
    });

    it('should return ok if checkIpAuthorization is false even if IP is invalid', async () => {
      env.checkIpAuthorization = false; // Validação de IP desativada

      const authorization = 'valid-token';
      const apiName = 'someApi';

      tokenHandler.validate.mockResolvedValue(apiName);
      tokenHandler.authorization.mockReturnValue(mockAuthorization);
      validator.validate.mockResolvedValue([]);

      const response = await sut.handle({ authorization, ip: 'invalid-ip' });

      expect(response).toEqual(ok({ apiName }));
    });


    it('should return forbidden when authorization is undefined', async () => {
      const authorization = undefined;

      const response = await sut.handle({ authorization });

      expect(response).toEqual(forbidden());
    });


    it('should return forbidden when authorization is invalid', async () => {
      env.checkIpAuthorization = true;
      env.whitelistIps = '192.168.0.1,192.168.0.2';

      const authorization = 'invalid-token';
      validator.validate.mockResolvedValue(['error']); // Retorna erro na validação

      const response = await sut.handle({ authorization, ip: '192.168.0.1' });

      expect(response).toEqual(forbidden());
    });

    it('should return forbidden when an error occurs during token validation', async () => {
      env.checkIpAuthorization = true;
      env.whitelistIps = '192.168.0.1,192.168.0.2';

      const authorization = 'valid-token';
      tokenHandler.authorization.mockReturnValue(mockAuthorization);
      validator.validate.mockImplementation(() => { throw new Error('validation error'); });

      const response = await sut.handle({ authorization, ip: '192.168.0.1' });

      expect(response).toEqual(forbidden());
      expect(logger.warn).toHaveBeenCalledWith('validation error');
    });

    it('should log "unknown error" when an unexpected error occurs', async () => {
      env.checkIpAuthorization = true;
      env.whitelistIps = '192.168.0.1,192.168.0.2';

      tokenHandler.authorization.mockReturnValue(mockAuthorization);
      tokenHandler.validate.mockImplementation(() => { throw new Error('unexpected error'); });
      validator.validate.mockResolvedValue([]);

      const response = await sut.handle({ authorization: 'valid-token', ip: '192.168.0.1' });

      expect(response).toEqual(forbidden());
      expect(logger.warn).toHaveBeenCalledWith('unexpected error');
    });
  });

  describe('validateIp', () => {
    it('should throw an error if IP is not in the whitelist', () => {
      env.whitelistIps = '192.168.0.1,192.168.0.2';

      expect(() => sut['validateIp']({ ip: '192.168.0.3' })).toThrow('Ip not allowed: 192.168.0.3');
    });

    it('should return true if IP is in the whitelist', () => {
      env.whitelistIps = '192.168.0.1,192.168.0.2';

      const result = sut['validateIp']({ ip: '192.168.0.1' });

      expect(result).toBe(true);
    });
  });
});
