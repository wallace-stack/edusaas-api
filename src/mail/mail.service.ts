import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend: Resend | null;
  private readonly from = process.env.MAIL_FROM || 'EduSaaS <onboarding@resend.dev>';

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      this.resend = new Resend(apiKey);
      this.logger.log('MailService inicializado com Resend');
    } else {
      this.resend = null;
      this.logger.warn('RESEND_API_KEY não configurada — e-mails desabilitados');
    }
  }

  private baseTemplate(title: string, content: string): string {
    return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${title}</title></head><body style="margin:0;padding:0;background:#F0F4F8;font-family:'Segoe UI',Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#F0F4F8;padding:40px 0;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;"><tr><td align="center" style="padding-bottom:24px;"><table cellpadding="0" cellspacing="0"><tr><td style="background:#1E3A5F;border-radius:16px;padding:12px 24px;text-align:center;"><span style="color:#fff;font-size:22px;font-weight:700;letter-spacing:1px;">EduSaaS</span></td></tr></table></td></tr><tr><td style="background:#fff;border-radius:20px;padding:40px 48px;box-shadow:0 4px 24px rgba(0,0,0,0.07);">${content}</td></tr><tr><td align="center" style="padding-top:28px;"><p style="color:#94a3b8;font-size:12px;margin:0;">© ${new Date().getFullYear()} EduSaaS · Plataforma de Gestão Educacional</p></td></tr></table></td></tr></table></body></html>`;
  }

  private btnPrimary(url: string, text: string): string {
    return `<table cellpadding="0" cellspacing="0" style="margin:28px auto 0;"><tr><td style="background:#F97316;border-radius:12px;"><a href="${url}" style="display:block;padding:14px 36px;color:#fff;font-size:15px;font-weight:700;text-decoration:none;text-align:center;">${text}</a></td></tr></table>`;
  }

  async sendWelcome(schoolName: string, directorEmail: string, directorName: string) {
    const firstName = directorName.split(' ')[0];
    const content = `
      <h1 style="color:#1E3A5F;font-size:24px;font-weight:700;margin:0 0 8px;">Bem-vindo ao EduSaaS! 🎉</h1>
      <p style="color:#64748b;font-size:15px;margin:0 0 24px;">Olá, <strong style="color:#1E3A5F;">${firstName}</strong>! Sua escola foi cadastrada com sucesso.</p>
      <div style="background:#F0F4F8;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
        <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Dados do cadastro</p>
        <p style="margin:0 0 4px;font-size:15px;color:#1E3A5F;"><strong>Escola:</strong> ${schoolName}</p>
        <p style="margin:0;font-size:15px;color:#1E3A5F;"><strong>E-mail:</strong> ${directorEmail}</p>
      </div>
      <div style="background:#fff7ed;border:1.5px solid #fed7aa;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0;font-size:14px;color:#9a3412;">⏱ Seu <strong>trial gratuito de 14 dias</strong> já começou!</p>
      </div>
      ${this.btnPrimary('https://edusaas-web-xi.vercel.app/login', 'Acessar o EduSaaS →')}
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:32px 0 24px;">
      <p style="color:#94a3b8;font-size:13px;margin:0;text-align:center;">Qualquer dúvida, responda este e-mail. 💙</p>
    `;
    try {
      if (!this.resend) {
        this.logger.warn('[Mail] E-mail não enviado — Resend não configurado');
        return;
      }
      await this.resend.emails.send({
        from: this.from,
        to: directorEmail,
        subject: `🎉 Bem-vindo ao EduSaaS, ${firstName}! Seu trial começou`,
        html: this.baseTemplate('Bem-vindo ao EduSaaS', content),
      });
      this.logger.log(`[Mail] Boas-vindas enviado para ${directorEmail}`);
    } catch (error) {
      this.logger.error(`[Mail] Erro boas-vindas para ${directorEmail}:`, error);
    }
  }

  async sendTrialExpiringSoon(schoolName: string, email: string, name: string, daysLeft: number) {
    const firstName = name.split(' ')[0];
    const content = `
      <h1 style="color:#1E3A5F;font-size:24px;font-weight:700;margin:0 0 8px;">Seu trial expira em ${daysLeft} ${daysLeft === 1 ? 'dia' : 'dias'} ⏳</h1>
      <p style="color:#64748b;font-size:15px;margin:0 0 24px;">Olá, <strong>${firstName}</strong>! O trial da <strong>${schoolName}</strong> está chegando ao fim.</p>
      <div style="background:#fffbeb;border:1.5px solid #fde68a;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0;font-size:14px;color:#92400e;">⚠️ Após o vencimento, o acesso será suspenso.</p>
      </div>
      ${this.btnPrimary('https://edusaas-web-xi.vercel.app/planos', 'Ver planos e assinar →')}
    `;
    try {
      if (!this.resend) {
        this.logger.warn('[Mail] E-mail não enviado — Resend não configurado');
        return;
      }
      await this.resend.emails.send({
        from: this.from,
        to: email,
        subject: `⏳ Seu trial do EduSaaS expira em ${daysLeft} ${daysLeft === 1 ? 'dia' : 'dias'}`,
        html: this.baseTemplate('Trial expirando', content),
      });
      this.logger.log(`[Mail] Trial expirando enviado para ${email}`);
    } catch (error) {
      this.logger.error(`[Mail] Erro trial expirando para ${email}:`, error);
    }
  }

  async sendTrialExpired(schoolName: string, email: string, name: string) {
    const firstName = name.split(' ')[0];
    const content = `
      <h1 style="color:#1E3A5F;font-size:24px;font-weight:700;margin:0 0 8px;">Seu trial encerrou 😢</h1>
      <p style="color:#64748b;font-size:15px;margin:0 0 24px;">Olá, <strong>${firstName}</strong>! O período gratuito da <strong>${schoolName}</strong> chegou ao fim.</p>
      <div style="background:#fef2f2;border:1.5px solid #fecaca;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0;font-size:14px;color:#991b1b;">🔒 O acesso foi suspenso. Assine um plano para reativar.</p>
      </div>
      ${this.btnPrimary('https://edusaas-web-xi.vercel.app/planos', 'Escolher um plano →')}
    `;
    try {
      if (!this.resend) {
        this.logger.warn('[Mail] E-mail não enviado — Resend não configurado');
        return;
      }
      await this.resend.emails.send({
        from: this.from,
        to: email,
        subject: `🔒 Trial do EduSaaS encerrado — reative sua conta`,
        html: this.baseTemplate('Trial encerrado', content),
      });
      this.logger.log(`[Mail] Trial expirado enviado para ${email}`);
    } catch (error) {
      this.logger.error(`[Mail] Erro trial expirado para ${email}:`, error);
    }
  }

  async sendReactivation(schoolName: string, email: string, name: string) {
    const firstName = name.split(' ')[0];
    const content = `
      <h1 style="color:#1E3A5F;font-size:24px;font-weight:700;margin:0 0 8px;">Conta reativada! 🚀</h1>
      <p style="color:#64748b;font-size:15px;margin:0 0 24px;">Olá, <strong>${firstName}</strong>! A <strong>${schoolName}</strong> está de volta ao EduSaaS.</p>
      <div style="background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0;font-size:14px;color:#166534;">✅ Seu acesso foi restaurado. Bem-vindo de volta!</p>
      </div>
      ${this.btnPrimary('https://edusaas-web-xi.vercel.app/login', 'Acessar o EduSaaS →')}
    `;
    try {
      if (!this.resend) {
        this.logger.warn('[Mail] E-mail não enviado — Resend não configurado');
        return;
      }
      await this.resend.emails.send({
        from: this.from,
        to: email,
        subject: `✅ Conta reativada — Bem-vindo de volta ao EduSaaS!`,
        html: this.baseTemplate('Conta reativada', content),
      });
      this.logger.log(`[Mail] Reativação enviada para ${email}`);
    } catch (error) {
      this.logger.error(`[Mail] Erro reativação para ${email}:`, error);
    }
  }

  async sendMail({ to, subject, html }: { to: string; subject: string; html: string }) {
    try {
      if (!this.resend) {
        this.logger.warn('[Mail] E-mail não enviado — Resend não configurado');
        return;
      }
      await this.resend.emails.send({ from: this.from, to, subject, html });
      this.logger.log(`[Mail] E-mail enviado para ${to}`);
    } catch (error) {
      this.logger.error(`[Mail] Erro ao enviar para ${to}:`, error);
    }
  }

  async sendPasswordReset(email: string, name: string, resetToken: string) {
    const firstName = name.split(' ')[0];
    const resetUrl = `https://edusaas-web-xi.vercel.app/nova-senha?token=${resetToken}`;
    const content = `
      <h1 style="color:#1E3A5F;font-size:24px;font-weight:700;margin:0 0 8px;">Redefinição de senha 🔑</h1>
      <p style="color:#64748b;font-size:15px;margin:0 0 24px;">Olá, <strong>${firstName}</strong>! Clique no botão abaixo para criar uma nova senha. Este link expira em <strong>1 hora</strong>.</p>
      ${this.btnPrimary(resetUrl, 'Redefinir minha senha →')}
      <div style="background:#fef2f2;border:1.5px solid #fecaca;border-radius:12px;padding:14px 20px;margin-top:24px;">
        <p style="margin:0;font-size:13px;color:#991b1b;">🔒 Se não solicitou a redefinição, ignore este e-mail.</p>
      </div>
    `;
    try {
      if (!this.resend) {
        this.logger.warn('[Mail] E-mail não enviado — Resend não configurado');
        return;
      }
      await this.resend.emails.send({
        from: this.from,
        to: email,
        subject: `🔑 Redefinição de senha — EduSaaS`,
        html: this.baseTemplate('Redefinição de senha', content),
      });
      this.logger.log(`[Mail] Reset de senha enviado para ${email}`);
    } catch (error) {
      this.logger.error(`[Mail] Erro reset senha para ${email}:`, error);
    }
  }
}