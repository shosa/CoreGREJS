import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private isConnected = false;

  async onModuleInit() {
    try {
      await this.$connect();
      this.isConnected = true;
      this.logger.log('✓ Connessione al database stabilita');
    } catch (error: any) {
      this.isConnected = false;
      this.logger.warn('⚠️  Impossibile connettersi al database all\'avvio');
      this.logger.warn('   Il backend è operativo ma le richieste al database falliranno');
      // Non rilanciare l'errore - permetti all'applicazione di avviarsi comunque
    }
  }

  async onModuleDestroy() {
    if (this.isConnected) {
      await this.$disconnect();
      this.logger.log('Database disconnesso');
    }
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}
