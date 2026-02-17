import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private client: Redis | null = null;
  private readonly logger = new Logger(CacheService.name);
  private connected = false;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    try {
      this.client = new Redis({
        host: this.configService.get<string>('REDIS_HOST', '127.0.0.1'),
        port: Number(this.configService.get<string>('REDIS_PORT', '6379')),
        password: this.configService.get<string>('REDIS_PASSWORD', 'coresuite_redis'),
        keyPrefix: 'coregre:cache:',
        lazyConnect: true,
        retryStrategy: (times) => {
          if (times > 3) return null; // Stop dopo 3 tentativi
          return Math.min(times * 500, 2000);
        },
      });

      this.client.on('connect', () => {
        this.connected = true;
        this.logger.log('Redis cache connesso');
      });

      this.client.on('error', () => {
        this.connected = false;
        // Non loggo per non spammare — RedisExceptionFilter gestisce già
      });

      this.client.connect().catch(() => {
        this.connected = false;
        this.logger.warn('Redis non disponibile — cache disabilitata, tutto funziona senza');
      });
    } catch {
      this.connected = false;
      this.logger.warn('Redis non disponibile — cache disabilitata');
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit().catch(() => {});
    }
  }

  /**
   * Recupera un valore dalla cache, oppure lo calcola e lo salva
   * @param key Chiave cache
   * @param ttlSeconds Tempo di vita in secondi
   * @param fetcher Funzione che recupera il dato dal DB
   */
  async getOrSet<T>(key: string, ttlSeconds: number, fetcher: () => Promise<T>): Promise<T> {
    // Se Redis non è disponibile, vai diretto al DB
    if (!this.connected || !this.client) {
      return fetcher();
    }

    try {
      const cached = await this.client.get(key);
      if (cached) {
        return JSON.parse(cached) as T;
      }
    } catch {
      // Redis fallito, vai al DB
      return fetcher();
    }

    // Cache miss — recupera dal DB
    const data = await fetcher();

    // Salva in cache (fire and forget)
    try {
      await this.client.setex(key, ttlSeconds, JSON.stringify(data));
    } catch {
      // Ignora errori di scrittura cache
    }

    return data;
  }

  /**
   * Invalida una o più chiavi cache
   */
  async invalidate(...keys: string[]): Promise<void> {
    if (!this.connected || !this.client) return;

    try {
      await this.client.del(...keys);
    } catch {
      // Ignora
    }
  }

  /**
   * Invalida tutte le chiavi che matchano un pattern
   */
  async invalidatePattern(pattern: string): Promise<void> {
    if (!this.connected || !this.client) return;

    try {
      // Usa SCAN per non bloccare Redis
      let cursor = '0';
      const fullPattern = `coregre:cache:${pattern}`;
      do {
        const [nextCursor, keys] = await this.client.scan(cursor, 'MATCH', fullPattern, 'COUNT', 100);
        cursor = nextCursor;
        if (keys.length > 0) {
          // Rimuovi il prefisso perché ioredis lo aggiunge automaticamente
          const cleanKeys = keys.map(k => k.replace('coregre:cache:', ''));
          await this.client.del(...cleanKeys);
        }
      } while (cursor !== '0');
    } catch {
      // Ignora
    }
  }
}
