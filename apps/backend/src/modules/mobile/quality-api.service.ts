import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

@Injectable()
export class QualityApiService {
  constructor(private prisma: PrismaService) {}

  /**
   * Dettagli completi cartellino
   */
  async getCartellinoDetails(cartellino: string) {
    if (!cartellino) {
      return { status: "error", message: "Parametro cartellino mancante" };
    }

    const cartel = parseInt(cartellino, 10);
    const informazione = await this.prisma.coreData.findUnique({
      where: { cartel },
    });

    if (!informazione) {
      return {
        status: "error",
        message: "Informazioni cartellino non trovate",
      };
    }

    // L'app si aspetta questa struttura ESATTA
    const cartellinoInfo = {
      cartellino: informazione.cartel,
      codice_articolo: informazione.articolo,
      descrizione_articolo: informazione.descrizioneArticolo,
      paia: informazione.tot,
      cliente: informazione.ragioneSociale,
      commessa: informazione.commessaCli,
      nu: informazione.nu,
    };

    const lineaInfo = {
      sigla: informazione.ln,
    };

    return {
      status: "success",
      data: {
        numero: cartellino,
        cartellino_info: cartellinoInfo,
        linea_info: lineaInfo,
        numerata: informazione.nu,
        details: {
          cartellino_info: cartellinoInfo,
          linea_info: lineaInfo,
        },
      },
    };
  }

  /**
   * Ottieni opzioni per form
   */
  
  async getOptions(cartellino?: string) {
    let calzateOptions: string[] = [];
    let taglieData: any[] = [];

    // Se è stato fornito un cartellino, recupera le calzate specifiche
    if (cartellino) {
      const cartel = parseInt(cartellino, 10);
      const datiResult = await this.prisma.coreData.findUnique({
        where: { cartel },
        select: { nu: true },
      });

      if (datiResult && datiResult.nu) {
        const taglieResult = await this.getTaglieByNu(datiResult.nu);
        calzateOptions = taglieResult.calzate;
        taglieData = taglieResult.taglie;
      }
    }

    // Recupera reparti
    const repartiOptions = await this.prisma.qualityDepartment.findMany({
      where: { attivo: true },
      select: { nomeReparto: true },
      orderBy: [{ ordine: "asc" }, { nomeReparto: "asc" }],
    });

    // Recupera reparti HERMES
    const repartiHermesOptions = await this.prisma.qualityDepartment.findMany({
      where: { attivo: true },
      select: { id: true, nomeReparto: true },
      orderBy: [{ ordine: "asc" }, { nomeReparto: "asc" }],
    });

    // Recupera tipi di difetti HERMES
    const difettiOptions = await this.prisma.qualityDefectType.findMany({
      where: { attivo: true },
      select: { id: true, descrizione: true, categoria: true },
      orderBy: [{ ordine: "asc" }, { descrizione: "asc" }],
    });

    // Converti taglie in formato P01, P02, etc. per compatibilità app
    const taglieWithPFormat = taglieData.map((t) => ({
      numero: t.numero,
      nome: t.nome,
      field: `P${String(t.numero).padStart(2, "0")}`,
    }));

    return {
      status: "success",
      message: "Opzioni recuperate con successo",
      data: {
        calzate: calzateOptions,
        taglie: taglieWithPFormat,
        reparti: repartiOptions.map((r) => r.nomeReparto),
        reparti_hermes: repartiHermesOptions.map((r) => ({
          id: r.id,
          nome: r.nomeReparto,
        })),
        difetti: difettiOptions.map((d) => ({
          id: d.id,
          descrizione: d.descrizione,
          categoria: d.categoria,
        })),
      },
    };
  }

  /**
   * Salva controllo HERMES CQ
   */
  async saveHermesCq(data: any) {
    // Campi obbligatori
    const requiredFields = [
      "numero_cartellino",
      "reparto",
      "operatore",
      "tipo_cq",
      "paia_totali",
      "cod_articolo",
      "articolo",
      "linea",
      "note",
      "user",
    ];

    for (const field of requiredFields) {
      if (!data[field]) {
        throw new BadRequestException(`Campo obbligatorio mancante: ${field}`);
      }
    }

    const hasExceptions =
      data.eccezioni &&
      Array.isArray(data.eccezioni) &&
      data.eccezioni.length > 0;

    // Usa transazione Prisma
    const result = await this.prisma.$transaction(async (tx) => {
      // Inserisci record principale
      const record = await tx.qualityRecord.create({
        data: {
          numeroCartellino: data.numero_cartellino,
          reparto: data.reparto,
          dataControllo: new Date(),
          operatore: data.operatore,
          tipoCq: data.tipo_cq,
          paiaTotali: parseInt(data.paia_totali),
          codArticolo: data.cod_articolo,
          articolo: data.articolo,
          linea: data.linea,
          note: data.note,
          haEccezioni: hasExceptions,
        },
      });

      // Inserisci eccezioni se presenti
      if (hasExceptions) {
        for (const eccezione of data.eccezioni) {
          if (eccezione.taglia && eccezione.tipo_difetto) {
            await tx.qualityException.create({
              data: {
                cartellinoId: record.id,
                taglia: eccezione.taglia,
                tipoDifetto: eccezione.tipo_difetto,
                noteOperatore: eccezione.note_operatore || null,
                fotoPath: eccezione.fotoPath || null,
              },
            });
          }
        }
      }

      return record;
    });

    return {
      status: "success",
      message: "Record salvato con successo",
      data: { record_id: result.id },
    };
  }

  /**
   * Upload foto
   */
  async uploadPhoto(
    file: Express.Multer.File,
    body: {
      cartellino_id: string;
      tipo_difetto: string;
      calzata?: string;
      note?: string;
    }
  ) {
    if (!file) {
      return { status: "error", message: "Nessun file ricevuto" };
    }

    if (!body.cartellino_id || !body.tipo_difetto) {
      return {
        status: "error",
        message: "Parametri cartellino_id e tipo_difetto sono obbligatori",
      };
    }

    const uploadDir = join(process.cwd(), "storage", "quality", "cq_uploads");

    // Crea directory se non esiste
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const fileExtension = file.originalname.split(".").pop() || "jpg";
    const filename = `eccezione_${body.cartellino_id}_${Date.now()}.${fileExtension}`;
    const filePath = join(uploadDir, filename);

    await writeFile(filePath, file.buffer);

    return {
      status: "success",
      message: "Foto caricata con successo",
      data: {
        filename,
        url: `/storage/quality/cq_uploads/${filename}`,
      },
    };
  }

  /**
   * Ottieni taglie per numerata (helper method)
   */
  async getTaglieByNu(nu: string) {
    const calzateOptions: string[] = [];
    const taglieData: any[] = [];

    // Cerca nella tabella numerata usando il campo id_numerata
    const idNumerate = await this.prisma.numerata.findFirst({
      where: { idNumerata: nu },
    });

    if (idNumerate) {
      for (let j = 1; j <= 20; j++) {
        const field = `n${String(j).padStart(2, "0")}` as keyof typeof idNumerate;
        const value = idNumerate[field];
        if (value && typeof value === "string" && value.trim()) {
          calzateOptions.push(value);
          taglieData.push({
            numero: j,
            nome: value,
            field: field,
          });
        }
      }
    }

    return {
      calzate: calzateOptions,
      taglie: taglieData,
    };
  }
}
