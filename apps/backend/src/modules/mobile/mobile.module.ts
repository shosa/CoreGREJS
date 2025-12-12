import { Module } from '@nestjs/common';
import { DiscoveryController } from './discovery.controller';
import { MobileApiController } from './mobile-api.controller';
import { QualityApiController } from './quality-api.controller';
import { OperatorsController } from './operators.controller';
import { MobileApiService } from './mobile-api.service';
import { QualityApiService } from './quality-api.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DiscoveryController, MobileApiController, QualityApiController, OperatorsController],
  providers: [MobileApiService, QualityApiService],
  exports: [MobileApiService, QualityApiService],
})
export class MobileModule {}
