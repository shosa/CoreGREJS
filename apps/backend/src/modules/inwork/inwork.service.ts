import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

export interface CreateInworkOperatorDto {
  nome: string;
  cognome?: string;
  matricola?: string;
  pin?: string;
  password?: string;
  email?: string;
  reparto?: string;
  ruolo?: string;
  attivo?: boolean;
  modulePermissions?: string[];
}

export interface UpdateInworkOperatorDto {
  nome?: string;
  cognome?: string;
  matricola?: string;
  pin?: string;
  password?: string;
  email?: string;
  reparto?: string;
  ruolo?: string;
  attivo?: boolean;
  modulePermissions?: string[];
}

@Injectable()
export class InworkService {
  constructor(private prisma: PrismaService) {}

  async getAllOperators() {
    const operators = await this.prisma.inworkOperator.findMany({
      include: {
        modulePermissions: true,
      },
      orderBy: [
        { attivo: 'desc' },
        { nome: 'asc' },
      ],
    });

    // Don't expose password in response
    return operators.map(op => {
      const { password, ...rest } = op;
      return rest;
    });
  }

  async getOperatorById(id: number) {
    const operator = await this.prisma.inworkOperator.findUnique({
      where: { id },
      include: {
        modulePermissions: true,
      },
    });

    if (!operator) {
      throw new NotFoundException(`Operatore con ID ${id} non trovato`);
    }

    const { password, ...rest } = operator;
    return rest;
  }

  async createOperator(data: CreateInworkOperatorDto) {
    // Check if matricola already exists
    if (data.matricola) {
      const existing = await this.prisma.inworkOperator.findUnique({
        where: { matricola: data.matricola },
      });
      if (existing) {
        throw new BadRequestException(`Matricola ${data.matricola} già esistente`);
      }
    }

    // Hash password if provided
    let hashedPassword = null;
    if (data.password) {
      hashedPassword = await bcrypt.hash(data.password, 10);
    }

    const { modulePermissions, ...operatorData } = data;

    const operator = await this.prisma.inworkOperator.create({
      data: {
        ...operatorData,
        password: hashedPassword,
      },
      include: {
        modulePermissions: true,
      },
    });

    // Create module permissions if provided
    if (modulePermissions && modulePermissions.length > 0) {
      await this.prisma.inworkModulePermission.createMany({
        data: modulePermissions.map(module => ({
          operatorId: operator.id,
          module,
          enabled: true,
        })),
      });
    }

    const { password, ...rest } = operator;
    return rest;
  }

  async updateOperator(id: number, data: UpdateInworkOperatorDto) {
    const operator = await this.prisma.inworkOperator.findUnique({
      where: { id },
    });

    if (!operator) {
      throw new NotFoundException(`Operatore con ID ${id} non trovato`);
    }

    // Check if matricola already exists (for different operator)
    if (data.matricola && data.matricola !== operator.matricola) {
      const existing = await this.prisma.inworkOperator.findUnique({
        where: { matricola: data.matricola },
      });
      if (existing) {
        throw new BadRequestException(`Matricola ${data.matricola} già esistente`);
      }
    }

    // Hash password if provided
    let hashedPassword = undefined;
    if (data.password) {
      hashedPassword = await bcrypt.hash(data.password, 10);
    }

    const { modulePermissions, ...operatorData } = data;

    // Update operator
    const updated = await this.prisma.inworkOperator.update({
      where: { id },
      data: {
        ...operatorData,
        ...(hashedPassword && { password: hashedPassword }),
      },
      include: {
        modulePermissions: true,
      },
    });

    // Update module permissions if provided
    if (modulePermissions !== undefined) {
      // Delete existing permissions
      await this.prisma.inworkModulePermission.deleteMany({
        where: { operatorId: id },
      });

      // Create new permissions
      if (modulePermissions.length > 0) {
        await this.prisma.inworkModulePermission.createMany({
          data: modulePermissions.map(module => ({
            operatorId: id,
            module,
            enabled: true,
          })),
        });
      }
    }

    const { password, ...rest } = updated;
    return rest;
  }

  async deleteOperator(id: number) {
    const operator = await this.prisma.inworkOperator.findUnique({
      where: { id },
    });

    if (!operator) {
      throw new NotFoundException(`Operatore con ID ${id} non trovato`);
    }

    await this.prisma.inworkOperator.delete({
      where: { id },
    });

    return { success: true, message: 'Operatore eliminato con successo' };
  }

  async toggleOperatorStatus(id: number) {
    const operator = await this.prisma.inworkOperator.findUnique({
      where: { id },
    });

    if (!operator) {
      throw new NotFoundException(`Operatore con ID ${id} non trovato`);
    }

    const updated = await this.prisma.inworkOperator.update({
      where: { id },
      data: {
        attivo: !operator.attivo,
      },
    });

    const { password, ...rest } = updated;
    return rest;
  }

  async getAvailableModules() {
    return [
      { id: 'quality', name: 'Quality Control' },
    ];
  }
}
