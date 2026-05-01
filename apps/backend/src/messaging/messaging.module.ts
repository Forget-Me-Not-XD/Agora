// ========== Imports: ==========
import { Global, Module } from '@nestjs/common';
import { RabbitMQService } from './rabbitmq.service';

/**
 * Global messaging module.
 * Marked @Global so any module can inject RabbitMQService without
 * importing MessagingModule explicitly.
 */

@Global()
@Module({
  providers: [RabbitMQService],
  exports: [RabbitMQService],
})
export class MessagingModule {}