import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ExportService {
  constructor(private prisma: PrismaService) {}

  // ==================== ARTICOLI MASTER ====================

  async getAllArticlesMaster(search?: string) {
    const where: Prisma.ExportArticleMasterWhereInput = search
      ? {
          OR: [
            { codiceArticolo: { contains: search } },
            { descrizione: { contains: search } },
            { voceDoganale: { contains: search } },
          ],
        }
      : {};

    return this.prisma.exportArticleMaster.findMany({
      where,
      orderBy: { codiceArticolo: 'asc' },
    });
  }

  async getArticleMasterById(id: number) {
    const article = await this.prisma.exportArticleMaster.findUnique({
      where: { id },
      include: { righe: { include: { documento: true } } },
    });

    if (!article) {
      throw new NotFoundException('Articolo non trovato');
    }

    return article;
  }

  async getArticleMasterByCode(codiceArticolo: string) {
    return this.prisma.exportArticleMaster.findUnique({
      where: { codiceArticolo },
    });
  }

  async createArticleMaster(data: {
    codiceArticolo: string;
    descrizione?: string;
    voceDoganale?: string;
    um?: string;
    prezzoUnitario?: number;
  }) {
    // Check duplicati
    const existing = await this.getArticleMasterByCode(data.codiceArticolo);
    if (existing) {
      throw new BadRequestException('Codice articolo già esistente');
    }

    return this.prisma.exportArticleMaster.create({
      data: {
        codiceArticolo: data.codiceArticolo,
        descrizione: data.descrizione,
        voceDoganale: data.voceDoganale,
        um: data.um,
        prezzoUnitario: data.prezzoUnitario,
      },
    });
  }

  async updateArticleMaster(id: number, data: Partial<{
    codiceArticolo: string;
    descrizione: string;
    voceDoganale: string;
    um: string;
    prezzoUnitario: number;
  }>) {
    const existing = await this.getArticleMasterById(id);

    // Se cambio codice, verifica unicità
    if (data.codiceArticolo && data.codiceArticolo !== existing.codiceArticolo) {
      const duplicate = await this.getArticleMasterByCode(data.codiceArticolo);
      if (duplicate) {
        throw new BadRequestException('Codice articolo già esistente');
      }
    }

    return this.prisma.exportArticleMaster.update({
      where: { id },
      data,
    });
  }

  async deleteArticleMaster(id: number) {
    // Verifica se usato in qualche DDT
    const article = await this.prisma.exportArticleMaster.findUnique({
      where: { id },
      include: { righe: true },
    });

    if (!article) {
      throw new NotFoundException('Articolo non trovato');
    }

    if (article.righe.length > 0) {
      throw new BadRequestException(
        `Impossibile eliminare: articolo usato in ${article.righe.length} righe DDT`,
      );
    }

    return this.prisma.exportArticleMaster.delete({
      where: { id },
    });
  }

  // ==================== TERZISTI ====================

  async getAllTerzisti(onlyActive = true) {
    return this.prisma.exportTerzista.findMany({
      where: onlyActive ? { attivo: true } : undefined,
      orderBy: { ragioneSociale: 'asc' },
    });
  }

  async getTerzistaById(id: number) {
    const terzista = await this.prisma.exportTerzista.findUnique({
      where: { id },
      include: {
        documenti: {
          orderBy: { createdAt: 'desc' },
          take: 10, // ultimi 10 DDT
        },
      },
    });

    if (!terzista) {
      throw new NotFoundException('Terzista non trovato');
    }

    return terzista;
  }

  async createTerzista(data: {
    ragioneSociale: string;
    indirizzo1?: string;
    indirizzo2?: string;
    indirizzo3?: string;
    nazione?: string;
    consegna?: string;
    autorizzazione?: string;
  }) {
    return this.prisma.exportTerzista.create({
      data,
    });
  }

  async updateTerzista(id: number, data: Partial<{
    ragioneSociale: string;
    indirizzo1: string;
    indirizzo2: string;
    indirizzo3: string;
    nazione: string;
    consegna: string;
    autorizzazione: string;
    attivo: boolean;
  }>) {
    await this.getTerzistaById(id); // Check exists

    return this.prisma.exportTerzista.update({
      where: { id },
      data,
    });
  }

  async deleteTerzista(id: number) {
    // Verifica se usato in DDT
    const terzista = await this.prisma.exportTerzista.findUnique({
      where: { id },
      include: { documenti: true },
    });

    if (!terzista) {
      throw new NotFoundException('Terzista non trovato');
    }

    if (terzista.documenti.length > 0) {
      throw new BadRequestException(
        `Impossibile eliminare: terzista usato in ${terzista.documenti.length} DDT`,
      );
    }

    return this.prisma.exportTerzista.delete({
      where: { id },
    });
  }

  // ==================== DOCUMENTI DDT ====================

  async getAllDocuments(filters?: {
    stato?: string;
    terzistaId?: number;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
  }) {
    const where: Prisma.ExportDocumentWhereInput = {};

    if (filters?.stato) {
      where.stato = filters.stato;
    }

    if (filters?.terzistaId) {
      where.terzistaId = filters.terzistaId;
    }

    if (filters?.dateFrom || filters?.dateTo) {
      where.data = {};
      if (filters.dateFrom) {
        where.data.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.data.lte = new Date(filters.dateTo);
      }
    }

    if (filters?.search) {
      where.OR = [
        { progressivo: { contains: filters.search } },
        { autorizzazione: { contains: filters.search } },
        { commento: { contains: filters.search } },
      ];
    }

    return this.prisma.exportDocument.findMany({
      where,
      include: {
        terzista: true,
        righe: {
          include: { article: true },
        },
        piede: true,
        _count: {
          select: {
            righe: true,
            mancanti: true,
            lanci: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDocumentByProgressivo(progressivo: string) {
    const document = await this.prisma.exportDocument.findUnique({
      where: { progressivo },
      include: {
        terzista: true,
        righe: {
          include: { article: true },
          orderBy: [
            { isMancante: 'asc' }, // Prima normali, poi mancanti
            { createdAt: 'asc' },
          ],
        },
        piede: true,
        mancanti: {
          orderBy: { codiceArticolo: 'asc' },
        },
        lanci: {
          orderBy: { lancio: 'asc' },
        },
      },
    });

    if (!document) {
      throw new NotFoundException('Documento non trovato');
    }

    return document;
  }

  async createDocument(data: {
    progressivo: string;
    terzistaId: number;
    data: string; // YYYY-MM-DD
    autorizzazione?: string;
    commento?: string;
  }) {
    // Check progressivo duplicato
    const existing = await this.prisma.exportDocument.findUnique({
      where: { progressivo: data.progressivo },
    });

    if (existing) {
      throw new BadRequestException('Progressivo già esistente');
    }

    // Check terzista exists
    await this.getTerzistaById(data.terzistaId);

    return this.prisma.exportDocument.create({
      data: {
        progressivo: data.progressivo,
        terzistaId: data.terzistaId,
        data: new Date(data.data),
        autorizzazione: data.autorizzazione,
        commento: data.commento,
        stato: 'Aperto',
        firstBoot: true,
      },
      include: {
        terzista: true,
      },
    });
  }

  async updateDocument(progressivo: string, data: Partial<{
    terzistaId: number;
    data: string;
    stato: string;
    autorizzazione: string;
    commento: string;
    firstBoot: boolean;
  }>) {
    await this.getDocumentByProgressivo(progressivo); // Check exists

    const updateData: any = {};

    if (data.terzistaId !== undefined) {
      await this.getTerzistaById(data.terzistaId);
      updateData.terzistaId = data.terzistaId;
    }

    if (data.data) {
      updateData.data = new Date(data.data);
    }

    if (data.stato) {
      updateData.stato = data.stato;
    }

    if (data.autorizzazione !== undefined) {
      updateData.autorizzazione = data.autorizzazione;
    }

    if (data.commento !== undefined) {
      updateData.commento = data.commento;
    }

    if (data.firstBoot !== undefined) {
      updateData.firstBoot = data.firstBoot;
    }

    return this.prisma.exportDocument.update({
      where: { progressivo },
      data: updateData,
      include: {
        terzista: true,
        righe: {
          include: { article: true },
        },
        piede: true,
      },
    });
  }

  async deleteDocument(progressivo: string) {
    await this.getDocumentByProgressivo(progressivo); // Check exists

    return this.prisma.exportDocument.delete({
      where: { progressivo },
    });
  }

  async closeDocument(progressivo: string) {
    return this.updateDocument(progressivo, { stato: 'Chiuso' });
  }

  async reopenDocument(progressivo: string) {
    return this.updateDocument(progressivo, { stato: 'Aperto' });
  }

  // ==================== RIGHE DOCUMENTO ====================

  async addDocumentItem(data: {
    documentoId: number;
    articleId?: number;
    qtaOriginale: number;
    qtaReale?: number;
    // Per righe libere
    codiceLibero?: string;
    descrizioneLibera?: string;
    voceLibera?: string;
    umLibera?: string;
    prezzoLibero?: number;
  }) {
    // Se ha articleId, verifica exists
    if (data.articleId) {
      await this.getArticleMasterById(data.articleId);
    }

    return this.prisma.exportDocumentItem.create({
      data: {
        documentoId: data.documentoId,
        articleId: data.articleId,
        qtaOriginale: data.qtaOriginale,
        qtaReale: data.qtaReale || data.qtaOriginale,
        tipoRiga: data.articleId ? 'articolo' : 'libera',
        codiceLibero: data.codiceLibero,
        descrizioneLibera: data.descrizioneLibera,
        voceLibera: data.voceLibera,
        umLibera: data.umLibera,
        prezzoLibero: data.prezzoLibero,
      },
      include: {
        article: true,
      },
    });
  }

  async updateDocumentItem(id: number, data: {
    qtaOriginale?: number;
    qtaReale?: number;
    // Per righe libere
    codiceLibero?: string;
    descrizioneLibera?: string;
    voceLibera?: string;
    umLibera?: string;
    prezzoLibero?: number;
  }) {
    return this.prisma.exportDocumentItem.update({
      where: { id },
      data,
      include: {
        article: true,
      },
    });
  }

  async deleteDocumentItem(id: number) {
    return this.prisma.exportDocumentItem.delete({
      where: { id },
    });
  }

  // ==================== PIEDE DOCUMENTO ====================

  async upsertDocumentFooter(documentoId: number, data: {
    aspettoColli?: string;
    nColli?: number;
    totPesoLordo?: number;
    totPesoNetto?: number;
    trasportatore?: string;
    consegnatoPer?: string;
    vociDoganali?: Array<{ voce: string; peso: number }>;
  }) {
    const existing = await this.prisma.exportDocumentFooter.findUnique({
      where: { documentoId },
    });

    const footerData: any = {
      aspettoColli: data.aspettoColli,
      nColli: data.nColli,
      totPesoLordo: data.totPesoLordo,
      totPesoNetto: data.totPesoNetto,
      trasportatore: data.trasportatore,
      consegnatoPer: data.consegnatoPer,
    };

    if (data.vociDoganali !== undefined) {
      footerData.vociDoganali = data.vociDoganali;
    }

    if (existing) {
      return this.prisma.exportDocumentFooter.update({
        where: { documentoId },
        data: footerData,
      });
    } else {
      return this.prisma.exportDocumentFooter.create({
        data: {
          ...footerData,
          documentoId,
        },
      });
    }
  }

  async getDocumentFooter(documentoId: number) {
    return this.prisma.exportDocumentFooter.findUnique({
      where: { documentoId },
    });
  }

  // ==================== MANCANTI ====================

  async addMissingData(documentoId: number, data: {
    codiceArticolo: string;
    qtaMancante: number;
    descrizione?: string;
  }) {
    return this.prisma.exportMissingData.create({
      data: {
        documentoId,
        codiceArticolo: data.codiceArticolo,
        qtaMancante: data.qtaMancante,
        descrizione: data.descrizione,
      },
    });
  }

  async getMissingDataForDocument(documentoId: number) {
    return this.prisma.exportMissingData.findMany({
      where: { documentoId },
      orderBy: { codiceArticolo: 'asc' },
    });
  }

  async deleteMissingData(id: number) {
    return this.prisma.exportMissingData.delete({
      where: { id },
    });
  }

  // ==================== LANCI ====================

  async addLaunchData(documentoId: number, data: {
    lancio: string;
    articolo: string;
    paia: number;
    note?: string;
  }) {
    return this.prisma.exportLaunchData.create({
      data: {
        documentoId,
        lancio: data.lancio,
        articolo: data.articolo,
        paia: data.paia,
        note: data.note,
      },
    });
  }

  async getLaunchDataForDocument(documentoId: number) {
    return this.prisma.exportLaunchData.findMany({
      where: { documentoId },
      orderBy: { lancio: 'asc' },
    });
  }

  async deleteLaunchData(id: number) {
    return this.prisma.exportLaunchData.delete({
      where: { id },
    });
  }

  // ==================== UTILITY ====================

  async generateNextProgressivo() {
    // Formato: YYYYMMDD-NNN
    const today = new Date();
    const prefix = today.toISOString().slice(0, 10).replace(/-/g, '');

    const lastToday = await this.prisma.exportDocument.findFirst({
      where: {
        progressivo: {
          startsWith: prefix,
        },
      },
      orderBy: {
        progressivo: 'desc',
      },
    });

    if (!lastToday) {
      return `${prefix}-001`;
    }

    const lastNum = parseInt(lastToday.progressivo.split('-')[1] || '0');
    const nextNum = (lastNum + 1).toString().padStart(3, '0');

    return `${prefix}-${nextNum}`;
  }
}
