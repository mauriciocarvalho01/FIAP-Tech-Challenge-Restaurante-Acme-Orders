
export interface MessageBroker {
  createChannel: (messageBrokerOptions: MessageBroker.MessageBrokerChannelOptions) => Promise<void>
  getConnection: () => Promise<MessageBroker.GenericType>
  getChannel: (channelName: string) => MessageBroker.GenericType
  consumeQueue: (consumeQueueOptions: MessageBroker.ConsumeQueueOptions, callback: Function) => Promise<void>
  close: () => void
  ack: (channel: MessageBroker.GenericType, message: MessageBroker.GenericType) => boolean
  noAck: (channel: MessageBroker.GenericType, message: MessageBroker.GenericType) => boolean
  rejectAck: (channel: MessageBroker.GenericType, message: MessageBroker.GenericType) => boolean
  assertQueue: (channel: MessageBroker.GenericType, assertQueueOptions: MessageBroker.AssertQueueOptions) => Promise<MessageBroker.GenericType>
  sendToQueue: (channel: MessageBroker.GenericType, sendToQueueOptions: MessageBroker.SendToQueueOptions) => Promise<boolean>
}

export namespace MessageBroker {
  export type MessageBrokerOptions = {
    host: string
    connectionName: string
  }

  export type MessageBrokerChannelOptions = {
    channelName: string
    queueName: string
    arguments: { [key: string]: GenericType }
  }


  export type ConsumeQueueOptions = {
    channel: GenericType
    queueName: string
    queuePrefetch: number
    messages: MessageBroker.Message[]
    performOptions: GenericType
  }

  export type SendToQueueOptions = {
    queueName: string
    message: GenericType
  }

  export type AssertQueueOptions = {
    queueName: string
    arguments: { [key: string]: string }
  }

  export type GenericType<T=any> = T

  export type Message = {
    queueIndex: number
    payload: GenericType
    buffer: Buffer
  }
}
