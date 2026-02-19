import { PrismaClient } from '@prisma/client';
import * as Minio from 'minio';

export interface CompanyInfo {
  nomeAzienda: string;
  partitaIva: string;
  indirizzo: string;
  citta: string;
  cap: string;
  provincia: string;
  telefono: string;
  email: string;
}

/**
 * Legge il buffer del logo documenti da MinIO.
 * Restituisce null se il logo non è configurato o non è recuperabile.
 * Usato dagli handler PDF che non possono iniettare servizi NestJS.
 */
export async function getLogoBuffer(prisma: PrismaClient): Promise<Buffer | null> {
  try {
    const setting = await prisma.setting.findUnique({ where: { key: 'general.logoDocumenti' } });
    if (!setting?.value) return null;

    const client = new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: parseInt(process.env.MINIO_PORT || '9000'),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin123',
    });
    const bucket = process.env.MINIO_BUCKET || 'coregre-storage';

    const stream = await client.getObject(bucket, setting.value);
    return await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  } catch {
    return null;
  }
}

/**
 * Legge i dati aziendali dalla tabella core_settings.
 * Usato dagli handler PDF che non possono iniettare servizi NestJS.
 */
export async function getCompanyInfo(prisma: PrismaClient): Promise<CompanyInfo> {
  const settings = await prisma.setting.findMany({
    where: { group: 'general' },
  });

  const map: Record<string, string> = {};
  settings.forEach(s => { map[s.key] = s.value || ''; });

  return {
    nomeAzienda: map['general.nomeAzienda'] || '',
    partitaIva:  map['general.partitaIva']  || '',
    indirizzo:   map['general.indirizzo']   || '',
    citta:       map['general.citta']       || '',
    cap:         map['general.cap']         || '',
    provincia:   map['general.provincia']   || '',
    telefono:    map['general.telefono']    || '',
    email:       map['general.email']       || '',
  };
}
