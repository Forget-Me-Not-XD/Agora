// ========== Imports: ==========
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqp-connection-manager';
import { ChannelWrapper } from 'amqp-connection-manager';
import { Channel, ConsumeMessage } from 'amqplib';
import { EXCHANGES, QUEUES, ROUTING_KEYS } from './events.constants';
import { v4 as uuidv4 } from 'uuid';

/**
 * Centralised RabbitMQ connection + publisher/consumer service.
 *
 * Uses amqp-connection-manager for automatic reconnection on broker restart.
 * Topology (exchanges, queues, bindings) is asserted on every channel setup
 * so it survives broker restarts without manual intervention.
 */
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

    // Channel wrapper auto-reconnects and re-asserts topology
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

  /**
   * Declare all exchanges, queues, and bindings.
   * Idempotent — safe to call multiple times.
   */
  private async setupTopology(channel: Channel): Promise<void> {
  // ── Dead-Letter Exchange — catches all nacked/expired/overflow messages ──
  await channel.assertExchange(EXCHANGES.DEAD_LETTER, 'topic', { durable: true });
  await channel.assertQueue(QUEUES.DEAD_LETTER, { durable: true });
  await channel.bindQueue(QUEUES.DEAD_LETTER, EXCHANGES.DEAD_LETTER, '#');

  // ── Exchanges (topic = pattern-based routing) ──
  await channel.assertExchange(EXCHANGES.AUTH,         'topic', { durable: true });
  await channel.assertExchange(EXCHANGES.NOTIFICATION, 'topic', { durable: true });
  await channel.assertExchange(EXCHANGES.AUDIT,        'topic', { durable: true });

  // ── Shared queue hardening: DLX redirect + memory/TTL caps ──
  const baseQueueOptions = {
    durable: true,
    arguments: {
      'x-dead-letter-exchange': EXCHANGES.DEAD_LETTER,
      'x-message-ttl':          86_400_000,    // 24 h — stale notifications discarded
      'x-max-length':           10_000,         // reject publisher if queue fills
      'x-overflow':             'reject-publish',
    },
  };

  // ── Queues ────────────────────────────────────
  await channel.assertQueue(QUEUES.NOTIFICATION_EMAIL, baseQueueOptions);
  await channel.assertQueue(QUEUES.NOTIFICATION_SMS,   baseQueueOptions);
  await channel.assertQueue(QUEUES.NOTIFICATION_PUSH,  baseQueueOptions);
  await channel.assertQueue(QUEUES.AUDIT_LOG, {
    ...baseQueueOptions,
    arguments: {
      ...baseQueueOptions.arguments,
      'x-message-ttl': 2_592_000_000,   // 30 days — audit logs must be kept longer
    },
  });

  // ── Bindings ──────────────────────────────────
  await channel.bindQueue(QUEUES.NOTIFICATION_EMAIL, EXCHANGES.NOTIFICATION, 'notification.email.*');
  await channel.bindQueue(QUEUES.NOTIFICATION_SMS,   EXCHANGES.NOTIFICATION, 'notification.sms.*');
  await channel.bindQueue(QUEUES.NOTIFICATION_PUSH,  EXCHANGES.NOTIFICATION, 'notification.push.*');

  await channel.bindQueue(QUEUES.AUDIT_LOG, EXCHANGES.AUTH,  'auth.#');
  await channel.bindQueue(QUEUES.AUDIT_LOG, EXCHANGES.AUDIT, 'audit.#');

  await channel.bindQueue(QUEUES.NOTIFICATION_EMAIL, EXCHANGES.AUTH, ROUTING_KEYS.USER_REGISTERED);

  this.logger.debug('Topology asserted: 3 exchanges + 1 DLX, 4 queues + 1 DLQ, 6 bindings');
}


  /**
   * Publish a message to an exchange.
   * Returns true if buffered for delivery (does not wait for broker confirm).
   */
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

  /**
   * Subscribe to a queue with a typed handler.
   * The handler is acked on success, nacked + requeued on thrown errors.
   */
  async subscribe<T>(
    queue: string,
    handler: (payload: T, msg: ConsumeMessage) => Promise<void>,
  ): Promise<void> {
    await this.channelWrapper.addSetup(async (channel: Channel) => {
      await channel.prefetch(10);   // Process up to 10 in flight per consumer
      const MAX_MESSAGE_BYTES = 1_048_576; // 1 MB hard cap

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
          // Nack with requeue=false → message goes to dead-letter (or is dropped)
          // Set requeue=true here only if the failure is transient.
          channel.nack(msg, false, false);
        }
      });
      this.logger.log(`Subscribed to queue: ${queue}`);
    });
  }

  /** Hide credentials when logging the connection URL. */
  private maskUrl(url: string): string {
    return url.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
  }
}