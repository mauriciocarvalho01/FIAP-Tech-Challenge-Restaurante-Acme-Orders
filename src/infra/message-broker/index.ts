import { MessageBrokerError } from '@/infra/errors';
import { MessageBroker } from '@/domain/contracts/message-broker';
import { logger } from '@/infra/helpers';

import * as amqp from 'amqplib';

export class RabbitMQ implements MessageBroker {
  static connection: Promise<amqp.Connection> | null = null;
  private readonly channels: { [key: string]: amqp.Channel }[] = [];
  static instance: RabbitMQ | null = null;

  static readonly getInstance = (
    messageBrokerOptions: MessageBroker.MessageBrokerOptions
  ): RabbitMQ => {
    if (RabbitMQ.instance === null) {
      RabbitMQ.instance = new RabbitMQ();
      logger.info('RabbitMQ instance is active');
    }
    if (RabbitMQ.connection === null) {
      RabbitMQ.connection = amqp
        .connect(messageBrokerOptions.host, {
          noDelay: true,
          clientProperties: {
            connection_name: messageBrokerOptions.connectionName,
          },
        })
      logger.log(
        `Message broker connection has already been established: ${JSON.stringify(messageBrokerOptions)}`
      );
    }
    return RabbitMQ.instance;
  };

  async createChannel(
    channelOptions: MessageBroker.MessageBrokerChannelOptions
  ): Promise<void> {
    const connection = await Promise.resolve(RabbitMQ.connection)
    if (connection === null) {
      throw new Error('RabbitMQ connection has not been established.');
    }
    try{
      await this.getChannel(channelOptions.channelName)
    }catch(error: MessageBroker.GenericType) {
      logger.info(`Creating channel: ${channelOptions.channelName}`)
      const channel = await connection.createChannel();
      await this.assertQueue(channel, {
        queueName: channelOptions.queueName,
        arguments: channelOptions.arguments,
      });
      this.channels.push({
        [channelOptions.channelName]: channel,
      });
    }
  }

  async getConnection(): Promise<MessageBroker.GenericType> {
    if (RabbitMQ.connection === null) {
      throw new MessageBrokerError('Broker Connection not connectialized');
    }
    return RabbitMQ.connection;
  }

  getChannel(channelName: string): MessageBroker.GenericType {
    if (this.channels.length === 0) {
      throw new MessageBrokerError('No available channels');
    }
    const channel = this.channels.find((channel) => channel[channelName]);
    //console.log(channel)
    if (channel === undefined)
      throw new MessageBrokerError('No available channel');
    return channel[channelName];
  }

  consumeQueue = async (
    consumeQueueOptions: MessageBroker.ConsumeQueueOptions,
    callback: Function
  ): Promise<void> => {
    const channel = consumeQueueOptions.channel;
    const prefetch = consumeQueueOptions.queuePrefetch;
    await channel.prefetch(prefetch);
    logger.log(`Queue Prefetch: ${prefetch}`);
    let messages: MessageBroker.Message[] = [];

    const processMessages = (): void => {
      if (messages.length > 0) {
        consumeQueueOptions.messages = messages;
        callback(consumeQueueOptions);
        messages = [];
      }
    };

    await channel.consume(
      consumeQueueOptions.queueName,
      async (message: MessageBroker.GenericType) => {
        const queueIndex = message.fields.deliveryTag;
        messages.push({
          queueIndex: queueIndex,
          payload: JSON.parse(message.content.toString()),
          buffer: message,
        });

        if (
          messages.length >= prefetch &&
          consumeQueueOptions.performOptions.mode === 'fast'
        ) {
          logger.log(
            `Limit of consumed messages has been reached: [${consumeQueueOptions.queueName}][${prefetch}]`
          );
          processMessages();
        }
      },
      {
        noAck: false,
      }
    );

    setInterval(async () => {
      if (
        messages.length < prefetch ||
        consumeQueueOptions.performOptions.mode === 'normal'
      )
        processMessages();
    }, 5000);
  };

  async close(): Promise<void> {
    const connection = await Promise.resolve(RabbitMQ.connection);
    if (connection !== null) {
      await connection.close();
    }
  }

  ack = (channel: MessageBroker.GenericType, buffer: Buffer): boolean => {
    try {
      channel.ack(buffer);
      return true;
    } catch (error: MessageBroker.GenericType) {
      logger.log(error.message);
      return false;
    }
  };

  noAck = (channel: MessageBroker.GenericType, buffer: Buffer): boolean => {
    try {
      channel.noAck(buffer);
      return true;
    } catch (error: MessageBroker.GenericType) {
      logger.log(error.message);
      return false;
    }
  };

  rejectAck = (channel: MessageBroker.GenericType, buffer: Buffer): boolean => {
    try {
      channel.reject(buffer, false);
      return true;
    } catch (error: MessageBroker.GenericType) {
      logger.log(error.message);
      return false;
    }
  };

  async assertQueue(
    channel: MessageBroker.GenericType,
    assertQueueOptions: MessageBroker.AssertQueueOptions
  ): Promise<MessageBroker.GenericType> {
    await channel.assertQueue(assertQueueOptions.queueName, {
      durable: false,
      arguments: assertQueueOptions.arguments,
    });
    return channel;
  }

  async sendToQueue(
    channel: MessageBroker.GenericType,
    sendToQueueOptions: MessageBroker.SendToQueueOptions
  ): Promise<boolean> {
    try {
      const persistent = { persistent: true };
      channel.sendToQueue(
        sendToQueueOptions.queueName,
        Buffer.from(JSON.stringify(sendToQueueOptions.message)),
        persistent
      );
      return true;
    } catch (error: MessageBroker.GenericType) {
      logger.log(
        `Error sendToQueue: ${sendToQueueOptions.queueName}: ${error.message}`
      );
      return false;
    }
  }
}
