import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class MobileApiService {
  constructor(private prisma: PrismaService) {}

  /**
   * Login unificato per tutte le app mobile
   */
  async login(username: string, password: string, appType: string) {
    // Trova operatore per username (matricola o cognome)
    const operator = await this.prisma.inworkOperator.findFirst({
      where: {
        OR: [
          { matricola: username },
          { cognome: username },
        ],
        attivo: true,
      },
    });

    if (!operator) {
      throw new UnauthorizedException('Credenziali non valide');
    }

    // Verifica PIN (per ora confronto semplice, poi vedremo se serve bcrypt)
    if (operator.pin.toString() !== password) {
      throw new UnauthorizedException('Credenziali non valide');
    }

    // Costruisci risposta con dati app-specific
    const response = {
      status: 'success',
      message: 'Login effettuato con successo',
      data: {
        id: operator.id,
        user: operator.matricola,
        full_name: `${operator.nome} ${operator.cognome}`,
        reparto: operator.reparto,
        app_type: appType,
        permissions: this.getPermissions(appType),
        features: this.getFeatures(appType),
      },
    };

    return response;
  }

  /**
   * Profilo operatore con statistiche app-specific
   */
  async getProfile(id: number, appType: string) {
    const operator = await this.prisma.inworkOperator.findUnique({
      where: { id },
    });

    if (!operator) {
      throw new NotFoundException('Operatore non trovato');
    }

    const stats = await this.getStatsByAppType(id, appType);

    return {
      id: operator.id,
      user: operator.matricola,
      full_name: `${operator.nome} ${operator.cognome}`,
      reparto: operator.reparto,
      statistiche: stats,
    };
  }

  /**
   * Riepilogo giornaliero per app specifica
   */
  async getDailySummary(id: number, data: string, appType: string) {
    const operator = await this.prisma.inworkOperator.findUnique({
      where: { id },
    });

    if (!operator) {
      throw new NotFoundException('Operatore non trovato');
    }

    // Parse data (formato: YYYY-MM-DD)
    const targetDate = new Date(data);
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    if (appType === 'quality') {
      const records = await this.prisma.qualityRecord.findMany({
        where: {
          operatore: `${operator.nome} ${operator.cognome}`,
          dataControllo: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        include: {
          exceptions: true,
        },
      });

      return {
        data,
        totale_controlli: records.length,
        controlli_ok: records.filter((r) => !r.haEccezioni).length,
        controlli_ko: records.filter((r) => r.haEccezioni).length,
        records,
      };
    }

    return { data, message: 'App type non supportato' };
  }

  /**
   * Dati sistema (reparti, linee, taglie, quality, repairs)
   */
  async getSystemData(type: string, nu?: string) {
    const data: any = {};

    if (type === 'all' || type === 'reparti') {
      // Reparti unici dalla tabella core_data - usa campo corretto
      const repartiData = await this.prisma.$queryRaw<Array<{sigla: string, nome: string}>>`
        SELECT DISTINCT sigla_reparto as sigla, reparto as nome
        FROM core_data
        WHERE sigla_reparto IS NOT NULL
      `;
      data.reparti = repartiData;
    }

    if (type === 'all' || type === 'linee') {
      // Linee uniche
      const lineeData = await this.prisma.coreData.findMany({
        distinct: ['ln'],
        select: {
          ln: true,
        },
        where: {
          ln: { not: null },
        },
      });
      data.linee = lineeData.map((l) => ({ sigla: l.ln }));
    }

    if (type === 'all' || type === 'taglie') {
      // Per ora placeholder - implementare logica taglie
      data.taglie = [];
    }

    if (type === 'all' || type === 'quality') {
      // Dati specifici per app Quality
      const reparti = await this.prisma.qualityDepartment.findMany({
        where: { attivo: true },
        orderBy: { ordine: 'asc' },
      });

      const difetti = await this.prisma.qualityDefectType.findMany({
        where: { attivo: true },
        orderBy: { ordine: 'asc' },
      });

      data.reparti_hermes = reparti.map((r) => ({
        id: r.id,
        nome_reparto: r.nomeReparto,
        ordine: r.ordine,
      }));

      data.difetti = difetti.map((d) => ({
        id: d.id,
        descrizione: d.descrizione,
        categoria: d.categoria,
        ordine: d.ordine,
      }));
    }

    return data;
  }

  /**
   * Verifica cartellino/commessa
   */
  async checkData(type: string, value: string) {
    if (type === 'cartellino') {
      const cartel = parseInt(value, 10);
      const coreData = await this.prisma.coreData.findUnique({
        where: { cartel },
      });

      if (!coreData) {
        return {
          status: 'error',
          message: 'Cartellino non trovato',
        };
      }

      return {
        status: 'success',
        data: {
          cartellino: coreData.cartel,
          articolo: coreData.articolo,
          descrizione_articolo: coreData.descrizioneArticolo,
          commessa: coreData.commessaCli,
          cliente: coreData.ragioneSociale,
          linea: coreData.ln,
          paia: coreData.tot,
        },
      };
    }

    return {
      status: 'error',
      message: 'Tipo verifica non supportato',
    };
  }

  // Helper methods

  private getPermissions(appType: string): string[] {
    if (appType === 'quality') {
      return ['cq_view', 'cq_create', 'cq_edit'];
    }
    return [];
  }

  private getFeatures(appType: string): string[] {
    if (appType === 'quality') {
      return ['hermes_cq', 'photo_upload', 'barcode_scan', 'reports'];
    }
    return [];
  }

  private async getStatsByAppType(operatorId: number, appType: string) {
    const operator = await this.prisma.inworkOperator.findUnique({
      where: { id: operatorId },
    });

    if (!operator) {
      return {};
    }

    if (appType === 'quality') {
      const fullName = `${operator.nome} ${operator.cognome}`;

      const totaleControlli = await this.prisma.qualityRecord.count({
        where: { operatore: fullName },
      });

      const controlliOggi = await this.prisma.qualityRecord.count({
        where: {
          operatore: fullName,
          dataControllo: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      });

      return {
        totale_controlli: totaleControlli,
        controlli_oggi: controlliOggi,
      };
    }

    return {};
  }
}
