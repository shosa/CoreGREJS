import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/services/cache.service';

@Injectable()
export class TrackingService {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
  ) {}

  // ==================== STATS ====================
  async getStats() {
    return this.cache.getOrSet('tracking:stats', 120, () => this._computeStats());
  }

  private async _computeStats() {
    const [linksCount, lotsWithoutDdt, ordersWithoutDate, articlesWithoutSku] = await Promise.all([
      this.prisma.trackLink.count(),
      this.prisma.$queryRaw<[{count: bigint}]>`
        SELECT COUNT(DISTINCT tl.lot) as count
        FROM track_links tl
        LEFT JOIN track_lots_info tli ON tl.lot = tli.lot
        WHERE tli.doc IS NULL OR tli.doc = ''
      `.then(r => Number(r[0]?.count || 0)),
      this.prisma.$queryRaw<[{count: bigint}]>`
        SELECT COUNT(DISTINCT cd.Ordine) as count
        FROM track_links tl
        JOIN core_dati cd ON tl.cartel = cd.Cartel
        LEFT JOIN track_order_info toi ON CAST(cd.Ordine AS CHAR) COLLATE utf8mb4_unicode_ci = toi.ordine COLLATE utf8mb4_unicode_ci
        WHERE cd.Ordine IS NOT NULL AND toi.date IS NULL
      `.then(r => Number(r[0]?.count || 0)),
      this.prisma.$queryRaw<[{count: bigint}]>`
        SELECT COUNT(DISTINCT cd.Articolo) as count
        FROM track_links tl
        JOIN core_dati cd ON tl.cartel = cd.Cartel
        LEFT JOIN track_sku ts ON cd.Articolo COLLATE utf8mb4_unicode_ci = ts.art COLLATE utf8mb4_unicode_ci
        WHERE cd.Articolo IS NOT NULL AND (ts.sku IS NULL OR ts.sku = '')
      `.then(r => Number(r[0]?.count || 0)),
    ]);

    return {
      totalLinks: linksCount,
      lotsWithoutDdt,
      ordersWithoutDate,
      articlesWithoutSku,
    };
  }

  // ==================== TYPES ====================
  async findAllTypes() {
    return this.cache.getOrSet('tracking:types', 600, () =>
      this.prisma.trackType.findMany({
        orderBy: { name: 'asc' },
      }),
    );
  }

  async createType(name: string, note?: string) {
    const result = await this.prisma.trackType.create({
      data: { name, note },
    });
    await this.cache.invalidate('tracking:types');
    return result;
  }

  // ==================== SEARCH DATA (multisearch) ====================
  async searchData(filters: {
    cartellino?: string;
    commessa?: string;
    articolo?: string;
    descrizione?: string;
    linea?: string;
    ragioneSociale?: string;
    ordine?: string;
    page?: number;
    limit?: number;
  }) {
    const { cartellino, commessa, articolo, descrizione, linea, ragioneSociale, ordine, page = 1, limit = 50 } = filters;
    const offset = (page - 1) * limit;

    // Build where clause for Legacy structure
    const whereConditions: any[] = [];

    if (cartellino) {
      // Cerca cartellini che iniziano con le cifre inserite
      const cartelStr = cartellino.trim();
      if (/^\d+$/.test(cartelStr)) {
        const baseNum = parseInt(cartelStr);
        // Genera range per tutte le possibili lunghezze di cartellino (da input a 8 cifre)
        const ranges: any[] = [];
        for (let totalDigits = cartelStr.length; totalDigits <= 8; totalDigits++) {
          const multiplier = Math.pow(10, totalDigits - cartelStr.length);
          ranges.push({
            cartel: { gte: baseNum * multiplier, lt: (baseNum + 1) * multiplier }
          });
        }
        whereConditions.push({ OR: ranges });
      }
    }
    if (commessa) {
      whereConditions.push({ commessaCli: { contains: commessa } });
    }
    if (articolo) {
      whereConditions.push({ articolo: { contains: articolo } });
    }
    if (descrizione) {
      whereConditions.push({ descrizioneArticolo: { contains: descrizione } });
    }
    if (linea) {
      whereConditions.push({ ln: { contains: linea } });
    }
    if (ragioneSociale) {
      whereConditions.push({ ragioneSociale: { contains: ragioneSociale } });
    }
    if (ordine) {
      const ordineNum = parseInt(ordine);
      if (!isNaN(ordineNum)) {
        whereConditions.push({ ordine: ordineNum });
      }
    }

    const where = whereConditions.length > 0 ? { AND: whereConditions } : {};

    const results = await this.prisma.coreData.findMany({
      where,
      skip: offset,
      take: limit,
      orderBy: { cartel: 'desc' },
    });

    const total = await this.prisma.coreData.count({ where });

    // Map results for frontend compatibility
    const mappedResults = results.map(r => ({
      id: r.cartel || r.id,
      cartellino: r.cartel?.toString(),
      commessa: r.commessaCli,
      modello: r.articolo,
      descrizione: r.descrizioneArticolo,
      colore: null,
      cliente: r.ragioneSociale,
      ordine: r.ordine,
      linea: r.ln,
      tot: r.tot,
      paia: r.tot,
    }));

    return {
      data: mappedResults,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ==================== CHECK CARTEL (ordersearch) ====================
  async checkCartel(cartellino: string) {
    const cartelNum = parseInt(cartellino);
    if (isNaN(cartelNum)) {
      return { valid: false, message: 'Cartellino non valido' };
    }

    const record = await this.prisma.coreData.findFirst({
      where: { cartel: cartelNum },
    });

    if (!record) {
      return { valid: false, message: 'Cartellino non trovato' };
    }

    return {
      valid: true,
      data: {
        id: record.cartel,
        cartellino: record.cartel?.toString(),
        commessa: record.commessaCli,
        modello: record.articolo,
        descrizione: record.descrizioneArticolo,
        cliente: record.ragioneSociale,
        paia: record.tot,
      },
    };
  }

  // ==================== SAVE LINKS (processlinks) ====================
  async saveLinks(data: { typeId: number; lots: string[]; cartelli: number[] }) {
    const { typeId, lots, cartelli } = data;
    const created: any[] = [];

    for (const cartel of cartelli) {
      for (const lot of lots) {
        const trimmedLot = lot.trim();
        if (!trimmedLot) continue;

        const link = await this.prisma.trackLink.create({
          data: {
            cartel,
            typeId,
            lot: trimmedLot,
          },
        });
        created.push(link);
      }
    }

    await this.cache.invalidate('tracking:stats');
    return { created: created.length, links: created };
  }

  // ==================== TREE DATA (treeview) ====================
  async getTreeData(searchQuery?: string, page = 1, limit = 25) {
    const offset = (page - 1) * limit;

    // Se searchQuery è "*" o vuoto, mostra tutto
    const isShowAll = !searchQuery || searchQuery === '*';

    let whereClause = {};
    if (!isShowAll && searchQuery) {
      whereClause = {
        OR: [
          { lot: { startsWith: searchQuery } },
          { cartel: isNaN(parseInt(searchQuery)) ? undefined : parseInt(searchQuery) },
        ],
      };
    }

    const links = await this.prisma.trackLink.findMany({
      where: whereClause,
      include: {
        type: true,
      },
      skip: offset,
      take: limit,
      orderBy: { timestamp: 'desc' },
    });

    const total = await this.prisma.trackLink.count({ where: whereClause });

    // Raggruppa per cartellino > tipo > lotti
    const grouped: Record<number, { cartel: number; commessa: string; articolo: string; types: Record<number, { type: any; lots: any[] }> }> = {};

    for (const link of links) {
      if (!grouped[link.cartel]) {
        // Carica dati core_dati per il cartellino
        const coreData = await this.prisma.coreData.findFirst({
          where: { cartel: link.cartel },
          select: {
            commessaCli: true,
            articolo: true,
          },
        });

        grouped[link.cartel] = {
          cartel: link.cartel,
          commessa: coreData?.commessaCli || '',
          articolo: coreData?.articolo || '',
          types: {}
        };
      }
      if (!grouped[link.cartel].types[link.typeId]) {
        grouped[link.cartel].types[link.typeId] = { type: link.type, lots: [] };
      }
      grouped[link.cartel].types[link.typeId].lots.push({
        id: link.id,
        lot: link.lot,
        note: link.note,
        timestamp: link.timestamp,
      });
    }

    return {
      tree: Object.values(grouped).map(g => ({
        cartel: g.cartel,
        commessa: g.commessa,
        articolo: g.articolo,
        types: Object.values(g.types),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ==================== UPDATE/DELETE LOT (treeview edit) ====================
  async updateLot(id: number, lot: string) {
    const link = await this.prisma.trackLink.findUnique({ where: { id } });
    if (!link) {
      throw new NotFoundException('Link non trovato');
    }

    return this.prisma.trackLink.update({
      where: { id },
      data: { lot },
    });
  }

  async deleteLink(id: number) {
    const link = await this.prisma.trackLink.findUnique({ where: { id } });
    if (!link) {
      throw new NotFoundException('Link non trovato');
    }
    const result = await this.prisma.trackLink.delete({ where: { id } });
    await this.cache.invalidate('tracking:stats');
    return result;
  }

  // ==================== LOT DETAIL (3 tabs) ====================

  // Tab 1: Lotti senza DDT
  async getLotsWithoutDdt(page = 1, limit = 50) {
    const offset = (page - 1) * limit;

    const lots = await this.prisma.$queryRaw<any[]>`
      SELECT DISTINCT tl.lot, tli.doc, tli.date, tli.note
      FROM track_links tl
      LEFT JOIN track_lots_info tli ON tl.lot COLLATE utf8mb4_unicode_ci = tli.lot COLLATE utf8mb4_unicode_ci
      WHERE tli.doc IS NULL OR tli.doc = ''
      ORDER BY tl.lot
      LIMIT ${limit} OFFSET ${offset}
    `;

    const total = await this.prisma.$queryRaw<[{count: bigint}]>`
      SELECT COUNT(DISTINCT tl.lot) as count
      FROM track_links tl
      LEFT JOIN track_lots_info tli ON tl.lot COLLATE utf8mb4_unicode_ci = tli.lot COLLATE utf8mb4_unicode_ci
      WHERE tli.doc IS NULL OR tli.doc = ''
    `.then(r => Number(r[0]?.count || 0));

    return { data: lots, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // Tab 1b: Lotti CON DDT (già compilati)
  async getLotsWithDdt(page = 1, limit = 50) {
    const offset = (page - 1) * limit;

    const lots = await this.prisma.$queryRaw<any[]>`
      SELECT DISTINCT tl.lot, tli.doc, tli.date, tli.note
      FROM track_links tl
      JOIN track_lots_info tli ON tl.lot COLLATE utf8mb4_unicode_ci = tli.lot COLLATE utf8mb4_unicode_ci
      WHERE tli.doc IS NOT NULL AND tli.doc != ''
      ORDER BY tl.lot DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const total = await this.prisma.$queryRaw<[{count: bigint}]>`
      SELECT COUNT(DISTINCT tl.lot) as count
      FROM track_links tl
      JOIN track_lots_info tli ON tl.lot COLLATE utf8mb4_unicode_ci = tli.lot COLLATE utf8mb4_unicode_ci
      WHERE tli.doc IS NOT NULL AND tli.doc != ''
    `.then(r => Number(r[0]?.count || 0));

    return { data: lots, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // Tab 2: Ordini senza date - mostra numero ordine da core_dati
  async getOrdersWithoutDate(page = 1, limit = 50) {
    const offset = (page - 1) * limit;

    const orders = await this.prisma.$queryRaw<any[]>`
      SELECT DISTINCT cd.Ordine as ordine, toi.date
      FROM track_links tl
      JOIN core_dati cd ON tl.cartel = cd.Cartel
      LEFT JOIN track_order_info toi ON CAST(cd.Ordine AS CHAR) COLLATE utf8mb4_unicode_ci = toi.ordine COLLATE utf8mb4_unicode_ci
      WHERE cd.Ordine IS NOT NULL AND (toi.date IS NULL)
      ORDER BY cd.Ordine
      LIMIT ${limit} OFFSET ${offset}
    `;

    const total = await this.prisma.$queryRaw<[{count: bigint}]>`
      SELECT COUNT(DISTINCT cd.Ordine) as count
      FROM track_links tl
      JOIN core_dati cd ON tl.cartel = cd.Cartel
      LEFT JOIN track_order_info toi ON CAST(cd.Ordine AS CHAR) COLLATE utf8mb4_unicode_ci = toi.ordine COLLATE utf8mb4_unicode_ci
      WHERE cd.Ordine IS NOT NULL AND (toi.date IS NULL)
    `.then(r => Number(r[0]?.count || 0));

    return { data: orders, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // Tab 2b: Ordini CON date (già compilati)
  async getOrdersWithDate(page = 1, limit = 50) {
    const offset = (page - 1) * limit;

    const orders = await this.prisma.$queryRaw<any[]>`
      SELECT DISTINCT cd.Ordine as ordine, toi.date
      FROM track_links tl
      JOIN core_dati cd ON tl.cartel = cd.Cartel
      JOIN track_order_info toi ON CAST(cd.Ordine AS CHAR) COLLATE utf8mb4_unicode_ci = toi.ordine COLLATE utf8mb4_unicode_ci
      WHERE cd.Ordine IS NOT NULL AND toi.date IS NOT NULL
      ORDER BY cd.Ordine DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const total = await this.prisma.$queryRaw<[{count: bigint}]>`
      SELECT COUNT(DISTINCT cd.Ordine) as count
      FROM track_links tl
      JOIN core_dati cd ON tl.cartel = cd.Cartel
      JOIN track_order_info toi ON CAST(cd.Ordine AS CHAR) COLLATE utf8mb4_unicode_ci = toi.ordine COLLATE utf8mb4_unicode_ci
      WHERE cd.Ordine IS NOT NULL AND toi.date IS NOT NULL
    `.then(r => Number(r[0]?.count || 0));

    return { data: orders, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // Tab 3: Articoli senza SKU - mostra codice articolo e descrizione da core_dati
  async getArticlesWithoutSku(page = 1, limit = 50) {
    const offset = (page - 1) * limit;

    const articles = await this.prisma.$queryRaw<any[]>`
      SELECT DISTINCT cd.Articolo as art, cd.\`Descrizione Articolo\` as descrizione, ts.sku
      FROM track_links tl
      JOIN core_dati cd ON tl.cartel = cd.Cartel
      LEFT JOIN track_sku ts ON cd.Articolo COLLATE utf8mb4_unicode_ci = ts.art COLLATE utf8mb4_unicode_ci
      WHERE cd.Articolo IS NOT NULL AND (ts.sku IS NULL OR ts.sku = '')
      ORDER BY cd.Articolo
      LIMIT ${limit} OFFSET ${offset}
    `;

    const total = await this.prisma.$queryRaw<[{count: bigint}]>`
      SELECT COUNT(DISTINCT cd.Articolo) as count
      FROM track_links tl
      JOIN core_dati cd ON tl.cartel = cd.Cartel
      LEFT JOIN track_sku ts ON cd.Articolo COLLATE utf8mb4_unicode_ci = ts.art COLLATE utf8mb4_unicode_ci
      WHERE cd.Articolo IS NOT NULL AND (ts.sku IS NULL OR ts.sku = '')
    `.then(r => Number(r[0]?.count || 0));

    return { data: articles, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // Tab 3b: Articoli CON SKU (già compilati)
  async getArticlesWithSku(page = 1, limit = 50) {
    const offset = (page - 1) * limit;

    const articles = await this.prisma.$queryRaw<any[]>`
      SELECT DISTINCT cd.Articolo as art, cd.\`Descrizione Articolo\` as descrizione, ts.sku
      FROM track_links tl
      JOIN core_dati cd ON tl.cartel = cd.Cartel
      JOIN track_sku ts ON cd.Articolo COLLATE utf8mb4_unicode_ci = ts.art COLLATE utf8mb4_unicode_ci
      WHERE cd.Articolo IS NOT NULL AND ts.sku IS NOT NULL AND ts.sku != ''
      ORDER BY cd.Articolo
      LIMIT ${limit} OFFSET ${offset}
    `;

    const total = await this.prisma.$queryRaw<[{count: bigint}]>`
      SELECT COUNT(DISTINCT cd.Articolo) as count
      FROM track_links tl
      JOIN core_dati cd ON tl.cartel = cd.Cartel
      JOIN track_sku ts ON cd.Articolo COLLATE utf8mb4_unicode_ci = ts.art COLLATE utf8mb4_unicode_ci
      WHERE cd.Articolo IS NOT NULL AND ts.sku IS NOT NULL AND ts.sku != ''
    `.then(r => Number(r[0]?.count || 0));

    return { data: articles, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // Update lot info (DDT)
  async updateLotInfo(lot: string, data: { doc?: string; date?: Date; note?: string }) {
    const result = await this.prisma.trackLotInfo.upsert({
      where: { lot },
      create: { lot, ...data },
      update: data,
    });
    await this.cache.invalidate('tracking:stats');
    return result;
  }

  // Update order info
  async updateOrderInfo(ordine: string, date?: Date) {
    const existing = await this.prisma.trackOrderInfo.findFirst({ where: { ordine } });
    let result;
    if (existing) {
      result = await this.prisma.trackOrderInfo.update({
        where: { id: existing.id },
        data: { date },
      });
    } else {
      result = await this.prisma.trackOrderInfo.create({
        data: { ordine, date },
      });
    }
    await this.cache.invalidate('tracking:stats');
    return result;
  }

  // Update SKU
  async updateSku(art: string, sku: string) {
    const result = await this.prisma.trackSku.upsert({
      where: { art },
      create: { art, sku },
      update: { sku },
    });
    await this.cache.invalidate('tracking:stats');
    return result;
  }

  // ==================== LOAD SUMMARY (for reports) ====================
  async loadSummary(cartelli: number[]) {
    const links = await this.prisma.trackLink.findMany({
      where: { cartel: { in: cartelli } },
      include: { type: true },
    });

    // Raggruppa per cartellino
    const summary: Record<number, { cartel: number; types: any[] }> = {};
    for (const link of links) {
      if (!summary[link.cartel]) {
        summary[link.cartel] = { cartel: link.cartel, types: [] };
      }
      summary[link.cartel].types.push({
        typeName: link.type.name,
        lot: link.lot,
      });
    }

    return Object.values(summary);
  }

  // ==================== SEARCH DETAILS ====================
  async searchLotDetails(lot: string) {
    const info = await this.prisma.trackLotInfo.findUnique({ where: { lot } });
    const links = await this.prisma.trackLink.findMany({
      where: { lot },
      include: { type: true },
    });

    return { info, links };
  }

  async searchOrderDetails(ordine: string) {
    const info = await this.prisma.trackOrderInfo.findFirst({ where: { ordine } });
    return { info };
  }

  async searchArticoloDetails(art: string) {
    const sku = await this.prisma.trackSku.findUnique({ where: { art } });
    return { sku };
  }

  // ==================== REPORT DATA ====================

  // Report per LOTTI - struttura identica al Legacy
  async getReportDataByLots(lots: string[]) {
    const links = await this.prisma.trackLink.findMany({
      where: { lot: { in: lots } },
      include: { type: true },
    });

    // Get coreData for all cartellini
    const cartellini = [...new Set(links.map(l => l.cartel))];
    const coreData = await this.prisma.coreData.findMany({
      where: { cartel: { in: cartellini } },
    });
    const coreDataMap = new Map(coreData.map(c => [c.cartel, c]));

    // Get order info (data_inserimento)
    const ordini = [...new Set(coreData.map(c => c.ordine).filter(o => o))];
    const orderInfos = await this.prisma.trackOrderInfo.findMany({
      where: { ordine: { in: ordini.map(String) } },
    });
    const orderInfoMap = new Map(orderInfos.map(o => [o.ordine, o]));

    // Get SKU info (codice_articolo)
    const articoli = [...new Set(coreData.map(c => c.articolo).filter(a => a))];
    const skuInfos = await this.prisma.trackSku.findMany({
      where: { art: { in: articoli } },
    });
    const skuInfoMap = new Map(skuInfos.map(s => [s.art, s]));

    // Build grouped results for PDF (by descrizione > type > lot)
    const grouped: Record<string, Record<string, Record<string, any[]>>> = {};
    for (const link of links) {
      const core = coreDataMap.get(link.cartel);
      const desc = core?.descrizioneArticolo || 'Senza Descrizione';
      if (!grouped[desc]) grouped[desc] = {};
      if (!grouped[desc][link.type.name]) grouped[desc][link.type.name] = {};
      if (!grouped[desc][link.type.name][link.lot]) grouped[desc][link.type.name][link.lot] = [];
      grouped[desc][link.type.name][link.lot].push({
        cartel: link.cartel,
        commessa: core?.commessaCli || '',
      });
    }

    // Build Excel data (grouped by cartellino) - IDENTICAL to Legacy
    // Legacy: Cartellino, Data Inserimento, Riferimento Originale, Codice Articolo, Paia + type columns
    const groupedByCartel: Record<number, any> = {};
    for (const link of links) {
      const core = coreDataMap.get(link.cartel);
      if (!groupedByCartel[link.cartel]) {
        groupedByCartel[link.cartel] = {
          cartel: link.cartel,
          commessa: core?.commessaCli || '',
          dataInserimento: core?.ordine ? orderInfoMap.get(String(core.ordine))?.date : null,
          riferimentoOriginale: core?.commessaCli || '',
          codiceArticolo: core?.articolo ? skuInfoMap.get(core.articolo)?.sku : null,
          paia: core?.tot || 0,
          types: {},
        };
      }
      if (!groupedByCartel[link.cartel].types[link.type.name]) {
        groupedByCartel[link.cartel].types[link.type.name] = [];
      }
      groupedByCartel[link.cartel].types[link.type.name].push(link.lot);
    }

    const allTypeNames = [...new Set(links.map(l => l.type.name))];
    const excelData = Object.values(groupedByCartel).sort((a, b) => a.cartel - b.cartel);

    return {
      grouped,
      excelData,
      allTypeNames
    };
  }

  // Report per CARTELLINI - struttura identica al Legacy
  async getReportDataByCartellini(cartellini: number[]) {
    const links = await this.prisma.trackLink.findMany({
      where: { cartel: { in: cartellini } },
      include: { type: true },
    });

    // Get coreData
    const coreData = await this.prisma.coreData.findMany({
      where: { cartel: { in: cartellini } },
    });
    const coreDataMap = new Map(coreData.map(c => [c.cartel, c]));

    // Get order info (data_inserimento)
    const ordini = [...new Set(coreData.map(c => c.ordine).filter(o => o))];
    const orderInfos = await this.prisma.trackOrderInfo.findMany({
      where: { ordine: { in: ordini.map(String) } },
    });
    const orderInfoMap = new Map(orderInfos.map(o => [o.ordine, o]));

    // Get SKU info (codice_articolo)
    const articoli = [...new Set(coreData.map(c => c.articolo).filter(a => a))];
    const skuInfos = await this.prisma.trackSku.findMany({
      where: { art: { in: articoli } },
    });
    const skuInfoMap = new Map(skuInfos.map(s => [s.art, s]));

    // Group by cartellino - IDENTICAL to Legacy format
    const groupedByCartel: Record<number, any> = {};
    for (const link of links) {
      const core = coreDataMap.get(link.cartel);
      if (!groupedByCartel[link.cartel]) {
        groupedByCartel[link.cartel] = {
          cartel: link.cartel,
          commessa: core?.commessaCli || '',
          dataInserimento: core?.ordine ? orderInfoMap.get(String(core.ordine))?.date : null,
          riferimentoOriginale: core?.commessaCli || '',
          codiceArticolo: core?.articolo ? skuInfoMap.get(core.articolo)?.sku : null,
          paia: core?.tot || 0,
          descrizione: core?.descrizioneArticolo || '',
          articolo: core?.articolo || '',
          types: {},
        };
      }
      if (!groupedByCartel[link.cartel].types[link.type.name]) {
        groupedByCartel[link.cartel].types[link.type.name] = [];
      }
      groupedByCartel[link.cartel].types[link.type.name].push(link.lot);
    }

    // Group by descrizione > commessa > cartel > types for PDF
    const groupedForPdf: Record<string, Record<string, Record<number, Record<string, string[]>>>> = {};
    for (const link of links) {
      const core = coreDataMap.get(link.cartel);
      const desc = core?.descrizioneArticolo || 'Senza Descrizione';
      const comm = core?.commessaCli || '';
      if (!groupedForPdf[desc]) groupedForPdf[desc] = {};
      if (!groupedForPdf[desc][comm]) groupedForPdf[desc][comm] = {};
      if (!groupedForPdf[desc][comm][link.cartel]) groupedForPdf[desc][comm][link.cartel] = {};
      if (!groupedForPdf[desc][comm][link.cartel][link.type.name]) {
        groupedForPdf[desc][comm][link.cartel][link.type.name] = [];
      }
      groupedForPdf[desc][comm][link.cartel][link.type.name].push(link.lot);
    }

    const allTypeNames = [...new Set(links.map(l => l.type.name))];
    const groupedList = Object.values(groupedByCartel).sort((a, b) => a.cartel - b.cartel);

    return {
      groupedByCartel: groupedList,
      groupedForPdf,
      allTypeNames
    };
  }

  async getLinksReportData(typeId: number, cartelliIds: number[]) {
    // Get type information
    const type = await this.prisma.trackType.findUnique({
      where: { id: typeId },
    });

    // Get cartelli details from coreData
    const cartelliDetails = await this.prisma.coreData.findMany({
      where: {
        cartel: { in: cartelliIds },
      },
      select: {
        cartel: true,
        commessaCli: true,
        articolo: true,
        descrizioneArticolo: true,
        ragioneSociale: true,
      },
    });

    return {
      type,
      cartelliDetails,
    };
  }

  // ==================== ARCHIVIO & COMPATTAMENTO ====================

  async compactLinks(dataDa: Date, dataA: Date) {
    const endOfDay = new Date(dataA);
    endOfDay.setHours(23, 59, 59, 999);

    const links = await this.prisma.trackLink.findMany({
      where: { timestamp: { gte: dataDa, lte: endOfDay } },
      include: { type: true },
    });

    if (links.length === 0) {
      return { archivedCount: 0, dataDa, dataA };
    }

    // Raccoglie chiavi per join satellite
    const cartelIds = [...new Set(links.map(l => l.cartel))];
    const lotKeys   = [...new Set(links.map(l => l.lot))];

    // Fetch denormalizzato: CoreData, TrackLotInfo, TrackSku, TrackOrderInfo
    const [coreRows, lotInfoRows, skuRows] = await Promise.all([
      this.prisma.coreData.findMany({
        where: { cartel: { in: cartelIds } },
        select: { cartel: true, commessaCli: true, articolo: true, descrizioneArticolo: true, ragioneSociale: true, ordine: true },
      }),
      this.prisma.trackLotInfo.findMany({
        where: { lot: { in: lotKeys } },
        select: { lot: true, doc: true, date: true, note: true },
      }),
      this.prisma.trackSku.findMany({
        where: { art: { in: [] } }, // popolato sotto dopo aver ottenuto gli articoli
        select: { art: true, sku: true },
      }),
    ]);

    const coreMap   = new Map(coreRows.map(r => [r.cartel, r]));
    const lotMap    = new Map(lotInfoRows.map(r => [r.lot, r]));

    // Recupera SKU in base agli articoli trovati nei CoreData
    const articoliIds = [...new Set(coreRows.map(r => r.articolo).filter(Boolean))];
    const skuRowsFull = articoliIds.length > 0
      ? await this.prisma.trackSku.findMany({
          where: { art: { in: articoliIds } },
          select: { art: true, sku: true },
        })
      : [];
    const skuMap = new Map(skuRowsFull.map(r => [r.art, r.sku]));

    // Recupera OrderInfo tramite ordini dai CoreData
    const ordiniIds = [...new Set(coreRows.map(r => r.ordine).filter(Boolean) as number[])];
    const orderInfoRows = ordiniIds.length > 0
      ? await this.prisma.trackOrderInfo.findMany({
          where: { ordine: { in: ordiniIds.map(String) } },
          select: { ordine: true, date: true },
        })
      : [];
    const orderMap = new Map(orderInfoRows.map(r => [r.ordine, r.date]));

    await this.prisma.$transaction([
      this.prisma.trackLinkArchive.createMany({
        data: links.map(l => {
          const core   = coreMap.get(l.cartel);
          const lotInf = lotMap.get(l.lot);
          const sku    = core ? skuMap.get(core.articolo) : undefined;
          const ordDate = core?.ordine ? orderMap.get(String(core.ordine)) : undefined;
          return {
            cartel:     l.cartel,
            typeId:     l.typeId,
            typeName:   l.type.name,
            lot:        l.lot,
            note:       l.note,
            timestamp:  l.timestamp,
            // snapshot CoreData
            commessa:   core?.commessaCli   ?? null,
            articolo:   core?.articolo      ?? null,
            descrizione: core?.descrizioneArticolo ?? null,
            ragioneSoc: core?.ragioneSociale ?? null,
            ordine:     core?.ordine        ?? null,
            // snapshot TrackLotInfo
            lotDoc:     lotInf?.doc  ?? null,
            lotDate:    lotInf?.date ?? null,
            lotNote:    lotInf?.note ?? null,
            // snapshot TrackOrderInfo
            orderDate:  ordDate ?? null,
            // snapshot TrackSku
            sku:        sku ?? null,
          };
        }),
      }),
      this.prisma.trackLink.deleteMany({
        where: { id: { in: links.map(l => l.id) } },
      }),
    ]);

    await this.cache.invalidate('tracking:stats');

    // ── Pulizia orfani ──
    // Dopo il compattamento, elimina i record satellite che non sono più
    // referenziati da nessun TrackLink attivo rimanente.
    const orphanStats = await this.purgeOrphanSatellites();

    return { archivedCount: links.length, dataDa, dataA, orphanStats };
  }

  /**
   * Elimina dalle tabelle satellite i record non più referenziati
   * da nessun TrackLink attivo. Da chiamare dopo compactLinks.
   */
  private async purgeOrphanSatellites() {
    // Legge lo stato corrente dei TrackLink rimanenti
    const activeLinks = await this.prisma.trackLink.findMany({
      select: { lot: true, typeId: true, cartel: true },
    });

    const activeLots    = new Set(activeLinks.map(l => l.lot));
    const activeTypeIds = new Set(activeLinks.map(l => l.typeId));

    // Per TrackSku e TrackOrderInfo serve anche conoscere
    // gli articoli e gli ordini referenziati dai cartel attivi
    const activeCartelIds = [...new Set(activeLinks.map(l => l.cartel))];
    const activeCoreRows  = activeCartelIds.length > 0
      ? await this.prisma.coreData.findMany({
          where: { cartel: { in: activeCartelIds } },
          select: { articolo: true, ordine: true },
        })
      : [];
    const activeArticoli = new Set(activeCoreRows.map(r => r.articolo).filter(Boolean));
    const activeOrdini   = new Set(
      activeCoreRows.map(r => r.ordine).filter(Boolean).map(String),
    );

    // 1. TrackLotInfo — elimina lotti non più in nessun TrackLink attivo
    const allLotInfo = await this.prisma.trackLotInfo.findMany({ select: { lot: true } });
    const orphanLots = allLotInfo.map(r => r.lot).filter(lot => !activeLots.has(lot));
    let deletedLots = 0;
    if (orphanLots.length > 0) {
      const res = await this.prisma.trackLotInfo.deleteMany({ where: { lot: { in: orphanLots } } });
      deletedLots = res.count;
    }

    // 2. TrackOrderInfo — elimina ordini non più referenziati da cartel attivi
    const allOrderInfo = await this.prisma.trackOrderInfo.findMany({ select: { ordine: true } });
    const orphanOrders = allOrderInfo.map(r => r.ordine).filter(o => !activeOrdini.has(o));
    let deletedOrders = 0;
    if (orphanOrders.length > 0) {
      const res = await this.prisma.trackOrderInfo.deleteMany({ where: { ordine: { in: orphanOrders } } });
      deletedOrders = res.count;
    }

    // 3. TrackSku — elimina articoli non più referenziati da cartel attivi
    const allSku = await this.prisma.trackSku.findMany({ select: { art: true } });
    const orphanSku = allSku.map(r => r.art).filter(art => !activeArticoli.has(art));
    let deletedSku = 0;
    if (orphanSku.length > 0) {
      const res = await this.prisma.trackSku.deleteMany({ where: { art: { in: orphanSku } } });
      deletedSku = res.count;
    }

    // 4. TrackType — elimina tipi non più usati da nessun TrackLink attivo
    const allTypes = await this.prisma.trackType.findMany({ select: { id: true } });
    const orphanTypeIds = allTypes.map(r => r.id).filter(id => !activeTypeIds.has(id));
    let deletedTypes = 0;
    if (orphanTypeIds.length > 0) {
      const res = await this.prisma.trackType.deleteMany({ where: { id: { in: orphanTypeIds } } });
      deletedTypes = res.count;
    }

    return { deletedLots, deletedOrders, deletedSku, deletedTypes };
  }

  async getArchive(page = 1, limit = 50, search?: string) {
    const where = search
      ? {
          OR: [
            { lot: { contains: search } },
            { cartel: isNaN(Number(search)) ? undefined : Number(search) },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.trackLinkArchive.findMany({
        where,
        orderBy: [{ cartel: 'asc' }, { timestamp: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.trackLinkArchive.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getCompactReportData(dataDa: Date, dataA: Date) {
    const endOfDay = new Date(dataA);
    endOfDay.setHours(23, 59, 59, 999);

    const records = await this.prisma.trackLinkArchive.findMany({
      where: { timestamp: { gte: dataDa, lte: endOfDay } },
      orderBy: [{ cartel: 'asc' }, { timestamp: 'asc' }],
    });

    // Tutti i dati sono già denormalizzati nell'archivio, nessun join necessario
    return records.map(r => ({
      cartel:      r.cartel,
      typeName:    r.typeName,
      lot:         r.lot,
      note:        r.note,
      timestamp:   r.timestamp,
      archivedAt:  r.archivedAt,
      commessa:    r.commessa    ?? '',
      articolo:    r.articolo    ?? '',
      descrizione: r.descrizione ?? '',
      ragioneSoc:  r.ragioneSoc  ?? '',
      ordine:      r.ordine,
      lotDoc:      r.lotDoc,
      lotDate:     r.lotDate,
      orderDate:   r.orderDate,
      sku:         r.sku,
    }));
  }
}
