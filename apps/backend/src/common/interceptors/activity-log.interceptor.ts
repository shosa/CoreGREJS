import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ActivityLogService } from '../../modules/activity-log/activity-log.service';
import { WebhookService } from '../services/webhook.service';
import { LOG_ACTIVITY_KEY, LogActivityMetadata } from '../decorators/log-activity.decorator';

@Injectable()
export class ActivityLogInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    private activityLogService: ActivityLogService,
    private webhookService: WebhookService,
  ) {}

  /**
   * Sanitize request body by removing sensitive fields
   */
  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sensitiveFields = ['password', 'currentPassword', 'newPassword', 'confirmPassword', 'token', 'secret'];
    const sanitized = { ...body };

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '***';
      }
    }

    return sanitized;
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const metadata = this.reflector.get<LogActivityMetadata>(
      LOG_ACTIVITY_KEY,
      context.getHandler(),
    );

    if (!metadata) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const userId = user?.userId || user?.id;

    return next.handle().pipe(
      tap((data) => {
        // Extract entity ID from response if available
        let entityId: string | undefined;
        if (data && typeof data === 'object') {
          entityId = data.id || data.idRiparazione || data.progressivo;
        }

        // Get IP and User Agent
        const ipAddress = request.ip || request.connection?.remoteAddress;
        const userAgent = request.headers['user-agent'];

        // Log the activity
        this.activityLogService.log({
          userId,
          module: metadata.module,
          action: metadata.action,
          entity: metadata.entity,
          entityId,
          description: metadata.description,
          metadata: {
            method: request.method,
            url: request.url,
            params: request.params,
            body: this.sanitizeBody(request.body),
            query: request.query,
          },
          ipAddress,
          userAgent,
        });

        // Dispatch webhooks (fire-and-forget, non blocca il flusso)
        this.webhookService.dispatch({
          event: `${metadata.module}.${metadata.action}`,
          module: metadata.module,
          action: metadata.action,
          entity: metadata.entity,
          entityId: entityId ? String(entityId) : undefined,
          description: metadata.description,
          userId,
          timestamp: new Date().toISOString(),
          data: {
            params: request.params,
            query: request.query,
          },
        });
      }),
    );
  }
}
