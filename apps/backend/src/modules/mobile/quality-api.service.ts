import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";

@Injectable()
export class QualityApiService {
  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
  ) {}

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
   * Upload foto to MinIO
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

    try {
      // Generate unique filename with timestamp
      const fileExtension = file.originalname.split(".").pop() || "jpg";
      const filename = `eccezione_${body.cartellino_id}_${Date.now()}.${fileExtension}`;

      // Generate MinIO object name
      const objectName = this.storageService.generateQualityPhotoObjectName(
        body.cartellino_id,
        filename
      );

      // Upload to MinIO
      await this.storageService.uploadBuffer(objectName, file.buffer, {
        'Content-Type': file.mimetype || 'image/jpeg',
        'cartellino-id': body.cartellino_id,
        'tipo-difetto': body.tipo_difetto,
      });

      return {
        status: "success",
        message: "Foto caricata con successo",
        data: {
          filename,
          objectName,  // MinIO object path
          url: `/api/quality/photo/${encodeURIComponent(objectName)}`,  // Proxy endpoint
        },
      };
    } catch (error) {
      return {
        status: "error",
        message: `Errore durante l'upload: ${error.message}`,
      };
    }
  }

  /**
   * Get photo from MinIO (returns presigned URL)
   */
  async getPhoto(objectName: string) {
    try {
      console.log(`[QualityAPI] Richiesta foto - objectName: "${objectName}"`);

      // Check if file exists
      const exists = await this.storageService.fileExists(objectName);
      if (!exists) {
        console.log(`[QualityAPI] Foto non trovata in MinIO: ${objectName}`);
        return {
          status: "error",
          message: "Foto non trovata",
        };
      }

      // Generate presigned URL (valid for 1 hour)
      const url = await this.storageService.getPresignedUrl(objectName, 3600);
      console.log(`[QualityAPI] Presigned URL generato per: ${objectName}`);

      return {
        status: "success",
        data: { url },
      };
    } catch (error) {
      console.error(`[QualityAPI] Errore recupero foto ${objectName}:`, error);
      return {
        status: "error",
        message: `Errore nel recupero della foto: ${error.message}`,
      };
    }
  }

  /**
   * Stream photo from MinIO (alternative to presigned URL)
   */
  async getPhotoStream(objectName: string) {
    return this.storageService.getFileStream(objectName);
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

  /**
   * Ottieni dettagli completi di un controllo con tutte le eccezioni
   */
  async getControlDetails(controlId: number) {
    try {
      const control = await this.prisma.qualityRecord.findUnique({
        where: { id: controlId },
        include: {
          exceptions: {
            orderBy: { id: 'asc' },
          },
        },
      });

      if (!control) {
        return {
          status: 'error',
          message: 'Controllo non trovato',
        };
      }

      // Recupera il nome del reparto
      const reparto = await this.prisma.qualityDepartment.findUnique({
        where: { id: parseInt(control.reparto) },
        select: { nomeReparto: true },
      });

      // Recupera descrizioni difetti per le eccezioni
      const eccezioniWithDetails = await Promise.all(
        control.exceptions.map(async (ecc) => {
          const defect = await this.prisma.qualityDefectType.findUnique({
            where: { id: parseInt(ecc.tipoDifetto) },
            select: { descrizione: true },
          });

          // Costruisci l'URL della foto usando lo stesso pattern del desktop
          let photoUrl = null;
          if (ecc.fotoPath) {
            // Se inizia con "quality/", è già un object name completo
            if (ecc.fotoPath.startsWith('quality/')) {
              photoUrl = `/api/quality/photo-stream/${encodeURIComponent(ecc.fotoPath)}`;
            }
            // Se è solo il filename, ricostruisci il path completo
            else if (ecc.fotoPath.match(/^eccezione_\d+_\d+\./)) {
              const parts = ecc.fotoPath.split('_');
              const cartellinoId = parts[1];
              const objectName = `quality/cq_uploads/${cartellinoId}/${ecc.fotoPath}`;
              photoUrl = `/api/quality/photo-stream/${encodeURIComponent(objectName)}`;
            }
            // Fallback: prova come object name diretto
            else {
              photoUrl = `/api/quality/photo-stream/${encodeURIComponent(ecc.fotoPath)}`;
            }
          }

          return {
            id: ecc.id,
            taglia: ecc.taglia,
            tipo_difetto: defect?.descrizione || ecc.tipoDifetto,
            descrizione_difetto: defect?.descrizione || ecc.tipoDifetto,
            note_operatore: ecc.noteOperatore,
            fotoPath: photoUrl,
          };
        })
      );

      return {
        status: 'success',
        data: {
          id: control.id,
          numero_cartellino: control.numeroCartellino,
          articolo: control.articolo,
          reparto: reparto?.nomeReparto || control.reparto,
          ora_controllo: control.dataControllo.toLocaleTimeString('it-IT', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          tipo_cq: control.tipoCq,
          note: control.note,
          eccezioni: eccezioniWithDetails,
        },
      };
    } catch (error) {
      console.error('[QualityAPI] Errore recupero dettagli controllo:', error);
      return {
        status: 'error',
        message: `Errore nel recupero dei dettagli: ${error.message}`,
      };
    }
  }

  /**
   * Elimina un controllo qualità con tutte le sue eccezioni
   */
  async deleteControl(controlId: number) {
    try {
      // Verifica che il controllo esista
      const control = await this.prisma.qualityRecord.findUnique({
        where: { id: controlId },
        include: {
          exceptions: true,
        },
      });

      if (!control) {
        return {
          status: 'error',
          message: 'Controllo non trovato',
        };
      }

      // Elimina le foto delle eccezioni da MinIO (se presenti)
      for (const eccezione of control.exceptions) {
        if (eccezione.fotoPath) {
          try {
            await this.storageService.deleteFile(eccezione.fotoPath);
          } catch (error) {
            console.error(`[QualityAPI] Errore eliminazione foto ${eccezione.fotoPath}:`, error);
            // Continua anche se la foto non può essere eliminata
          }
        }
      }

      // Elimina il controllo (le eccezioni vengono eliminate automaticamente per cascade)
      await this.prisma.qualityRecord.delete({
        where: { id: controlId },
      });

      return {
        status: 'success',
        message: 'Controllo eliminato con successo',
      };
    } catch (error) {
      console.error('[QualityAPI] Errore eliminazione controllo:', error);
      return {
        status: 'error',
        message: `Errore nell'eliminazione del controllo: ${error.message}`,
      };
    }
  }
}
