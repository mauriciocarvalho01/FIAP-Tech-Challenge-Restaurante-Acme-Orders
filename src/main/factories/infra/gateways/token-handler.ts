import { TokenHandler } from '@/application/helpers';
import { env } from '@/main/config/env';

export const makeTokenHandler = (): TokenHandler => {
  return new TokenHandler(env.apiAccessKey ?? '');
};
