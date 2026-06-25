// ========== Imports: ==========
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqp-connection-manager';
import { ChannelWrapper } from 'amqp-connection-manager';
import { Channel, ConsumeMessage } from 'amqplib';
import { EXCHANGES, QUEUES, ROUTING_KEYS } from './events.constants';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQService.name);
  private connection!: amqp.AmqpConnectionManager;
  private channelWrapper!: ChannelWrapper;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const url = this.config.get<string>('rabbitmqUrl')!;
    this.logger.log(`Connecting to RabbitMQ at ${this.maskUrl(url)}…`);

    this.connection = amqp.connect([url], {
      heartbeatIntervalInSeconds: 15,
      reconnectTimeInSeconds: 5,
    });

    this.connection.on('connect', () => this.logger.log('-- RabbitMQ connected --'));
    this.connection.on('disconnect', (err) =>
      this.logger.warn(`-- RabbitMQ disconnected: ${err.err?.message ?? 'unknown'}`),
    );

    this.channelWrapper = this.connection.createChannel({
      json: true,
      confirm: true,
      setup: async (channel: Channel) => {
        await this.setupTopology(channel);
      },
    });

    await this.channelWrapper.waitForConnect();
    this.logger.log('-- RabbitMQ topology ready --');
  }

  async onModuleDestroy(): Promise<void> {
    await this.channelWrapper?.close();
    await this.connection?.close();
    this.logger.log('RabbitMQ connection closed');
  }

  private async setupTopology(channel: Channel): Promise<void> {
    await channel.assertExchange(EXCHANGES.DEAD_LETTER, 'topic', { durable: true });
    await channel.assertQueue(QUEUES.DEAD_LETTER, { durable: true });
    await channel.bindQueue(QUEUES.DEAD_LETTER, EXCHANGES.DEAD_LETTER, '#');

    await channel.assertExchange(EXCHANGES.AUTH,         'topic', { durable: true });
    await channel.assertExchange(EXCHANGES.NOTIFICATION, 'topic', { durable: true });
    await channel.assertExchange(EXCHANGES.AUDIT,        'topic', { durable: true });
    await channel.assertExchange(EXCHANGES.EVENT,        'topic', { durable: true });

    const baseQueueOptions = {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': EXCHANGES.DEAD_LETTER,
        'x-message-ttl':          86_400_000,
        'x-max-length':           10_000,
        'x-overflow':             'reject-publish',
      },
    };

    await channel.assertQueue(QUEUES.NOTIFICATION_EMAIL, baseQueueOptions);
    await channel.assertQueue(QUEUES.NOTIFICATION_SMS,   baseQueueOptions);
    await channel.assertQueue(QUEUES.NOTIFICATION_PUSH,  baseQueueOptions);
    await channel.assertQueue(QUEUES.PHOTOGRAPHER_ASSIGNED, baseQueueOptions);
    await channel.assertQueue(QUEUES.AUDIT_LOG, {
      ...baseQueueOptions,
      arguments: {
        ...baseQueueOptions.arguments,
        'x-message-ttl': 2_592_000_000,
      },
    });

    await channel.bindQueue(QUEUES.NOTIFICATION_EMAIL, EXCHANGES.NOTIFICATION, 'notification.email.*');
    await channel.bindQueue(QUEUES.NOTIFICATION_SMS,   EXCHANGES.NOTIFICATION, 'notification.sms.*');
    await channel.bindQueue(QUEUES.NOTIFICATION_PUSH,  EXCHANGES.NOTIFICATION, 'notification.push.*');

    await channel.bindQueue(QUEUES.AUDIT_LOG, EXCHANGES.AUTH,  'auth.#');
    await channel.bindQueue(QUEUES.AUDIT_LOG, EXCHANGES.AUDIT, 'audit.#');

    await channel.bindQueue(QUEUES.NOTIFICATION_EMAIL,     EXCHANGES.AUTH,  ROUTING_KEYS.USER_REGISTERED);
    await channel.bindQueue(QUEUES.PHOTOGRAPHER_ASSIGNED,  EXCHANGES.EVENT, 'event.photographer.*');

    this.logger.debug('Topology asserted: 4 exchanges + 1 DLX, 5 queues + 1 DLQ, 8 bindings');
  }

  async publish<T>(exchange: string, routingKey: string, payload: T): Promise<boolean> {
    try {
      await this.channelWrapper.publish(exchange, routingKey, payload, {
        persistent:  true,
        timestamp:   Math.floor(Date.now() / 1000),
        contentType: 'application/json',
        messageId:   uuidv4(),
        appId:       'akademia-backend',
      });
      this.logger.debug(`Published ${routingKey}`);
      return true;
    } catch (err) {
      this.logger.error(`Failed to publish ${routingKey}: ${(err as Error).message}`);
      return false;
    }
  }

  async subscribe<T>(
    queue: string,
    handler: (payload: T, msg: ConsumeMessage) => Promise<void>,
  ): Promise<void> {
    await this.channelWrapper.addSetup(async (channel: Channel) => {
      await channel.prefetch(10);
      const MAX_MESSAGE_BYTES = 1_048_576;

      await channel.consume(queue, async (msg) => {
        if (!msg) return;

        if (msg.content.length > MAX_MESSAGE_BYTES) {
          this.logger.warn(
            `Oversized message on ${queue}: ${msg.content.length} bytes — discarding`,
          );
          channel.nack(msg, false, false);
          return;
        }

        try {
          const payload = JSON.parse(msg.content.toString()) as T;
          await handler(payload, msg);
          channel.ack(msg);
        } catch (err) {
          this.logger.error(`Handler error in ${queue}: ${(err as Error).message}`);
          channel.nack(msg, false, false);
        }
      });
      this.logger.log(`Subscribed to queue: ${queue}`);
    });
  }

  private maskUrl(url: string): string {
    return url.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
  }
}
