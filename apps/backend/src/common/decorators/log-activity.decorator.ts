import { SetMetadata } from '@nestjs/common';

export interface LogActivityMetadata {
  module: string;
  action: string;
  entity?: string;
  description?: string;
}

export const LOG_ACTIVITY_KEY = 'log_activity';

/**
 * Decorator to automatically log controller actions
 *
 * Usage:
 * @LogActivity({ module: 'produzione', action: 'create', entity: 'ProductionRecord' })
 */
export const LogActivity = (metadata: LogActivityMetadata) =>
  SetMetadata(LOG_ACTIVITY_KEY, metadata);
