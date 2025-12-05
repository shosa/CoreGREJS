import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { LoggerService } from '../services/logger.service';

/**
 * Filtro globale per tutte le eccezioni non gestite
 * Fornisce logging dettagliato in italiano e risposte strutturate
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new LoggerService();

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Si è verificato un errore interno del server.';
    let error = 'Errore Interno';
    let details: any = undefined;

    // Gestione HttpException (incluse le nostre custom exceptions)
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || exception.message;
        error = responseObj.error || 'Errore HTTP';
        details = responseObj.details;
      } else {
        message = exceptionResponse as string;
      }
    }
    // Gestione errori JavaScript nativi
    else if (exception instanceof Error) {
      message = `Errore interno: ${exception.message}`;
      error = exception.name || 'Errore Runtime';
      details = process.env.NODE_ENV === 'development' ? exception.stack : undefined;
    }
    // Errori sconosciuti
    else {
      message = 'Si è verificato un errore sconosciuto.';
      details = process.env.NODE_ENV === 'development' ? String(exception) : undefined;
    }

    // Log dell'errore con dettagli
    this.logError(request, status, error, message, details);

    // Risposta strutturata al client
    const errorResponse = {
      statusCode: status,
      error,
      message: Array.isArray(message) ? message : [message],
      timestamp: new Date().toISOString(),
      path: request.url,
      ...(details && process.env.NODE_ENV === 'development' && { details }),
    };

    response.status(status).json(errorResponse);
  }

  private logError(
    request: Request,
    status: number,
    error: string,
    message: string | string[],
    details?: any,
  ) {
    const method = request.method;
    const url = request.url;
    const userAgent = request.get('user-agent') || 'unknown';
    const ip = request.ip;

    const messageStr = Array.isArray(message) ? message.join(', ') : message;

    // Log base dell'errore
    this.logger.error(
      `${method} ${url} → ${status} | ${error}`,
      undefined,
      'ExceptionFilter',
    );

    // Dettagli aggiuntivi per errori gravi
    if (status >= 500) {
      this.logger.error(`📍 Messaggio: ${messageStr}`, undefined, 'ExceptionFilter');
      this.logger.error(`👤 IP: ${ip} | User-Agent: ${userAgent}`, undefined, 'ExceptionFilter');

      if (details) {
        this.logger.error(`📋 Dettagli tecnici:`, undefined, 'ExceptionFilter');
        console.error(details);
      }
    } else if (status >= 400) {
      this.logger.warn(`⚠️  ${messageStr}`, 'ExceptionFilter');
    }
  }
}
