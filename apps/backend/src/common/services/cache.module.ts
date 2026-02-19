import { Global, Module } from '@nestjs/common';
import { CacheService } from './cache.service';
import { WebhookService } from './webhook.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [CacheService, WebhookService],
  exports: [CacheService, WebhookService],
})
export class CacheModule {}
