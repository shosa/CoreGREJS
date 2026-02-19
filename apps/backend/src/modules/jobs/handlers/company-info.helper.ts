import { PrismaClient } from '@prisma/client';

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
