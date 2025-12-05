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
        adminType: true,
        lastLogin: true,
        createdAt: true,
      },
      orderBy: { nome: 'asc' },
    });
  }

  async getStats() {
    const users = await this.prisma.user.findMany({
      select: { adminType: true },
    });

    return {
      total: users.length,
      admins: users.filter(u => u.adminType === 'admin').length,
      managers: users.filter(u => u.adminType === 'manager').length,
      users: users.filter(u => u.adminType === 'user' || u.adminType === 'viewer').length,
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
        adminType: true,
        themeColor: true,
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
        adminType: data.adminType || 'user',
        themeColor: data.themeColor || 'blue',
      },
      select: {
        id: true,
        userName: true,
        nome: true,
        mail: true,
        adminType: true,
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
    if (data.adminType) updateData.adminType = data.adminType;
    if (data.themeColor) updateData.themeColor = data.themeColor;

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
        adminType: true,
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
        qualita: false,
        export: false,
        scm_admin: false,
        tracking: false,
        mrp: false,
        users: false,
        log: false,
        etichette: false,
        dbsql: false,
        settings: false,
        admin: false,
      };
    }

    // Normalizza le chiavi dei permessi (converte vecchie chiavi in nuove)
    const permessi = permission.permessi as any;
    const normalized = { ...permessi };

    // Migra chiavi vecchie se presenti
    if ('quality' in permessi) {
      normalized.qualita = permessi.quality;
      delete normalized.quality;
    }
    if ('scm' in permessi) {
      normalized.scm_admin = permessi.scm;
      delete normalized.scm;
    }
    if ('utenti' in permessi) {
      normalized.users = permessi.utenti;
      delete normalized.utenti;
    }

    // Aggiorna il database con le chiavi normalizzate se ci sono state modifiche
    if (
      'quality' in permessi ||
      'scm' in permessi ||
      'utenti' in permessi
    ) {
      await this.prisma.permission.update({
        where: { userId },
        data: { permessi: normalized },
      });
    }

    return normalized;
  }

  async updatePermissions(userId: number, permessi: any) {
    // Normalizza le chiavi prima di salvare
    const normalized = { ...permessi };

    // Converti chiavi vecchie in nuove se presenti
    if ('quality' in normalized) {
      normalized.qualita = normalized.quality;
      delete normalized.quality;
    }
    if ('scm' in normalized) {
      normalized.scm_admin = normalized.scm;
      delete normalized.scm;
    }
    if ('utenti' in normalized) {
      normalized.users = normalized.utenti;
      delete normalized.utenti;
    }

    return this.prisma.permission.upsert({
      where: { userId },
      update: { permessi: normalized },
      create: { userId, permessi: normalized },
    });
  }
}
