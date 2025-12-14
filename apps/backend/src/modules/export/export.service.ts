import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import { Prisma } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

@Injectable()
export class ExportService {
  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
  ) {}

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
      orderBy: { codiceArticolo: "asc" },
    });
  }

  async getArticleMasterById(id: number) {
    const article = await this.prisma.exportArticleMaster.findUnique({
      where: { id },
      include: { righe: { include: { documento: true } } },
    });

    if (!article) {
      throw new NotFoundException("Articolo non trovato");
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
      throw new BadRequestException("Codice articolo già esistente");
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

  async updateArticleMaster(
    id: number,
    data: Partial<{
      codiceArticolo: string;
      descrizione: string;
      voceDoganale: string;
      um: string;
      prezzoUnitario: number;
    }>
  ) {
    const existing = await this.getArticleMasterById(id);

    // Se cambio codice, verifica unicità
    if (
      data.codiceArticolo &&
      data.codiceArticolo !== existing.codiceArticolo
    ) {
      const duplicate = await this.getArticleMasterByCode(data.codiceArticolo);
      if (duplicate) {
        throw new BadRequestException("Codice articolo già esistente");
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
      throw new NotFoundException("Articolo non trovato");
    }

    if (article.righe.length > 0) {
      throw new BadRequestException(
        `Impossibile eliminare: articolo usato in ${article.righe.length} righe DDT`
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
      orderBy: { ragioneSociale: "asc" },
    });
  }

  async getTerzistaById(id: number) {
    const terzista = await this.prisma.exportTerzista.findUnique({
      where: { id },
      include: {
        documenti: {
          orderBy: { createdAt: "desc" },
          take: 10, // ultimi 10 DDT
        },
      },
    });

    if (!terzista) {
      throw new NotFoundException("Terzista non trovato");
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

  async updateTerzista(
    id: number,
    data: Partial<{
      ragioneSociale: string;
      indirizzo1: string;
      indirizzo2: string;
      indirizzo3: string;
      nazione: string;
      consegna: string;
      autorizzazione: string;
      attivo: boolean;
    }>
  ) {
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
      throw new NotFoundException("Terzista non trovato");
    }

    if (terzista.documenti.length > 0) {
      throw new BadRequestException(
        `Impossibile eliminare: terzista usato in ${terzista.documenti.length} DDT`
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
      orderBy: { createdAt: "desc" },
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
            { isMancante: "asc" }, // Prima normali, poi mancanti
            { createdAt: "asc" },
          ],
        },
        piede: true,
        mancanti: {
          include: { article: true },
          orderBy: { article: { codiceArticolo: "asc" } },
        },
        lanci: {
          orderBy: { lancio: "asc" },
        },
      },
    });

    if (!document) {
      throw new NotFoundException("Documento non trovato");
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
      throw new BadRequestException("Progressivo già esistente");
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
        stato: "Aperto",
        firstBoot: true,
      },
      include: {
        terzista: true,
      },
    });
  }

  async updateDocument(
    progressivo: string,
    data: Partial<{
      terzistaId: number;
      data: string;
      stato: string;
      autorizzazione: string;
      commento: string;
      firstBoot: boolean;
    }>
  ) {
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

    // Delete all files from MinIO for this document
    const prefix = `export/${progressivo}/`;
    try {
      await this.storageService.deletePrefix(prefix);
    } catch (error) {
      // Ignore if no files exist
      console.warn(`Could not delete files for ${progressivo} from MinIO:`, error.message);
    }

    // Delete local files directory (if exists)
    const srcDir = path.join(
      process.cwd(),
      "storage",
      "export",
      "src",
      progressivo
    );
    if (fs.existsSync(srcDir)) {
      fs.rmSync(srcDir, { recursive: true, force: true });
    }

    return this.prisma.exportDocument.delete({
      where: { progressivo },
    });
  }

  async closeDocument(progressivo: string) {
    return this.updateDocument(progressivo, { stato: "Chiuso" });
  }

  async reopenDocument(progressivo: string) {
    return this.updateDocument(progressivo, { stato: "Aperto" });
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
    // Per integrazione mancanti
    isMancante?: boolean;
    rifMancante?: string;
    missingDataId?: number;
  }) {
    // Se ha articleId, verifica exists
    if (data.articleId) {
      await this.getArticleMasterById(data.articleId);
    }

    const createdItem = await this.prisma.exportDocumentItem.create({
      data: {
        documentoId: data.documentoId,
        articleId: data.articleId,
        qtaOriginale: Number(data.qtaOriginale),
        qtaReale: Number(data.qtaReale ?? data.qtaOriginale),
        tipoRiga: data.articleId ? "articolo" : "libera",
        codiceLibero: data.codiceLibero,
        descrizioneLibera: data.descrizioneLibera,
        voceLibera: data.voceLibera,
        umLibera: data.umLibera,
        prezzoLibero: data.prezzoLibero,
        isMancante: data.isMancante ?? false,
        rifMancante: data.rifMancante,
      },
      include: {
        article: true,
      },
    });

    // Se stiamo integrando un mancante, rimuovilo dalla tabella dei mancanti
    if (data.missingDataId) {
      try {
        await this.prisma.exportMissingData.delete({
          where: { id: data.missingDataId },
        });
      } catch (error) {
        // Se il record è già stato eliminato o non esiste, non blocchiamo l'inserimento
        console.warn(
          `Impossibile eliminare exp_dati_mancanti id=${data.missingDataId}:`,
          error
        );
      }
    }

    return createdItem;
  }

  async updateDocumentItem(
    id: number,
    data: {
      qtaOriginale?: number;
      qtaReale?: number;
      // Per righe libere
      codiceLibero?: string;
      descrizioneLibera?: string;
      voceLibera?: string;
      umLibera?: string;
      prezzoLibero?: number;
      // Per aggiornare il master article
      descrizione?: string;
      voceDoganale?: string;
      prezzoUnitario?: number;
    }
  ) {
    // Prima recupera l'item per sapere se è collegato a un master
    const item = await this.prisma.exportDocumentItem.findUnique({
      where: { id },
      include: {
        article: true,
        documento: true,
      },
    });

    if (!item) {
      throw new Error("Document item not found");
    }

    // Se è un articolo master E ci sono campi master da aggiornare
    if (
      item.articleId &&
      (data.descrizione !== undefined ||
        data.voceDoganale !== undefined ||
        data.prezzoUnitario !== undefined)
    ) {
      // Aggiorna il master article
      const masterUpdateData: any = {};
      if (data.descrizione !== undefined)
        masterUpdateData.descrizione = data.descrizione;
      if (data.voceDoganale !== undefined)
        masterUpdateData.voceDoganale = data.voceDoganale;
      if (data.prezzoUnitario !== undefined)
        masterUpdateData.prezzoUnitario = data.prezzoUnitario;

      await this.prisma.exportArticleMaster.update({
        where: { id: item.articleId },
        data: masterUpdateData,
      });
    }

    // Aggiorna l'item del documento (qtaReale, qtaOriginale, campi liberi)
    const itemUpdateData: any = {};
    if (data.qtaOriginale !== undefined)
      itemUpdateData.qtaOriginale = data.qtaOriginale;
    if (data.qtaReale !== undefined) itemUpdateData.qtaReale = data.qtaReale;
    if (data.codiceLibero !== undefined)
      itemUpdateData.codiceLibero = data.codiceLibero;
    if (data.descrizioneLibera !== undefined)
      itemUpdateData.descrizioneLibera = data.descrizioneLibera;
    if (data.voceLibera !== undefined)
      itemUpdateData.voceLibera = data.voceLibera;
    if (data.umLibera !== undefined) itemUpdateData.umLibera = data.umLibera;
    if (data.prezzoLibero !== undefined)
      itemUpdateData.prezzoLibero = data.prezzoLibero;

    const updatedItem = await this.prisma.exportDocumentItem.update({
      where: { id },
      data: itemUpdateData,
      include: {
        article: true,
      },
    });

    // GESTIONE AUTOMATICA MANCANTI: se qtaReale < qtaOriginale
    if (data.qtaReale !== undefined || data.qtaOriginale !== undefined) {
      await this.syncMissingDataForItem(updatedItem);
    }

    return updatedItem;
  }

  /**
   * Sincronizza automaticamente i dati mancanti per un item
   * Se qtaReale < qtaOriginale: crea/aggiorna il mancante
   * Se qtaReale >= qtaOriginale: elimina il mancante se esiste
   */
  private async syncMissingDataForItem(item: any) {
    const qtaDifference = item.qtaOriginale - item.qtaReale;

    // Solo per righe di tipo articolo possiamo creare mancanti
    if (item.tipoRiga !== "articolo" || !item.articleId) {
      return;
    }

    // Cerca se esiste già un mancante per questo articolo
    const existingMissing = await this.prisma.exportMissingData.findFirst({
      where: {
        documentoId: item.documentoId,
        articleId: item.articleId,
      },
    });

    if (qtaDifference > 0) {
      // C'è una differenza: crea o aggiorna il mancante
      if (existingMissing) {
        await this.prisma.exportMissingData.update({
          where: { id: existingMissing.id },
          data: {
            qtaMancante: qtaDifference,
          },
        });
      } else {
        await this.prisma.exportMissingData.create({
          data: {
            documentoId: item.documentoId,
            articleId: item.articleId,
            qtaMancante: qtaDifference,
          },
        });
      }
    } else {
      // Non c'è differenza (qtaReale >= qtaOriginale): elimina il mancante se esiste
      if (existingMissing) {
        await this.prisma.exportMissingData.delete({
          where: { id: existingMissing.id },
        });
      }
    }
  }

  async deleteDocumentItem(id: number) {
    return this.prisma.exportDocumentItem.delete({
      where: { id },
    });
  }

  // ==================== PIEDE DOCUMENTO ====================

  async upsertDocumentFooter(
    documentoId: number,
    data: {
      aspettoColli?: string;
      nColli?: number;
      totPesoLordo?: number;
      totPesoNetto?: number;
      trasportatore?: string;
      consegnatoPer?: string;
      vociDoganali?: Array<{ voce: string; peso: number }>;
    }
  ) {
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

  async addMissingData(
    documentoId: number,
    data: {
      articleId: number;
      qtaMancante: number;
    }
  ) {
    return this.prisma.exportMissingData.create({
      data: {
        documentoId,
        articleId: data.articleId,
        qtaMancante: data.qtaMancante,
      },
    });
  }

  async getMissingDataForDocument(documentoId: number) {
    return this.prisma.exportMissingData.findMany({
      where: { documentoId },
      include: {
        article: true,
      },
      orderBy: { article: { codiceArticolo: "asc" } },
    });
  }

  async getMissingDataFromClosedDocuments(terzistaId: number) {
    // Trova tutti i documenti chiusi del terzista
    const closedDocs = await this.prisma.exportDocument.findMany({
      where: {
        terzistaId,
        stato: "Chiuso",
      },
      select: { id: true, progressivo: true, data: true },
    });

    const docIds = closedDocs.map((d) => d.id);

    // Trova tutti i mancanti di questi documenti
    const mancanti = await this.prisma.exportMissingData.findMany({
      where: {
        documentoId: { in: docIds },
      },
      include: {
        documento: {
          select: {
            progressivo: true,
            data: true,
          },
        },
        article: true,
      },
      orderBy: [
        { documento: { data: "desc" } },
        { article: { codiceArticolo: "asc" } },
      ],
    });

    return mancanti;
  }

  async deleteMissingData(id: number) {
    return this.prisma.exportMissingData.delete({
      where: { id },
    });
  }

  // ==================== LANCI ====================

  async addLaunchData(
    documentoId: number,
    data: {
      lancio: string;
      articolo: string;
      paia: number;
      note?: string;
    }
  ) {
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
      orderBy: { lancio: "asc" },
    });
  }

  async deleteLaunchData(id: number) {
    return this.prisma.exportLaunchData.delete({
      where: { id },
    });
  }

  // ==================== UTILITY ====================

  async generateNextProgressivo() {
    // Recupera tutti i documenti per trovare il MAX numerico
    const allDocuments = await this.prisma.exportDocument.findMany({
      select: {
        progressivo: true,
      },
    });

    if (allDocuments.length === 0) {
      return "1";
    }

    // Converte tutti i progressivi in numeri e trova il massimo
    const maxNum = allDocuments.reduce((max, doc) => {
      const num = parseInt(doc.progressivo);
      if (!isNaN(num) && num > max) {
        return num;
      }
      return max;
    }, 0);

    return (maxNum + 1).toString();
  }
}
