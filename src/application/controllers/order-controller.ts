import { OrderRepository, RegisterRepository } from '@/infra/repos/mysql';
import {
  created,
  badRequest,
  HttpResponse,
  notFound,
  ok,
  serverError,
} from '@/application/helpers';
import { Validator } from '@/application/validation';
import { EntityError, TransactionError } from '@/infra/errors';
import { OrderService } from '@/domain/contracts/use-cases';
import { OrderHttp } from '@/domain/contracts/gateways';
import { MessageBroker } from '@/domain/contracts/message-broker';
import { OrderServiceError } from '@/domain/errors';

export class OrderController {
  constructor(
    private readonly validator: Validator,
    private readonly registerRepo: RegisterRepository,
    private readonly orderRepo: OrderRepository,
    private readonly orderService: OrderService,
    private readonly messageBroker: MessageBroker
  ) {}

  // GET /orders
  async handleGetOrders(): Promise<
    HttpResponse<OrderHttp.GetOrderOutput[] | Error>
  > {
    try {
      const orders = await this.orderRepo.findOrders();
      if (orders === undefined) return notFound();
      return ok(this.orderService.calculateOrderValues(orders));
    } catch (error) {
      if (
        error instanceof OrderServiceError ||
        error instanceof EntityError
      ) {
        return badRequest(new Error(error.message));
      }
      return serverError(error);
    }
  }

  // GET /order
  async handleGetOrder(
    httpRequest: OrderHttp.GetOrderInput
  ): Promise<HttpResponse<OrderHttp.GetOrderOutput | Error>> {
    try {
      const order = await this.orderRepo.findOrder({
        orderId: httpRequest.orderId,
      });
      if (order === undefined) return notFound();
      return ok(this.orderService.calculateOrderValue(order));
    } catch (error) {
      if (
        error instanceof OrderServiceError ||
        error instanceof EntityError
      ) {
        return badRequest(new Error(error.message));
      }
      return serverError(error);
    }
  }

  // POST /order
  async handleCreateOrder(
    orderData: OrderHttp.CreateOrderInput
  ): Promise<HttpResponse<OrderHttp.CreateOrderOutput | Error | void>> {
    await this.orderRepo.prepareTransaction();

    // Verificação básica para garantir que temos produtos para criar o pedido
    if (!orderData.orderProducts || orderData.orderProducts.length === 0) {
      return badRequest(
        new Error('Cannot save order: orderProducts not found')
      );
    }

    // Cria a entidade de pedido
    const orderEntity = this.orderRepo.getOrderEntity();

    // Configura o relacionamento entre cliente e pedido
    const client = await this.registerRepo.findClientById({
      clientId: orderData.clientId,
    });

    // Vincula o cliente ao pedido caso existir.
    if (client) {
      orderEntity.client = client;
    }


    orderEntity.status = 'Recebido';

    const errors = await this.validator.validate(orderEntity);
    if (errors.length !== 0) {
      return badRequest(new Error(JSON.stringify(errors)));
    }

    await this.orderRepo.openTransaction();

    try {

      const order = await this.orderService.saveOrder(orderEntity);

      if (order === undefined) {
        throw new TransactionError(
          new Error(
            'Cannot save order'
          )
        );
      }

      // Processa os produtos associados ao pedido
      for (const orderProductData of orderData.orderProducts) {
        const productEntity = await this.orderRepo.findProduct({
          productId: orderProductData.productId,
        });

        if (!productEntity) {
          throw new TransactionError(
            new Error(`Product with ID ${orderProductData.productId} not found`)
          );
        }

        const orderProductEntity = this.orderRepo.getOrderProductEntity();
        orderProductEntity.product = Object.assign(
          this.orderRepo.getProductEntity(),
          productEntity
        );
        orderProductEntity.count = orderProductData.count;
        orderProductEntity.order = Object.assign(
          this.orderRepo.getOrderEntity(),
          order
        );

        if (orderProductEntity.count <= 0) {
          throw new TransactionError(
            new Error(
              `Product with ID ${productEntity.productId} could not count as ${orderProductEntity.count}`
            )
          );
        }

        const orderProduct =
          await this.orderService.saveOrderProduct(orderProductEntity);

        // Processa os ingredientes associados ao produto do pedido
        if (orderProductData.ingredientProducts) {
          for (const ingredientProduct of orderProductData.ingredientProducts) {
            const ingredientEntity = await this.orderRepo.findIngredient({
              ingredientId: ingredientProduct.ingredientId,
            });

            if (!ingredientEntity) {
              throw new TransactionError(
                new Error(
                  `Ingredient with ID ${ingredientProduct.ingredientId} not found`
                )
              );
            }

            const ingredientProductEntity =
              this.orderRepo.getIngredientProductEntity();
            ingredientProductEntity.ingredient = Object.assign(
              this.orderRepo.getIngredientEntity(),
              ingredientEntity
            );
            ingredientProductEntity.count = ingredientProduct.count;
            ingredientProductEntity.orderProduct = Object.assign(
              this.orderRepo.getOrderProductEntity(),
              orderProduct
            );

            if (ingredientProductEntity.count <= 0) {
              throw new TransactionError(
                new Error(
                  `Product with ID ${ingredientEntity.ingredientId} could not count as ${ingredientProductEntity.count}`
                )
              );
            }

            await this.orderService.saveIngredientProduct(
              ingredientProductEntity
            );
          }
        }
      }

      await this.orderRepo.commit();

      return  await this.handleGetOrder({ orderId: order.orderId })
      .then(async ({ data }) => {

        if ((data instanceof  Error) || data === undefined) return badRequest(new Error(`Order ${order.orderId} not found`))

        const paymentChannel = this.messageBroker.getChannel('payment')
        await this.messageBroker.sendToQueue(
          paymentChannel,
          {
            queueName: 'payment',
            message: {
              paymentMethod: 'Pix',
              order: {
                orderId: data.orderId,
                status: data.status,
                totalValue: data.totalPrice,
                clientId: data.client?.clientId
              }
            }
          }
        )
        return created({ orderId: order.orderId, status: order.status });
      }).catch(() => badRequest(new Error(`Order ${order.orderId} not found`)))

    } catch (error) {
      console.log(error)
      if (error instanceof TransactionError) {
        await this.orderRepo.rollback();
      }

      if (
        error instanceof OrderServiceError ||
        error instanceof EntityError ||
        error instanceof TransactionError
      ) {
        return badRequest(new Error(error.message));
      }

      return serverError(error);
    } finally {
      await this.orderRepo.closeTransaction();
    }
  }

  // PUT /order
  async handleUpdateOrder(
    orderData: OrderHttp.UpdateOrderInput
  ): Promise<HttpResponse<OrderHttp.UpdateOrderOutput | Error>> {
    await this.orderRepo.prepareTransaction();

    // Verificação básica para garantir que temos orderId para alterar o pedido
    if (!orderData.orderId) {
      return badRequest(new Error('Cannot update order: orderId not found'));
    }

    // Verificação básica para garantir que temos produtos para criar o pedido
    if (!orderData.orderProducts || orderData.orderProducts.length === 0) {
      return badRequest(
        new Error('Cannot update order: orderProducts not found')
      );
    }

    await this.orderRepo.openTransaction();

    try {
      // Busca a entidade de pedido
      const order = await this.orderRepo.findOrder({
        orderId: orderData.orderId,
      });

      if (!order) {
        return badRequest(
          new Error(`Order with ID ${orderData.orderId} not found`)
        );
      }

      console.log(order)

      if (!this.orderService.validateOrderStatusRule(order)) {
        return badRequest(
          new Error(
            `Cant not update order with ID ${orderData.orderId}, status ${order.status}`
          )
        );
      }

      // Processa os produtos associados ao pedido
      for (const orderProductData of orderData.orderProducts) {
        const productEntity = await this.orderRepo.findProduct({
          productId: orderProductData.productId,
        });

        if (!productEntity) {
          throw new TransactionError(
            new Error(`Product with ID ${orderProductData.productId} not found`)
          );
        }

        const orderProductEntity = this.orderRepo.getOrderProductEntity();
        orderProductEntity.product = Object.assign(
          this.orderRepo.getProductEntity(),
          productEntity
        );
        orderProductEntity.count = orderProductData.count;
        orderProductEntity.order = Object.assign(
          this.orderRepo.getOrderEntity(),
          order
        );

        // Deleta um produto do pedido caso a quantidade for zero
        if (orderProductEntity.count === 0) {
          await this.orderRepo.deleteOrderProduct(orderProductEntity);
          continue;
        }

        const orderProduct =
          await this.orderService.saveOrderProduct(orderProductEntity);

        // Processa os ingredientes associados ao produto do pedido
        if (orderProductData.ingredientProducts) {
          for (const ingredientProduct of orderProductData.ingredientProducts) {
            const ingredientEntity = await this.orderRepo.findIngredient({
              ingredientId: ingredientProduct.ingredientId,
            });

            if (!ingredientEntity) {
              throw new TransactionError(
                new Error(
                  `Ingredient with ID ${ingredientProduct.ingredientId} not found`
                )
              );
            }

            const ingredientProductEntity =
              this.orderRepo.getIngredientProductEntity();
            ingredientProductEntity.ingredient = Object.assign(
              this.orderRepo.getIngredientEntity(),
              ingredientEntity
            );
            ingredientProductEntity.count = ingredientProduct.count;
            ingredientProductEntity.orderProduct = Object.assign(
              this.orderRepo.getOrderProductEntity(),
              orderProduct
            );

            // Deleta um ingrediente do produto caso a quantidade for zero
            if (ingredientProductEntity.count === 0) {
              await this.orderRepo.deleteIngredientProduct(
                ingredientProductEntity
              );
              continue;
            }

            await this.orderService.saveIngredientProduct(
              ingredientProductEntity
            );
          }
        }
      }

      await this.orderRepo.commit();

      return  await this.handleGetOrder({ orderId: order.orderId })
      .then(async ({ data }) => {

        if ((data instanceof  Error) || data === undefined) return badRequest(new Error(`Order ${order.orderId} not found`))

        const paymentChannel = this.messageBroker.getChannel('payment')
        await this.messageBroker.sendToQueue(
          paymentChannel,
          {
            queueName: 'payment',
            message: {
              paymentMethod: 'Pix',
              order: {
                orderId: data.orderId,
                status: data.status,
                totalValue: data.totalPrice,
                clientId: data.client?.clientId
              }
            }
          }
        )
        return ok({ orderId: order?.orderId, status: order.status });
      }).catch(() => badRequest(new Error(`Order ${order.orderId} not found`)))

    } catch (error) {
      console.log(error)
      if (error instanceof TransactionError) {
        await this.orderRepo.rollback();
      }

      if (
        error instanceof OrderServiceError ||
        error instanceof EntityError ||
        error instanceof TransactionError
      ) {
        return badRequest(new Error(error.message));
      }

      return serverError(error);
    } finally {
      await this.orderRepo.closeTransaction();
    }
  }

  // PUT /order-status
  async handleUpdateOrderStatus(
    orderData: OrderHttp.UpdateOrderStatusInput
  ): Promise<HttpResponse<OrderHttp.UpdateOrderStatusOutput | Error>> {

    // Verificação básica para garantir que temos orderId para alterar o pedido
    if (!orderData.orderId) {
      return badRequest(new Error('Cannot update order: orderId not found'));
    }

    try {
      // Cria a entidade de pedido
      const orderEntity = Object.assign(
        this.orderRepo.getOrderEntity(),
        orderData
      );

      // Valida o pedido antes de salvar
      const errors = await this.validator.validate(orderEntity);
      if (errors.length !== 0) {
        return badRequest(new Error(JSON.stringify(errors)));
      }

      // Busca a entidade de pedido
      const order = await this.orderRepo.findOrder({
        orderId: orderData.orderId,
      });

      if (!order) {
        return badRequest(
          new Error(`Order with ID ${orderData.orderId} not found`)
        );
      }

      if (!this.orderService.validateOrderStatusRule(order, orderData.status)) {
        return badRequest(
          new Error(
            `Cant not update order status with ID ${orderData.orderId}, order status ${order.status}`
          )
        );
      }

      // Altera a entidade de pedido
      await this.orderService.saveOrder(Object.assign(order, orderEntity));


      return ok({ orderId: order.orderId, status: order.status });
    } catch (error) {
      if (
        error instanceof OrderServiceError ||
        error instanceof EntityError
      ) {
        return badRequest(new Error(error.message));
      }

      return serverError(error);
    }
  }

  // DELETE /order
  async handleDeleteOrder(
    httpRequest: OrderHttp.DeleteOrderInput
  ): Promise<HttpResponse<OrderHttp.DeleteOrderOutput | Error>> {
    try {
      const order = await this.orderRepo.deleteOrder({
        orderId: httpRequest.orderId,
      });
      if (order === undefined) return notFound();
      return ok(order);
    } catch (error) {
      return serverError(error);
    }
  }
}
