import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class MobileApiService {
  constructor(private prisma: PrismaService) {}

  /**
   * Lista operatori attivi (action: get_users)
   */
  async getUsers(appType: string) {
    const users = await this.prisma.inworkOperator.findMany({
      where: { attivo: true },
      select: {
        id: true,
        matricola: true,
        nome: true,
        cognome: true,
        reparto: true,
      },
      orderBy: { matricola: 'asc' },
    });

    // L'app si aspetta data come ARRAY DIRETTO di operatori
    return {
      status: 'success',
      data: users.map((u) => ({
        id: u.id,
        user: u.matricola,
        full_name: `${u.nome} ${u.cognome}`,
        reparto: u.reparto,
      })),
    };
  }

  /**
   * Login unificato per tutte le app mobile (action: login)
   */
  async login(username: string, password: string) {
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
      return {
        status: 'error',
        message: 'Credenziali non valide',
      };
    }

    // Verifica PIN
    if (operator.pin !== password) {
      return {
        status: 'error',
        message: 'Credenziali non valide',
      };
    }

    // Recupera moduli abilitati per l'operatore
    const enabledModules = await this.getOperatorEnabledModules(operator.id);

    // L'app salva questi dati in localStorage e usa: user.id, user.user, user.full_name
    // I moduli abilitati determinano quali funzionalità l'operatore può usare
    return {
      status: 'success',
      data: {
        id: operator.id,
        user: operator.matricola,
        full_name: `${operator.nome} ${operator.cognome}`,
        reparto: operator.reparto,
        enabled_modules: enabledModules, // ['quality', 'repairs', etc.]
      },
    };
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

    // Parse data (formato: YYYY-MM-DD dall'app)
    // Crea date separate per evitare mutazioni dell'oggetto
    const startOfDay = new Date(data);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(data);
    endOfDay.setHours(23, 59, 59, 999);

    if (appType === 'quality') {
      // Nella tabella cq_records il campo operatore contiene la matricola, non il nome completo
      const records = await this.prisma.qualityRecord.findMany({
        where: {
          operatore: operator.matricola,
          dataControllo: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        include: {
          exceptions: true,
        },
        orderBy: { dataControllo: 'desc' },
      });

      // L'app si aspetta: { data, summary: { totale, controlli: [...] } }
      const controlli = records.map((r) => ({
        id: r.id,
        numero_cartellino: r.numeroCartellino,
        articolo: r.articolo,
        reparto: r.reparto,
        ora_controllo: r.dataControllo.toLocaleTimeString('it-IT'),
        tipo_cq: r.tipoCq,
        numero_eccezioni: r.exceptions.length,
      }));

      return {
        data: new Date(data).toLocaleDateString('it-IT'),
        summary: {
          totale: records.length,
          controlli,
        },
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

      // L'app si aspetta "nome" non "nome_reparto"
      data.reparti_hermes = reparti.map((r) => ({
        id: r.id,
        nome: r.nomeReparto,
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
          status: 'success',
          exists: false,
          message: 'Cartellino non trovato',
        };
      }

      return {
        status: 'success',
        exists: true,
        message: 'Cartellino trovato',
        data: {
          cartellino: coreData.cartel,
          codice_articolo: coreData.articolo,
          descrizione_articolo: coreData.descrizioneArticolo,
          commessa: coreData.commessaCli,
          cliente: coreData.ragioneSociale,
          linea: coreData.ln,
          paia: coreData.tot,
          nu: coreData.nu,
        },
      };
    } else if (type === 'commessa') {
      const coreData = await this.prisma.coreData.findFirst({
        where: { commessaCli: value },
      });

      if (!coreData) {
        return {
          status: 'success',
          exists: false,
          message: 'Commessa non trovata',
        };
      }

      return {
        status: 'success',
        exists: true,
        message: 'Commessa trovata',
        data: {
          cartellino: coreData.cartel,
          codice_articolo: coreData.articolo,
          descrizione_articolo: coreData.descrizioneArticolo,
          cliente: coreData.ragioneSociale,
          paia: coreData.tot,
          linea: coreData.ln,
          nu: coreData.nu,
        },
      };
    }

    return {
      status: 'error',
      message: 'Tipo non valido. Usa "cartellino" o "commessa"',
    };
  }

  // Helper methods

  /**
   * Recupera i moduli abilitati per un operatore
   * Moduli possibili: 'quality', 'repairs', etc.
   */
  private async getOperatorEnabledModules(operatorId: number): Promise<string[]> {
    const permissions = await this.prisma.inworkModulePermission.findMany({
      where: {
        operatorId,
        enabled: true,
      },
      select: {
        module: true,
      },
    });

    return permissions.map((p) => p.module);
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
