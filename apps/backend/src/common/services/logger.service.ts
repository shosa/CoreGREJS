import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';

/**
 * Servizio di logging personalizzato con messaggi in italiano
 */
@Injectable()
export class LoggerService implements NestLoggerService {
  private formatMessage(level: string, message: string, context?: string): string {
    const timestamp = new Date().toLocaleString('it-IT', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const contextStr = context ? ` [${context}]` : '';
    return `[${timestamp}]${contextStr} [${level}] ${message}`;
  }

  private getColor(level: string): string {
    const colors: Record<string, string> = {
      INFO: '\x1b[36m',     // Cyan
      WARN: '\x1b[33m',     // Yellow
      ERROR: '\x1b[31m',    // Red
      DEBUG: '\x1b[35m',    // Magenta
      SUCCESS: '\x1b[32m',  // Green
    };
    return colors[level] || '\x1b[0m';
  }

  log(message: string, context?: string) {
    const formatted = this.formatMessage('INFO', message, context);
    console.log(`${this.getColor('INFO')}${formatted}\x1b[0m`);
  }

  error(message: string, trace?: string, context?: string) {
    const formatted = this.formatMessage('ERROR', message, context);
    console.error(`${this.getColor('ERROR')}${formatted}\x1b[0m`);
    if (trace) {
      console.error(`${this.getColor('ERROR')}Stack trace: ${trace}\x1b[0m`);
    }
  }

  warn(message: string, context?: string) {
    const formatted = this.formatMessage('WARN', message, context);
    console.warn(`${this.getColor('WARN')}${formatted}\x1b[0m`);
  }

  debug(message: string, context?: string) {
    const formatted = this.formatMessage('DEBUG', message, context);
    console.debug(`${this.getColor('DEBUG')}${formatted}\x1b[0m`);
  }

  verbose(message: string, context?: string) {
    this.log(message, context);
  }

  success(message: string, context?: string) {
    const formatted = this.formatMessage('SUCCESS', message, context);
    console.log(`${this.getColor('SUCCESS')}${formatted}\x1b[0m`);
  }

  // Metodi specifici per operazioni comuni
  logDatabaseConnection(success: boolean, details?: string) {
    if (success) {
      this.success('✓ Connessione al database stabilita con successo', 'Database');
    } else {
      this.error(
        `✗ Impossibile connettersi al database${details ? `: ${details}` : ''}`,
        undefined,
        'Database',
      );
    }
  }

  logDatabaseQuery(operation: string, success: boolean, duration?: number) {
    const durationStr = duration ? ` (${duration}ms)` : '';
    if (success) {
      this.debug(`✓ Query eseguita: ${operation}${durationStr}`, 'Database');
    } else {
      this.error(`✗ Errore query: ${operation}`, undefined, 'Database');
    }
  }

  logHttpRequest(method: string, path: string, statusCode: number, duration?: number) {
    const durationStr = duration ? ` - ${duration}ms` : '';
    const level = statusCode >= 500 ? 'ERROR' : statusCode >= 400 ? 'WARN' : 'INFO';

    const message = `${method} ${path} → ${statusCode}${durationStr}`;

    switch (level) {
      case 'ERROR':
        this.error(message, undefined, 'HTTP');
        break;
      case 'WARN':
        this.warn(message, 'HTTP');
        break;
      default:
        this.log(message, 'HTTP');
    }
  }

  logAuthentication(username: string, success: boolean, reason?: string) {
    if (success) {
      this.success(`✓ Autenticazione riuscita per utente: ${username}`, 'Auth');
    } else {
      this.warn(
        `✗ Autenticazione fallita per utente: ${username}${reason ? ` - ${reason}` : ''}`,
        'Auth',
      );
    }
  }

  logModuleInit(moduleName: string) {
    this.success(`✓ Modulo ${moduleName} inizializzato`, 'Sistema');
  }

  logServerStart(port: number | string) {
    console.log('\n' + '='.repeat(60));
    this.success(`🚀 CoreGRE Backend avviato sulla porta ${port}`, 'Sistema');
    this.log(`📚 Documentazione API disponibile su: http://localhost:${port}/api/docs`, 'Sistema');
    this.log(`🏥 Health check disponibile su: http://localhost:${port}/api/health`, 'Sistema');
    console.log('='.repeat(60) + '\n');
  }
}
