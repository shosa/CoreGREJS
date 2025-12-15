import { Module } from '@nestjs/common';
import { ScmController } from './scm.controller';
import { ScmService } from './scm.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ScmController],
  providers: [ScmService],
  exports: [ScmService],
})
export class ScmModule {}
