import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Eccezione personalizzata per errori di connessione al database
 */
export class DatabaseConnectionException extends HttpException {
  constructor(details?: string) {
    const message = details
      ? `Impossibile connettersi al database. Dettagli: ${details}`
      : 'Impossibile connettersi al database. Verificare che il server database sia attivo e raggiungibile.';

    super(
      {
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        error: 'Errore Connessione Database',
        message,
        timestamp: new Date().toISOString(),
      },
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
}

/**
 * Eccezione per errori generici del database
 */
export class DatabaseQueryException extends HttpException {
  constructor(operation: string, details?: string) {
    const message = details
      ? `Errore durante l'operazione "${operation}" sul database. Dettagli: ${details}`
      : `Errore durante l'operazione "${operation}" sul database.`;

    super(
      {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        error: 'Errore Database',
        message,
        timestamp: new Date().toISOString(),
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}

/**
 * Eccezione per violazioni di constraint (unique, foreign key, ecc.)
 */
export class DatabaseConstraintException extends HttpException {
  constructor(constraintType: string, details?: string) {
    const messages: Record<string, string> = {
      unique: 'Il valore inserito esiste già nel database.',
      foreign: 'Impossibile completare l\'operazione: riferimento a dati inesistenti.',
      notNull: 'Campo obbligatorio mancante.',
      check: 'I dati inseriti non rispettano i vincoli di validazione.',
    };

    const message = messages[constraintType] || 'Violazione di vincolo database.';
    const fullMessage = details ? `${message} Dettagli: ${details}` : message;

    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Vincolo Database Violato',
        message: fullMessage,
        timestamp: new Date().toISOString(),
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

/**
 * Eccezione per timeout del database
 */
export class DatabaseTimeoutException extends HttpException {
  constructor(operation: string) {
    super(
      {
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        error: 'Timeout Database',
        message: `L'operazione "${operation}" ha impiegato troppo tempo. Il database potrebbe essere sovraccarico o irraggiungibile.`,
        timestamp: new Date().toISOString(),
      },
      HttpStatus.REQUEST_TIMEOUT,
    );
  }
}
