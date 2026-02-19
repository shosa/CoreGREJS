import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import axios from 'axios';

export interface WebhookPayload {
  event: string;       // es. "export.create", "quality.create"
  module: string;
  action: string;
  entity?: string;
  entityId?: string;
  description?: string;
  userId?: number;
  timestamp: string;
  data?: any;
}

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Carica i webhook attivi dalla tabella settings
   */
  private async loadActiveWebhooks(): Promise<Array<{ url: string; events: string[]; enabled: boolean }>> {
    try {
      const setting = await this.prisma.setting.findUnique({
        where: { key: 'webhooks.config' },
      });
      if (!setting?.value) return [];
      const webhooks = JSON.parse(setting.value);
      return webhooks.filter((w: any) => w.enabled && w.url);
    } catch {
      return [];
    }
  }

  /**
   * Controlla se un webhook deve scattare per un dato evento
   * events può essere: ['*'], ['export.*'], ['export.create'], ecc.
   */
  private matchesEvent(webhookEvents: string[], eventKey: string): boolean {
    for (const pattern of webhookEvents) {
      if (pattern === '*') return true;
      if (pattern === eventKey) return true;
      // wildcard per modulo: "export.*"
      if (pattern.endsWith('.*')) {
        const prefix = pattern.slice(0, -2);
        if (eventKey.startsWith(prefix + '.')) return true;
      }
    }
    return false;
  }

  /**
   * Dispatch: chiamato dall'ActivityLogInterceptor ad ogni evento
   */
  async dispatch(payload: WebhookPayload): Promise<void> {
    const webhooks = await this.loadActiveWebhooks();
    if (webhooks.length === 0) return;

    const eventKey = `${payload.module}.${payload.action}`;

    const targets = webhooks.filter(w => this.matchesEvent(w.events || ['*'], eventKey));
    if (targets.length === 0) return;

    // Fire in parallelo, senza bloccare il flusso principale
    Promise.all(
      targets.map(webhook =>
        axios.post(webhook.url, payload, {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'CoreGREJS-Webhook/1.0',
            'X-Webhook-Event': eventKey,
          },
        })
        .then(res => {
          this.logger.log(`Webhook OK [${eventKey}] → ${webhook.url} (${res.status})`);
        })
        .catch(err => {
          this.logger.warn(`Webhook FAIL [${eventKey}] → ${webhook.url}: ${err.message}`);
        }),
      ),
    );
  }
}
