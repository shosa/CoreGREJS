import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        userName: true,
        nome: true,
        mail: true,
        lastLogin: true,
        createdAt: true,
      },
      orderBy: { nome: 'asc' },
    });
  }

  async getStats() {
    const total = await this.prisma.user.count();

    return {
      total,
    };
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        userName: true,
        nome: true,
        mail: true,
        lastLogin: true,
        createdAt: true,
        permissions: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Utente non trovato');
    }

    return user;
  }

  async create(data: any) {
    const hashedPassword = await bcrypt.hash(data.password, 12);

    const user = await this.prisma.user.create({
      data: {
        userName: data.userName,
        nome: data.nome,
        mail: data.mail,
        password: hashedPassword,
      },
      select: {
        id: true,
        userName: true,
        nome: true,
        mail: true,
        createdAt: true,
      },
    });

    // Crea permessi di default
    await this.prisma.permission.create({
      data: {
        userId: user.id,
        permessi: {},
      },
    });

    return user;
  }

  async update(id: number, data: any) {
    const updateData: any = {};

    if (data.userName) updateData.userName = data.userName;
    if (data.nome) updateData.nome = data.nome;
    if (data.mail) updateData.mail = data.mail;
    if (data.mailPassword !== undefined) updateData.mailPassword = data.mailPassword;

    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 12);
    }

    return this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        userName: true,
        nome: true,
        mail: true,
        createdAt: true,
      },
    });
  }

  async delete(id: number) {
    // Prima elimina i permessi
    await this.prisma.permission.deleteMany({
      where: { userId: id },
    });

    return this.prisma.user.delete({
      where: { id },
    });
  }

  async deleteBulk(ids: number[]) {
    // Elimina permessi
    await this.prisma.permission.deleteMany({
      where: { userId: { in: ids } },
    });

    // Elimina utenti
    return this.prisma.user.deleteMany({
      where: { id: { in: ids } },
    });
  }

  async getPermissions(userId: number) {
    const permission = await this.prisma.permission.findUnique({
      where: { userId },
    });

    if (!permission) {
      return {
        riparazioni: false,
        produzione: false,
        quality: false,
        export: false,
        scm_admin: false,
        tracking: false,
        mrp: false,
        users: false,
        log: false,
        dbsql: false,
        settings: false,
      };
    }

    return permission.permessi as any;
  }

  async updatePermissions(userId: number, permessi: any) {
    return this.prisma.permission.upsert({
      where: { userId },
      update: { permessi },
      create: { userId, permessi },
    });
  }
}
