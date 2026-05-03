import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditLog, AuditLogSchema } from './schemas/audit-log.schema';
import { AuditConsumer } from './audit.consumer';

@Module({
    imports: [MongooseModule.forFeature([{ name: AuditLog.name, schema: AuditLogSchema }])],
    providers: [AuditConsumer],
})
export class AuditModule {}