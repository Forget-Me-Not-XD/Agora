// ========== Imports: ==========
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqp-connection-manager';
import { ChannelWrapper } from 'amqp-connection-manager';
import { Channel, ConsumeMessage } from 'amqplib';
import { EXCHANGES, QUEUES, ROUTING_KEYS } from './events.constants';

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
    // ── Exchanges (topic = pattern-based routing) ──
    await channel.assertExchange(EXCHANGES.AUTH,         'topic', { durable: true });
    await channel.assertExchange(EXCHANGES.NOTIFICATION, 'topic', { durable: true });
    await channel.assertExchange(EXCHANGES.AUDIT,        'topic', { durable: true });

    // ── Queues ────────────────────────────────────
    await channel.assertQueue(QUEUES.NOTIFICATION_EMAIL, { durable: true });
    await channel.assertQueue(QUEUES.NOTIFICATION_SMS,   { durable: true });
    await channel.assertQueue(QUEUES.NOTIFICATION_PUSH,  { durable: true });
    await channel.assertQueue(QUEUES.AUDIT_LOG,          { durable: true });

    // ── Bindings ──────────────────────────────────
    // Email queue listens to all notification.email.* events
    await channel.bindQueue(QUEUES.NOTIFICATION_EMAIL, EXCHANGES.NOTIFICATION, 'notification.email.*');
    await channel.bindQueue(QUEUES.NOTIFICATION_SMS,   EXCHANGES.NOTIFICATION, 'notification.sms.*');
    await channel.bindQueue(QUEUES.NOTIFICATION_PUSH,  EXCHANGES.NOTIFICATION, 'notification.push.*');

    // Audit queue listens to ALL auth events (for security trail)
    await channel.bindQueue(QUEUES.AUDIT_LOG, EXCHANGES.AUTH,  'auth.#');
    await channel.bindQueue(QUEUES.AUDIT_LOG, EXCHANGES.AUDIT, 'audit.#');

    // Welcome-email when user registers
    await channel.bindQueue(QUEUES.NOTIFICATION_EMAIL, EXCHANGES.AUTH, ROUTING_KEYS.USER_REGISTERED);

    this.logger.debug('Topology asserted: 3 exchanges, 4 queues, 6 bindings');
  }

  /**
   * Publish a message to an exchange.
   * Returns true if buffered for delivery (does not wait for broker confirm).
   */
  async publish<T>(exchange: string, routingKey: string, payload: T): Promise<boolean> {
    try {
      await this.channelWrapper.publish(exchange, routingKey, payload, {
        persistent: true,
        timestamp: Date.now(),
        contentType: 'application/json',
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
      await channel.consume(queue, async (msg) => {
        if (!msg) return;
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