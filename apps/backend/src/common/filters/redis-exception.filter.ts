import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { LoggerService } from '../services/logger.service';

/**
 * Filtro per gestire errori di connessione a Redis
 */
@Catch()
export class RedisExceptionFilter implements ExceptionFilter {
  private readonly logger = new LoggerService();
  private lastLogTime = 0;
  private readonly LOG_INTERVAL = 30000; // Log ogni 30 secondi max

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Gestisci errori Redis (ECONNREFUSED porta 6379)
    if (
      exception?.code === 'ECONNREFUSED' &&
      (exception?.port === 6379 || exception?.address?.includes('6379'))
    ) {
      const now = Date.now();

      // Log solo se è passato abbastanza tempo dall'ultimo log
      if (now - this.lastLogTime > this.LOG_INTERVAL) {
        this.logger.warn(
          '⚠️  Redis non raggiungibile - Cache disabilitata',
          'Redis',
        );
        this.lastLogTime = now;
      }

      // Non inviare risposta HTTP per errori Redis se non è una richiesta API
      // Lascia che il controller gestisca il fallback
      return;
    }

    // Se non è un errore Redis, passa al prossimo filtro
    throw exception;
  }
}
