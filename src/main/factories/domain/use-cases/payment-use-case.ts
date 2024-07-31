import { PaymentManager } from '@/domain/use-cases'
import { makeTokenHandler } from '@/main/factories/infra/gateways'
import { makeOrderRepo } from '@/main/factories/infra/repos/mysql'

export const makePaymentService = (): PaymentManager => {
  return new PaymentManager(makeOrderRepo(), makeTokenHandler())
}
