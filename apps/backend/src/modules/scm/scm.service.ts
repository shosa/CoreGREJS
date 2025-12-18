import { Injectable, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ScmService {
  constructor(private prisma: PrismaService) {}

  // ==================== AUTH ====================

  async loginLaboratory(username: string, password: string) {
    // Find laboratory by code (username) and accessCode (password)
    const laboratory = await this.prisma.scmLaboratory.findFirst({
      where: {
        codice: username,
        accessCode: password,
        attivo: true,
      },
    });

    if (!laboratory) {
      throw new UnauthorizedException('Credenziali non valide');
    }

    // For now, return a simple token (laboratory ID as string)
    // In production, you should use proper JWT tokens
    const token = Buffer.from(`${laboratory.id}:${laboratory.codice}`).toString('base64');

    return {
      status: 'success',
      message: 'Login effettuato con successo',
      data: {
        laboratory: {
          id: laboratory.id,
          name: laboratory.nome,
          code: laboratory.codice,
        },
        token,
      },
    };
  }

  async getDashboard(laboratoryId?: number) {
    const where: any = {};
    if (laboratoryId) {
      where.laboratoryId = laboratoryId;
    }

    // Get launches grouped by status
    const launches = await this.prisma.scmLaunch.findMany({
      where,
      include: {
        laboratory: true,
        articles: true,
      },
      orderBy: { dataLancio: 'desc' },
    });

    // Group launches by status
    const preparazione = launches.filter((l) => l.stato === 'IN_PREPARAZIONE');
    const lavorazione = launches.filter((l) => l.stato === 'IN_LAVORAZIONE');
    const completi = launches.filter((l) => l.stato === 'COMPLETATO');

    // Calculate statistics
    const totalPairs = launches.reduce((sum, launch) => {
      return sum + launch.articles.reduce((articleSum, article) => articleSum + article.quantita, 0);
    }, 0);

    const inPreparation = preparazione.reduce((sum, launch) => {
      return sum + launch.articles.reduce((articleSum, article) => articleSum + article.quantita, 0);
    }, 0);

    const inProgress = lavorazione.reduce((sum, launch) => {
      return sum + launch.articles.reduce((articleSum, article) => articleSum + article.quantita, 0);
    }, 0);

    const completed = completi.reduce((sum, launch) => {
      return sum + launch.articles.reduce((articleSum, article) => articleSum + article.quantita, 0);
    }, 0);

    // Transform launches for display
    const transformLaunch = (launch: any) => ({
      id: launch.id,
      code: launch.numero,
      description: launch.note || 'Nessuna descrizione',
      status: launch.stato,
      created_at: launch.dataLancio.toISOString(),
      total_articles: launch.articles.length,
      total_pairs: launch.articles.reduce((sum: number, article: any) => sum + article.quantita, 0),
    });

    return {
      status: 'success',
      data: {
        launches_by_status: {
          preparazione: preparazione.map(transformLaunch),
          lavorazione: lavorazione.map(transformLaunch),
          completi: completi.map(transformLaunch),
        },
        statistics: {
          total_launches: launches.length,
          total_pairs: totalPairs,
          in_preparation: inPreparation,
          in_progress: inProgress,
          completed: completed,
        },
      },
    };
  }

  // ==================== LABORATORIES ====================

  async getLaboratories(filters?: { attivo?: boolean }) {
    return this.prisma.scmLaboratory.findMany({
      where: filters,
      orderBy: { nome: 'asc' },
      include: {
        _count: {
          select: { launches: true },
        },
      },
    });
  }

  async getLaboratory(id: number) {
    const laboratory = await this.prisma.scmLaboratory.findUnique({
      where: { id },
      include: {
        launches: {
          include: {
            articles: true,
          },
          orderBy: { dataLancio: 'desc' },
          take: 10,
        },
        _count: {
          select: { launches: true },
        },
      },
    });

    if (!laboratory) {
      throw new NotFoundException(`Laboratorio con ID ${id} non trovato`);
    }

    // Transform articles to include codice and descrizione
    return {
      ...laboratory,
      launches: laboratory.launches.map(launch => ({
        ...launch,
        articles: launch.articles.map(article => ({
          ...article,
          codice: article.commessa && article.modello ? `${article.commessa}-${article.modello}` : '',
          descrizione: article.colore,
        })),
      })),
    };
  }

  async createLaboratory(data: {
    codice?: string;
    nome: string;
    indirizzo?: string;
    telefono?: string;
    email?: string;
    accessCode?: string;
    attivo?: boolean;
  }) {
    return this.prisma.scmLaboratory.create({
      data,
    });
  }

  async updateLaboratory(
    id: number,
    data: {
      codice?: string;
      nome?: string;
      indirizzo?: string;
      telefono?: string;
      email?: string;
      accessCode?: string;
      attivo?: boolean;
    }
  ) {
    return this.prisma.scmLaboratory.update({
      where: { id },
      data,
    });
  }

  async deleteLaboratory(id: number) {
    // Check if laboratory has launches
    const launchCount = await this.prisma.scmLaunch.count({
      where: { laboratoryId: id },
    });

    if (launchCount > 0) {
      throw new BadRequestException(
        `Non è possibile eliminare il laboratorio: ha ${launchCount} lanci associati`
      );
    }

    return this.prisma.scmLaboratory.delete({
      where: { id },
    });
  }

  // ==================== LAUNCHES ====================

  async getLaunches(filters?: {
    laboratoryId?: number;
    stato?: string;
    dataLancioFrom?: Date;
    dataLancioTo?: Date;
  }) {
    const where: any = {};

    if (filters?.laboratoryId) {
      where.laboratoryId = filters.laboratoryId;
    }

    if (filters?.stato) {
      where.stato = filters.stato;
    }

    if (filters?.dataLancioFrom || filters?.dataLancioTo) {
      where.dataLancio = {};
      if (filters.dataLancioFrom) {
        where.dataLancio.gte = filters.dataLancioFrom;
      }
      if (filters.dataLancioTo) {
        where.dataLancio.lte = filters.dataLancioTo;
      }
    }

    const launches = await this.prisma.scmLaunch.findMany({
      where,
      include: {
        laboratory: true,
        articles: {
          include: {
            phases: {
              include: {
                standardPhase: true,
              },
              orderBy: { id: 'asc' },
            },
          },
        },
      },
      orderBy: { dataLancio: 'desc' },
    });

    // Transform articles to include codice, descrizione and percentuale
    return launches.map(launch => ({
      ...launch,
      articles: launch.articles.map(article => {
        const totalPhases = article.phases.length;
        const completedPhases = article.phases.filter(p => p.stato === 'COMPLETATA').length;
        const percentuale = totalPhases > 0 ? Math.round((completedPhases / totalPhases) * 100) : 0;

        return {
          ...article,
          codice: article.commessa && article.modello ? `${article.commessa}-${article.modello}` : '',
          descrizione: article.colore,
          percentuale,
        };
      }),
    }));
  }

  async getLaunch(id: number) {
    const launch = await this.prisma.scmLaunch.findUnique({
      where: { id },
      include: {
        laboratory: true,
        articles: {
          include: {
            phases: {
              include: {
                standardPhase: true,
                tracking: {
                  orderBy: { data: 'desc' },
                },
              },
              orderBy: { id: 'asc' },
            },
          },
          orderBy: { id: 'asc' },
        },
      },
    });

    if (!launch) {
      throw new NotFoundException(`Lancio con ID ${id} non trovato`);
    }

    // Transform articles to include codice, descrizione and percentuale
    return {
      ...launch,
      articles: launch.articles.map(article => {
        const totalPhases = article.phases.length;
        const completedPhases = article.phases.filter(p => p.stato === 'COMPLETATA').length;
        const percentuale = totalPhases > 0 ? Math.round((completedPhases / totalPhases) * 100) : 0;

        return {
          ...article,
          codice: article.commessa && article.modello ? `${article.commessa}-${article.modello}` : '',
          descrizione: article.colore,
          percentuale,
        };
      }),
    };
  }

  async createLaunch(data: {
    numero: string;
    laboratoryId: number;
    dataLancio: Date;
    dataConsegna?: Date;
    note?: string;
    articles: Array<{
      codice: string;
      descrizione: string;
      quantita: number;
      note?: string;
    }>;
    phases: Array<{
      standardPhaseId: number;
      ordine: number;
    }>;
  }) {
    // Verify laboratory exists
    const laboratory = await this.prisma.scmLaboratory.findUnique({
      where: { id: data.laboratoryId },
    });

    if (!laboratory) {
      throw new NotFoundException(`Laboratorio con ID ${data.laboratoryId} non trovato`);
    }

    // Extract phase IDs and verify they exist
    const phaseIds = data.phases.map(p => p.standardPhaseId);
    const standardPhases = await this.prisma.scmStandardPhase.findMany({
      where: {
        id: { in: phaseIds },
      },
    });

    if (standardPhases.length !== phaseIds.length) {
      const foundIds = standardPhases.map(p => p.id);
      const missingIds = phaseIds.filter(id => !foundIds.includes(id));
      throw new BadRequestException(`Fasi standard non trovate: ${missingIds.join(', ')}`);
    }

    // Sort phases by ordine
    const sortedPhases = data.phases.sort((a, b) => a.ordine - b.ordine);

    // Create launch with articles and phases in transaction
    return this.prisma.$transaction(async (tx) => {
      const launch = await tx.scmLaunch.create({
        data: {
          numero: data.numero,
          laboratoryId: data.laboratoryId,
          dataLancio: data.dataLancio,
          dataConsegna: data.dataConsegna,
          stato: 'IN_PREPARAZIONE',
          note: data.note,
        },
      });

      // Create articles with their phases
      for (const articleData of data.articles) {
        // Parse codice: formato "F02B227-MQ285Q888" -> commessa: "F02B227", modello: "MQ285Q888"
        const parts = articleData.codice.split('-');
        const commessa = parts[0] || '';
        const modello = parts.slice(1).join('-') || '';

        // Create article
        const article = await tx.scmLaunchArticle.create({
          data: {
            launchId: launch.id,
            commessa,
            modello,
            colore: articleData.descrizione,
            quantita: articleData.quantita,
            note: articleData.note,
          },
        });

        // Create phases for this article
        await tx.scmArticlePhase.createMany({
          data: sortedPhases.map((phaseInput) => {
            const standardPhase = standardPhases.find(p => p.id === phaseInput.standardPhaseId);
            return {
              articleId: article.id,
              phaseId: standardPhase.id,
              nome: standardPhase.nome,
              stato: 'NON_INIZIATA',
            };
          }),
        });
      }

      // Fetch the complete launch with all relations within the transaction
      const launchWithRelations = await tx.scmLaunch.findUnique({
        where: { id: launch.id },
        include: {
          laboratory: true,
          articles: {
            include: {
              phases: {
                include: {
                  standardPhase: true,
                  tracking: {
                    orderBy: { data: 'desc' },
                  },
                },
                orderBy: { id: 'asc' },
              },
            },
            orderBy: { id: 'asc' },
          },
        },
      });

      // Transform articles to include codice, descrizione and percentuale
      return {
        ...launchWithRelations,
        articles: launchWithRelations.articles.map(article => {
          const totalPhases = article.phases.length;
          const completedPhases = article.phases.filter(p => p.stato === 'COMPLETATA').length;
          const percentuale = totalPhases > 0 ? Math.round((completedPhases / totalPhases) * 100) : 0;

          return {
            ...article,
            codice: article.commessa && article.modello ? `${article.commessa}-${article.modello}` : '',
            descrizione: article.colore,
            percentuale,
          };
        }),
      };
    });
  }

  async updateLaunch(
    id: number,
    data: {
      numero?: string;
      laboratoryId?: number;
      dataLancio?: Date;
      dataConsegna?: Date;
      stato?: string;
      blockedReason?: string;
      note?: string;
    }
  ) {
    // If changing laboratory, verify it exists
    if (data.laboratoryId) {
      const laboratory = await this.prisma.scmLaboratory.findUnique({
        where: { id: data.laboratoryId },
      });

      if (!laboratory) {
        throw new NotFoundException(`Laboratorio con ID ${data.laboratoryId} non trovato`);
      }
    }

    const updatedLaunch = await this.prisma.scmLaunch.update({
      where: { id },
      data,
      include: {
        laboratory: true,
        articles: {
          include: {
            phases: {
              include: {
                standardPhase: true,
              },
              orderBy: { id: 'asc' },
            },
          },
        },
      },
    });

    // Transform articles to include codice, descrizione and percentuale
    return {
      ...updatedLaunch,
      articles: updatedLaunch.articles.map(article => {
        const totalPhases = article.phases.length;
        const completedPhases = article.phases.filter(p => p.stato === 'COMPLETATA').length;
        const percentuale = totalPhases > 0 ? Math.round((completedPhases / totalPhases) * 100) : 0;

        return {
          ...article,
          codice: article.commessa && article.modello ? `${article.commessa}-${article.modello}` : '',
          descrizione: article.colore,
          percentuale,
        };
      }),
    };
  }

  async deleteLaunch(id: number) {
    // Prisma will cascade delete articles and phases
    return this.prisma.scmLaunch.delete({
      where: { id },
    });
  }

  // ==================== LAUNCH ARTICLES ====================

  async addArticleToLaunch(
    launchId: number,
    data: {
      codice: string;
      descrizione: string;
      quantita: number;
      note?: string;
    }
  ) {
    // Parse codice: formato "F02B227-MQ285Q888" -> commessa: "F02B227", modello: "MQ285Q888"
    const parts = data.codice.split('-');
    const commessa = parts[0] || '';
    const modello = parts.slice(1).join('-') || '';

    // Get standard phases to copy to the new article
    const standardPhases = await this.prisma.scmStandardPhase.findMany({
      where: { attivo: true },
      orderBy: { ordine: 'asc' },
    });

    return this.prisma.$transaction(async (tx) => {
      // Create article
      const article = await tx.scmLaunchArticle.create({
        data: {
          launchId,
          commessa,
          modello,
          colore: data.descrizione,
          quantita: data.quantita,
          note: data.note,
        },
      });

      // Create phases for this article
      await tx.scmArticlePhase.createMany({
        data: standardPhases.map((phase) => ({
          articleId: article.id,
          phaseId: phase.id,
          nome: phase.nome,
          stato: 'NON_INIZIATA',
        })),
      });

      // Fetch article with phases
      const articleWithPhases = await tx.scmLaunchArticle.findUnique({
        where: { id: article.id },
        include: {
          phases: {
            include: {
              standardPhase: true,
            },
            orderBy: { id: 'asc' },
          },
        },
      });

      // Transform to include codice, descrizione and percentuale
      const totalPhases = articleWithPhases.phases.length;
      const completedPhases = articleWithPhases.phases.filter(p => p.stato === 'COMPLETATA').length;
      const percentuale = totalPhases > 0 ? Math.round((completedPhases / totalPhases) * 100) : 0;

      return {
        ...articleWithPhases,
        codice: articleWithPhases.commessa && articleWithPhases.modello ? `${articleWithPhases.commessa}-${articleWithPhases.modello}` : '',
        descrizione: articleWithPhases.colore,
        percentuale,
      };
    });
  }

  async updateLaunchArticle(
    id: number,
    data: {
      codice?: string;
      descrizione?: string;
      quantita?: number;
      note?: string;
    }
  ) {
    const updateData: any = {
      quantita: data.quantita,
      note: data.note,
    };

    if (data.codice) {
      // Parse codice: formato "F02B227-MQ285Q888" -> commessa: "F02B227", modello: "MQ285Q888"
      const parts = data.codice.split('-');
      updateData.commessa = parts[0] || '';
      updateData.modello = parts.slice(1).join('-') || '';
    }

    if (data.descrizione) {
      updateData.colore = data.descrizione;
    }

    const article = await this.prisma.scmLaunchArticle.update({
      where: { id },
      data: updateData,
    });

    // Transform to include codice and descrizione
    return {
      ...article,
      codice: article.commessa && article.modello ? `${article.commessa}-${article.modello}` : '',
      descrizione: article.colore,
    };
  }

  async deleteLaunchArticle(id: number) {
    return this.prisma.scmLaunchArticle.delete({
      where: { id },
    });
  }

  // ==================== ARTICLE PHASES ====================

  async updateArticlePhase(
    id: number,
    data: {
      stato?: string;
      dataInizio?: Date;
      dataFine?: Date;
      note?: string;
    }
  ) {
    const phase = await this.prisma.scmArticlePhase.findUnique({
      where: { id },
      include: {
        article: {
          include: {
            phases: {
              orderBy: { id: 'asc' },
            },
            launch: true,
          },
        },
      },
    });

    if (!phase) {
      throw new NotFoundException(`Fase con ID ${id} non trovata`);
    }

    // Sequential logic: if marking as COMPLETATA, auto-complete all previous phases
    if (data.stato === 'COMPLETATA') {
      const allPhases = phase.article.phases;
      const currentPhaseIndex = allPhases.findIndex((p) => p.id === id);

      await this.prisma.$transaction(async (tx) => {
        // Auto-complete all previous phases for this article
        for (let i = 0; i < currentPhaseIndex; i++) {
          const prevPhase = allPhases[i];
          if (prevPhase.stato !== 'COMPLETATA') {
            await tx.scmArticlePhase.update({
              where: { id: prevPhase.id },
              data: {
                stato: 'COMPLETATA',
                dataFine: new Date(),
                note: prevPhase.note
                  ? `${prevPhase.note}\nCompletata automaticamente per sequenza`
                  : 'Completata automaticamente per sequenza',
              },
            });
          }
        }

        // Update current phase
        await tx.scmArticlePhase.update({
          where: { id },
          data: {
            ...data,
            dataFine: data.dataFine || new Date(),
          },
        });
      });
    } else {
      // Regular update
      await this.prisma.scmArticlePhase.update({
        where: { id },
        data,
      });
    }

    return this.prisma.scmArticlePhase.findUnique({
      where: { id },
      include: {
        standardPhase: true,
        tracking: true,
      },
    });
  }


  // ==================== PROGRESS TRACKING ====================

  async addProgressTracking(
    phaseId: number,
    data: {
      quantita: number;
      data?: Date;
      note?: string;
    }
  ) {
    return this.prisma.scmProgressTracking.create({
      data: {
        phaseId,
        quantita: data.quantita,
        data: data.data || new Date(),
        note: data.note,
      },
    });
  }

  async getProgressTracking(phaseId: number) {
    return this.prisma.scmProgressTracking.findMany({
      where: { phaseId },
      orderBy: { data: 'desc' },
    });
  }

  // ==================== STANDARD PHASES ====================

  async getStandardPhases(attivo?: boolean) {
    return this.prisma.scmStandardPhase.findMany({
      where: attivo !== undefined ? { attivo } : undefined,
      orderBy: { ordine: 'asc' },
    });
  }

  async getStandardPhase(id: number) {
    const phase = await this.prisma.scmStandardPhase.findUnique({
      where: { id },
    });

    if (!phase) {
      throw new NotFoundException(`Fase standard con ID ${id} non trovata`);
    }

    return phase;
  }

  async createStandardPhase(data: {
    nome: string;
    codice?: string;
    descrizione?: string;
    ordine: number;
    attivo?: boolean;
  }) {
    return this.prisma.scmStandardPhase.create({
      data,
    });
  }

  async updateStandardPhase(
    id: number,
    data: {
      nome?: string;
      codice?: string;
      descrizione?: string;
      ordine?: number;
      attivo?: boolean;
    }
  ) {
    return this.prisma.scmStandardPhase.update({
      where: { id },
      data,
    });
  }

  async deleteStandardPhase(id: number) {
    // Check if phase is used in any articles
    const usageCount = await this.prisma.scmArticlePhase.count({
      where: { phaseId: id },
    });

    if (usageCount > 0) {
      throw new BadRequestException(
        `Non è possibile eliminare la fase: è utilizzata in ${usageCount} articoli`
      );
    }

    return this.prisma.scmStandardPhase.delete({
      where: { id },
    });
  }

  // ==================== SETTINGS ====================

  async getSettings() {
    const settings = await this.prisma.scmSetting.findMany();
    return settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value || '';
      return acc;
    }, {} as Record<string, string>);
  }

  async getSetting(key: string) {
    return this.prisma.scmSetting.findUnique({
      where: { key },
    });
  }

  async setSetting(key: string, value: string) {
    return this.prisma.scmSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }

  async setMultipleSettings(settings: Record<string, string>) {
    const operations = Object.entries(settings).map(([key, value]) =>
      this.prisma.scmSetting.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      })
    );

    await this.prisma.$transaction(operations);
    return this.getSettings();
  }

  // ==================== STATISTICS ====================

  async getStatistics(laboratoryId?: number) {
    const where: any = {};
    if (laboratoryId) {
      where.laboratoryId = laboratoryId;
    }

    const launches = await this.prisma.scmLaunch.findMany({
      where,
      include: {
        articles: true,
      },
    });

    const totalPairs = launches.reduce((sum, launch) => {
      return sum + launch.articles.reduce((articleSum, article) => articleSum + article.quantita, 0);
    }, 0);

    const inPreparation = launches
      .filter((l) => l.stato === 'IN_PREPARAZIONE')
      .reduce((sum, launch) => {
        return sum + launch.articles.reduce((articleSum, article) => articleSum + article.quantita, 0);
      }, 0);

    const inProgress = launches
      .filter((l) => l.stato === 'IN_LAVORAZIONE')
      .reduce((sum, launch) => {
        return sum + launch.articles.reduce((articleSum, article) => articleSum + article.quantita, 0);
      }, 0);

    const completed = launches
      .filter((l) => l.stato === 'COMPLETATO')
      .reduce((sum, launch) => {
        return sum + launch.articles.reduce((articleSum, article) => articleSum + article.quantita, 0);
      }, 0);

    const blocked = launches
      .filter((l) => l.stato === 'BLOCCATO')
      .reduce((sum, launch) => {
        return sum + launch.articles.reduce((articleSum, article) => articleSum + article.quantita, 0);
      }, 0);

    return {
      totalLaunches: launches.length,
      totalPairs,
      byStatus: {
        inPreparation: {
          count: launches.filter((l) => l.stato === 'IN_PREPARAZIONE').length,
          pairs: inPreparation,
        },
        inProgress: {
          count: launches.filter((l) => l.stato === 'IN_LAVORAZIONE').length,
          pairs: inProgress,
        },
        completed: {
          count: launches.filter((l) => l.stato === 'COMPLETATO').length,
          pairs: completed,
        },
        blocked: {
          count: launches.filter((l) => l.stato === 'BLOCCATO').length,
          pairs: blocked,
        },
      },
    };
  }
}
