import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';

export interface EmailOptions {
  from: string;
  to: string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: Buffer;
  }>;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
  ) {}

  async getSmtpConfig() {
    const settings = await this.prisma.setting.findMany({
      where: {
        key: {
          startsWith: 'smtp.',
        },
      },
    });

    const config: any = {
      host: '',
      port: 587,
      secure: false,
      user: '',
      password: '',
    };

    settings.forEach(setting => {
      const key = setting.key.replace('smtp.', '');
      if (key === 'port') {
        config[key] = parseInt(setting.value || '587', 10);
      } else if (key === 'secure') {
        config[key] = setting.value === 'true';
      } else {
        config[key] = setting.value || '';
      }
    });

    return config;
  }

  async sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const smtpConfig = await this.getSmtpConfig();

      if (!smtpConfig.host || !smtpConfig.user) {
        throw new BadRequestException('Configurazione SMTP non completa. Configura il server mail nelle impostazioni.');
      }

      const transporter = nodemailer.createTransport({
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.secure,
        auth: {
          user: smtpConfig.user,
          pass: smtpConfig.password,
        },
      });

      const info = await transporter.sendMail({
        from: options.from,
        to: options.to.join(', '),
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments: options.attachments,
      });

      this.logger.log(`✉️  Email inviata con successo: ${info.messageId}`);

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error: any) {
      this.logger.error(`❌ Errore invio email: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async sendProduzionePdf(date: string, pdfPath: string, userId: number): Promise<{ success: boolean; error?: string }> {
    try {
      // Get user info
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { mail: true, mailPassword: true },
      });

      if (!user || !user.mail) {
        throw new BadRequestException('Email utente non configurata. Configura l\'email nel tuo profilo.');
      }

      if (!user.mailPassword) {
        throw new BadRequestException('Password email non configurata. Configura la password email nel tuo profilo.');
      }

      // Get recipients and CCN from settings
      const [recipientsSetting, ccnSetting] = await Promise.all([
        this.prisma.setting.findUnique({ where: { key: 'produzione.email.recipients' } }),
        this.prisma.setting.findUnique({ where: { key: 'produzione.email.ccn' } }),
      ]);

      if (!recipientsSetting || !recipientsSetting.value) {
        throw new BadRequestException('Nessun destinatario configurato per le email di produzione. Configura gli indirizzi nelle impostazioni.');
      }

      let recipients: string[];
      try {
        recipients = JSON.parse(recipientsSetting.value);
      } catch {
        throw new BadRequestException('Errore nel formato degli indirizzi email configurati.');
      }

      if (!recipients || recipients.length === 0) {
        throw new BadRequestException('Nessun destinatario configurato per le email di produzione.');
      }

      let ccn: string[] = [];
      try { ccn = JSON.parse(ccnSetting?.value || '[]'); } catch { ccn = []; }

      // Download PDF from MinIO (pdfPath is now MinIO object name like "jobs/userId/jobId/file.pdf")
      let pdfBuffer: Buffer;
      try {
        pdfBuffer = await this.storageService.getFileBuffer(pdfPath);
        this.logger.log(`PDF scaricato da MinIO: ${pdfPath}`);
      } catch (error) {
        this.logger.error(`Errore download PDF da MinIO: ${error.message}`);
        throw new BadRequestException('File PDF non trovato in MinIO. Genera prima il PDF.');
      }

      // Get SMTP config
      const smtpConfig = await this.getSmtpConfig();

      if (!smtpConfig.host) {
        throw new BadRequestException('Configurazione SMTP non completa. Configura il server mail nelle impostazioni.');
      }

      // Create transporter with user credentials
      const transporter = nodemailer.createTransport({
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.secure,
        auth: {
          user: user.mail,
          pass: user.mailPassword,
        },
      });

      // Format date for display
      const [year, month, day] = date.split('-');
      const dateFormatted = `${day}/${month}/${year}`;

      const info = await transporter.sendMail({
        from: user.mail,
        to: recipients.join(', '),
        ...(ccn.length > 0 && { bcc: ccn.join(', ') }),
        subject: `Produzione del ${dateFormatted}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <p>In allegato rapporto produzione del ${dateFormatted}.</p>
          </div>
        `,
        attachments: [
          {
            filename: `PRODUZIONE_${date}.pdf`,
            content: pdfBuffer,
          },
        ],
      });

      this.logger.log(`✉️  Email inviata con successo: ${info.messageId}`);

      return { success: true };
    } catch (error: any) {
      this.logger.error(`❌ Errore invio email produzione: ${error.message}`);

      // Customize error messages for common issues
      let userMessage = error.message;

      if (error.message.includes('Invalid login') || error.message.includes('authentication rejected')) {
        userMessage = 'Credenziali email non valide. Verifica l\'indirizzo email e la password nelle impostazioni del tuo profilo.';
      } else if (error.message.includes('ECONNREFUSED')) {
        userMessage = 'Impossibile connettersi al server SMTP. Verifica la configurazione del server mail nelle impostazioni.';
      } else if (error.message.includes('ETIMEDOUT') || error.message.includes('timeout')) {
        userMessage = 'Timeout nella connessione al server mail. Riprova più tardi.';
      }

      throw new BadRequestException(userMessage);
    }
  }
}
