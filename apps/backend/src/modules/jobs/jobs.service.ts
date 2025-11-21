import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Job, Prisma } from '@prisma/client';

export type JobStatus = 'queued' | 'running' | 'done' | 'failed';

@Injectable()
export class JobsService {
  constructor(private prisma: PrismaService) {}

  async createJob(userId: number, type: string, payload: Prisma.JsonValue): Promise<Job> {
    return this.prisma.job.create({
      data: {
        userId,
        type,
        payload,
        status: 'queued',
        progress: 0,
      },
    });
  }

  async listJobs(userId: number, status?: JobStatus, limit = 100): Promise<Job[]> {
    return this.prisma.job.findMany({
      where: {
        userId,
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getJob(id: string, userId: number): Promise<Job> {
    const job = await this.prisma.job.findUnique({ where: { id } });
    if (!job) {
      throw new NotFoundException('Job non trovato');
    }
    if (job.userId !== userId) {
      throw new ForbiddenException('Accesso non autorizzato al job');
    }
    return job;
  }

  async markRunning(id: string): Promise<Job> {
    return this.prisma.job.update({
      where: { id },
      data: {
        status: 'running',
        startedAt: new Date(),
        errorMessage: null,
      },
    });
  }

  async markDone(
    id: string,
    output: { outputPath?: string; outputName?: string; outputMime?: string },
  ): Promise<Job> {
    return this.prisma.job.update({
      where: { id },
      data: {
        status: 'done',
        progress: 100,
        finishedAt: new Date(),
        ...output,
      },
    });
  }

  async markFailed(id: string, errorMessage: string): Promise<Job> {
    return this.prisma.job.update({
      where: { id },
      data: {
        status: 'failed',
        progress: 0,
        finishedAt: new Date(),
        errorMessage,
      },
    });
  }

  async deleteJob(id: string, userId: number) {
    const job = await this.prisma.job.findUnique({ where: { id } });
    if (!job) {
      throw new NotFoundException('Job non trovato');
    }
    if (job.userId !== userId) {
      throw new ForbiddenException('Accesso non autorizzato al job');
    }
    return this.prisma.job.delete({ where: { id } });
  }

  async findByIdsForUser(ids: string[], userId: number) {
    return this.prisma.job.findMany({
      where: {
        id: { in: ids },
        userId,
      },
    });
  }
}
