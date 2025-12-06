import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { userName: username },
      include: { permissions: true },
    });

    if (user && await bcrypt.compare(password, user.password)) {
      const { password: _, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = {
      sub: user.id,
      username: user.userName,
      userType: user.userType,
    };

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Normalizza i permessi
    const permessi = user.permissions?.permessi || {};
    const normalized = this.normalizePermissions(permessi);

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        userName: user.userName,
        nome: user.nome,
        mail: user.mail,
        userType: user.userType,
        permissions: normalized,
      },
    };
  }

  async getProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { permissions: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Normalizza i permessi
    const permessi = user.permissions?.permessi || {};
    const normalized = this.normalizePermissions(permessi);

    const { password: _, ...result } = user;
    return {
      ...result,
      permissions: normalized,
    };
  }

  // Helper per normalizzare le chiavi dei permessi
  private normalizePermissions(permessi: any): any {
    const normalized = { ...permessi };

    // Converti chiavi vecchie in nuove
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

    return normalized;
  }

  async updateProfile(userId: number, data: { nome?: string; mail?: string; mailPassword?: string }) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        userName: true,
        nome: true,
        mail: true,
      },
    });
  }

  async changePassword(userId: number, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !await bcrypt.compare(currentPassword, user.password)) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { message: 'Password changed successfully' };
  }
}
