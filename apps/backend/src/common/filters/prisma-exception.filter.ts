import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { LoggerService } from '../services/logger.service';

/**
 * Filtro per eccezioni Prisma con logging dettagliato in italiano
 */
@Catch(
  Prisma.PrismaClientKnownRequestError,
  Prisma.PrismaClientUnknownRequestError,
  Prisma.PrismaClientRustPanicError,
  Prisma.PrismaClientInitializationError,
  Prisma.PrismaClientValidationError,
)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new LoggerService();

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Errore del database.';
    let error = 'Errore Database';
    let logMessage = '';

    // Errori di connessione al database
    if (
      exception instanceof Prisma.PrismaClientInitializationError ||
      exception.code === 'P1001' ||
      exception.message?.includes('Can\'t reach database') ||
      exception.message?.includes('Invalid `') // Query fallita per database non raggiungibile
    ) {
      status = HttpStatus.SERVICE_UNAVAILABLE;
      error = 'Database Non Raggiungibile';
      message = 'Impossibile connettersi al database. Verificare che il server database sia attivo.';
      logMessage = `❌ CONNESSIONE DATABASE FALLITA - Il database non è raggiungibile`;

      this.logger.error(logMessage, undefined, 'Database');
      this.logger.error(
        `📍 Endpoint: ${request.method} ${request.url}`,
        undefined,
        'Database',
      );
      // Log dettagli solo la prima volta per evitare spam nei log
      if (!request.url.includes('dashboard')) {
        this.logger.error(
          `📋 Dettagli tecnici: ${exception.message?.split('\n')[0]}`,
          undefined,
          'Database',
        );
      }
    }
    // Errori di validazione
    else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      error = 'Errore Validazione Dati';
      message = 'I dati forniti non sono validi per l\'operazione richiesta.';
      logMessage = `⚠️  VALIDAZIONE FALLITA - Dati non validi per ${request.url}`;

      this.logger.warn(logMessage, 'Database');
      if (process.env.NODE_ENV === 'development') {
        this.logger.debug(exception.message, 'Database');
      }
    }
    // Errori di constraint (unique, foreign key, ecc.)
    else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const { code, meta } = exception;

      switch (code) {
        case 'P2002': // Unique constraint
          status = HttpStatus.CONFLICT;
          error = 'Valore Duplicato';
          message = `Il valore inserito esiste già. Campo: ${(meta as any)?.target || 'sconosciuto'}`;
          logMessage = `🔒 VINCOLO UNIQUE VIOLATO - Campo: ${(meta as any)?.target}`;
          break;

        case 'P2003': // Foreign key constraint
          status = HttpStatus.BAD_REQUEST;
          error = 'Riferimento Non Valido';
          message = 'Impossibile completare l\'operazione: riferimento a dati inesistenti.';
          logMessage = `🔗 VINCOLO FOREIGN KEY VIOLATO - ${exception.message}`;
          break;

        case 'P2025': // Record not found
          status = HttpStatus.NOT_FOUND;
          error = 'Record Non Trovato';
          message = 'Il record richiesto non esiste nel database.';
          logMessage = `🔍 RECORD NON TROVATO - ${request.url}`;
          break;

        case 'P2014': // Relation violation
          status = HttpStatus.BAD_REQUEST;
          error = 'Violazione Relazione';
          message = 'Impossibile eliminare: esistono dati collegati.';
          logMessage = `⛓️  VIOLAZIONE RELAZIONE - Dati collegati esistenti`;
          break;

        default:
          logMessage = `❌ ERRORE DATABASE (${code}) - ${exception.message}`;
      }

      this.logger.error(logMessage, undefined, 'Database');
      this.logger.error(`📍 Endpoint: ${request.method} ${request.url}`, undefined, 'Database');
    }
    // Errori sconosciuti o panic
    else if (
      exception instanceof Prisma.PrismaClientUnknownRequestError ||
      exception instanceof Prisma.PrismaClientRustPanicError
    ) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      error = 'Errore Critico Database';
      message = 'Si è verificato un errore critico del database.';
      logMessage = `💥 ERRORE CRITICO DATABASE - ${exception.message}`;

      this.logger.error(logMessage, undefined, 'Database');
      this.logger.error(`📍 Endpoint: ${request.method} ${request.url}`, undefined, 'Database');

      // In produzione, notificare gli amministratori
      if (process.env.NODE_ENV === 'production') {
        this.logger.error(
          '🚨 ATTENZIONE: Errore critico del database in produzione!',
          exception.stack,
          'Database',
        );
      }
    }

    // Risposta al client
    response.status(status).json({
      statusCode: status,
      error,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
