import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TrackingService {
  constructor(private prisma: PrismaService) {}

  // ==================== STATS ====================
  async getStats() {
    const [linksCount, lotsWithoutDdt, ordersWithoutDate, articlesWithoutSku] = await Promise.all([
      this.prisma.trackLink.count(),
      this.prisma.$queryRaw<[{count: bigint}]>`
        SELECT COUNT(DISTINCT tl.lot) as count
        FROM track_links tl
        LEFT JOIN track_lots_info tli ON tl.lot = tli.lot
        WHERE tli.doc IS NULL OR tli.doc = ''
      `.then(r => Number(r[0]?.count || 0)),
      this.prisma.$queryRaw<[{count: bigint}]>`
        SELECT COUNT(DISTINCT tl.lot) as count
        FROM track_links tl
        LEFT JOIN track_order_info toi ON tl.lot = toi.ordine
        WHERE toi.date IS NULL
      `.then(r => Number(r[0]?.count || 0)),
      this.prisma.$queryRaw<[{count: bigint}]>`
        SELECT COUNT(DISTINCT tl.lot) as count
        FROM track_links tl
        LEFT JOIN track_sku ts ON tl.lot = ts.art
        WHERE ts.sku IS NULL OR ts.sku = ''
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
    return this.prisma.trackType.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async createType(name: string, note?: string) {
    return this.prisma.trackType.create({
      data: { name, note },
    });
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
    return this.prisma.trackLink.delete({ where: { id } });
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
    return this.prisma.trackLotInfo.upsert({
      where: { lot },
      create: { lot, ...data },
      update: data,
    });
  }

  // Update order info
  async updateOrderInfo(ordine: string, date?: Date) {
    const existing = await this.prisma.trackOrderInfo.findFirst({ where: { ordine } });
    if (existing) {
      return this.prisma.trackOrderInfo.update({
        where: { id: existing.id },
        data: { date },
      });
    }
    return this.prisma.trackOrderInfo.create({
      data: { ordine, date },
    });
  }

  // Update SKU
  async updateSku(art: string, sku: string) {
    return this.prisma.trackSku.upsert({
      where: { art },
      create: { art, sku },
      update: { sku },
    });
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
}
