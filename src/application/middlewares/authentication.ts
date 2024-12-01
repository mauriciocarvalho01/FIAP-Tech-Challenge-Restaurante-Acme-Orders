import { TokenHandler, forbidden, HttpResponse, ok } from '@/application/helpers';
import { Middleware } from '@/application/middlewares';
import { env } from '@/main/config/env';
import { logger } from '@/infra/helpers';
import { Validator } from '@/application/validation';

type HttpRequest = { authorization?: string; ip?: string };
type AuthorizationRequest = { authorization: string };
type Model = Error | { apiName: string };
type GenericError<T = any> = T

export class AuthenticationMiddleware implements Middleware {
  constructor(
    private readonly tokenHandler: TokenHandler,
    private readonly validator: Validator
  ) {}

  async handle({
    authorization,
    ip,
  }: HttpRequest): Promise<HttpResponse<Model>> {
    try {
      if (authorization === undefined) return forbidden();
      if (!this.validateIp({ ip })) return forbidden();
      const authorized = await this.validateAuthorization({ authorization })
      if (!authorized) return forbidden();
      const authorize = this.tokenHandler.validate.bind(this.tokenHandler);
      const apiName = await authorize({ token: authorization });
      return ok({ apiName });
    } catch (error: GenericError) {
      logger.warn(error.message);
      return forbidden();
    }
  }

  private async validateAuthorization({
    authorization,
  }: AuthorizationRequest): Promise<boolean> {
    const auth = this.tokenHandler.authorization();
    auth.token = authorization ?? '';
    const errors = await this.validator.validate(auth);
    if (errors.length === 0) return true;
    return false;
  }


  private validateIp({ ip }: HttpRequest): boolean {
    if (!env.checkIpAuthorization) return true
    const valid = env.whitelistIps?.includes(ip!);
    if (!valid) throw new Error(`Ip not allowed: ${ip}`);
    return valid;
  }
}
