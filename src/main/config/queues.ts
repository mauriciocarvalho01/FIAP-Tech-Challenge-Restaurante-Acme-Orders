import { MessageBroker } from '@/domain/contracts/message-broker';

export const setupMessageBrokerQueues = (messageBroker: MessageBroker): void => {
  messageBroker.createChannel({
    channelName: 'payment',
    queueName: 'payment',
    arguments: {
      durable: true
    }
  }).then(() => void 0)

  messageBroker.createChannel({
    channelName: 'kitchen',
    queueName: 'kitchen',
    arguments: {
      durable: true
    }
  }).then(() => void 0)
};

