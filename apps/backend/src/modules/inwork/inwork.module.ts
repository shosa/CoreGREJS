import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { InworkController } from './inwork.controller';
import { InworkService } from './inwork.service';

@Module({
  imports: [PrismaModule],
  controllers: [InworkController],
  providers: [InworkService],
  exports: [InworkService],
})
export class InworkModule {}
