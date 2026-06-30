import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend: Resend | null;
  private readonly from = process.env.MAIL_FROM || 'Walladm <onboarding@resend.dev>';

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
    return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${title}</title></head><body style="margin:0;padding:0;background:#F0F4F8;font-family:'Segoe UI',Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#F0F4F8;padding:40px 0;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;"><tr><td align="center" style="padding-bottom:24px;"><table cellpadding="0" cellspacing="0"><tr><td style="background:#1E3A5F;border-radius:20px;padding:16px 32px;text-align:center;"><img src="https://edusaas-web-xi.vercel.app/logo-icon.png" alt="Walladm" width="40" height="40" style="display:inline-block;vertical-align:middle;margin-right:10px;" /><span style="color:#fff;font-size:22px;font-weight:700;letter-spacing:0.5px;vertical-align:middle;">Wall</span><span style="color:#F5A623;font-size:22px;font-weight:700;letter-spacing:0.5px;vertical-align:middle;">adm</span></td></tr></table></td></tr><tr><td style="background:#fff;border-radius:20px;padding:40px 48px;box-shadow:0 4px 24px rgba(0,0,0,0.07);">${content}</td></tr><tr><td align="center" style="padding-top:28px;"><p style="color:#94a3b8;font-size:12px;margin:0;">© ${new Date().getFullYear()} Walladm · Plataforma de Gestão Educacional</p></td></tr></table></td></tr></table></body></html>`;
  }

  private btnPrimary(url: string, text: string): string {
    return `<table cellpadding="0" cellspacing="0" style="margin:28px auto 0;"><tr><td style="background:#F97316;border-radius:12px;"><a href="${url}" style="display:block;padding:14px 36px;color:#fff;font-size:15px;font-weight:700;text-decoration:none;text-align:center;">${text}</a></td></tr></table>`;
  }

  async sendWelcome(schoolName: string, directorEmail: string, directorName: string) {
    const firstName = directorName.split(' ')[0];
    const content = `
      <h1 style="color:#1E3A5F;font-size:24px;font-weight:700;margin:0 0 8px;">Bem-vindo ao Walladm! 🎉</h1>
      <p style="color:#64748b;font-size:15px;margin:0 0 24px;">Olá, <strong style="color:#1E3A5F;">${firstName}</strong>! Sua escola foi cadastrada com sucesso.</p>
      <div style="background:#F0F4F8;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
        <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Dados do cadastro</p>
        <p style="margin:0 0 4px;font-size:15px;color:#1E3A5F;"><strong>Escola:</strong> ${schoolName}</p>
        <p style="margin:0;font-size:15px;color:#1E3A5F;"><strong>E-mail:</strong> ${directorEmail}</p>
      </div>
      <div style="background:#fff7ed;border:1.5px solid #fed7aa;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0;font-size:14px;color:#9a3412;">⏱ Seu <strong>trial gratuito de 14 dias</strong> já começou!</p>
      </div>
      ${this.btnPrimary('https://edusaas-web-xi.vercel.app/login', 'Acessar o Walladm →')}
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
        subject: `🎉 Bem-vindo ao Walladm, ${firstName}! Seu trial começou`,
        html: this.baseTemplate('Bem-vindo ao Walladm', content),
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
        subject: `⏳ Seu trial do Walladm expira em ${daysLeft} ${daysLeft === 1 ? 'dia' : 'dias'}`,
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
        subject: `🔒 Trial do Walladm encerrado — reative sua conta`,
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
      <p style="color:#64748b;font-size:15px;margin:0 0 24px;">Olá, <strong>${firstName}</strong>! A <strong>${schoolName}</strong> está de volta ao Walladm.</p>
      <div style="background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0;font-size:14px;color:#166534;">✅ Seu acesso foi restaurado. Bem-vindo de volta!</p>
      </div>
      ${this.btnPrimary('https://edusaas-web-xi.vercel.app/login', 'Acessar o Walladm →')}
    `;
    try {
      if (!this.resend) {
        this.logger.warn('[Mail] E-mail não enviado — Resend não configurado');
        return;
      }
      await this.resend.emails.send({
        from: this.from,
        to: email,
        subject: `✅ Conta reativada — Bem-vindo de volta ao Walladm!`,
        html: this.baseTemplate('Conta reativada', content),
      });
      this.logger.log(`[Mail] Reativação enviada para ${email}`);
    } catch (error) {
      this.logger.error(`[Mail] Erro reativação para ${email}:`, error);
    }
  }

  async sendStudentWelcome(name: string, email: string, password: string) {
    const firstName = name.split(' ')[0];
    const content = `
      <h1 style="color:#1E3A5F;font-size:24px;font-weight:700;margin:0 0 8px;">Olá, ${firstName}! 👋</h1>
      <p style="color:#64748b;font-size:15px;margin:0 0 24px;">Sua matrícula foi realizada com sucesso. Aqui estão suas credenciais de acesso:</p>
      <div style="background:#F0F4F8;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
        <p style="margin:0 0 10px;font-size:15px;color:#1E3A5F;">📧 <strong>Email:</strong> ${email}</p>
        <p style="margin:0;font-size:15px;color:#1E3A5F;">🔑 <strong>Senha temporária:</strong> <code style="background:#e2e8f0;padding:2px 8px;border-radius:6px;font-size:14px;">${password}</code></p>
      </div>
      ${this.btnPrimary('https://edusaas-web-xi.vercel.app/login', 'Acessar o Sistema →')}
      <div style="background:#fffbeb;border:1.5px solid #fde68a;border-radius:12px;padding:14px 20px;margin-top:24px;">
        <p style="margin:0;font-size:13px;color:#92400e;">⚠️ Por segurança, recomendamos alterar sua senha após o primeiro acesso.</p>
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
        subject: `${name}, suas credenciais de acesso ao Walladm`,
        html: this.baseTemplate('Credenciais de acesso — Walladm', content),
      });
      this.logger.log(`[Mail] Credenciais enviadas para ${email}`);
    } catch (error) {
      this.logger.error(`[Mail] Erro credenciais para ${email}:`, error);
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

  async sendPlanRenewal(
    schoolName: string,
    email: string,
    name: string,
    planLabel: string,
    nextDueDate: string | null,
    amountPaid: number,
  ) {
    const firstName = name.split(' ')[0];
    const formattedDate = nextDueDate
      ? new Date(nextDueDate + 'T12:00:00').toLocaleDateString('pt-BR')
      : '—';
    const formattedValue = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amountPaid);

    const content = `
      <h1 style="color:#1E3A5F;font-size:24px;font-weight:700;margin:0 0 8px;">Renovação confirmada! ✅</h1>
      <p style="color:#64748b;font-size:15px;margin:0 0 24px;">Olá, <strong style="color:#1E3A5F;">${firstName}</strong>! O pagamento da <strong>${schoolName}</strong> foi confirmado com sucesso.</p>
      <div style="background:#F0F4F8;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
        <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Detalhes da renovação</p>
        <p style="margin:0 0 8px;font-size:15px;color:#1E3A5F;"><strong>Plano:</strong> ${planLabel}</p>
        <p style="margin:0 0 8px;font-size:15px;color:#1E3A5F;"><strong>Valor pago:</strong> ${formattedValue}</p>
        <p style="margin:0;font-size:15px;color:#1E3A5F;"><strong>Próximo vencimento:</strong> ${formattedDate}</p>
      </div>
      <div style="background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0;font-size:14px;color:#166534;">🔓 Seu acesso continua ativo. Obrigado pela confiança!</p>
      </div>
      ${this.btnPrimary('https://edusaas-web-xi.vercel.app/login', 'Acessar o Walladm →')}
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
        to: email,
        subject: `✅ Renovação confirmada — Plano ${planLabel} até ${formattedDate}`,
        html: this.baseTemplate('Renovação confirmada', content),
      });
      this.logger.log(`[Mail] Renovação de plano enviada para ${email}`);
    } catch (error) {
      this.logger.error(`[Mail] Erro renovação de plano para ${email}:`, error);
    }
  }

  /**
   * Envia e-mail de redefinição de senha.
   * @param schoolName - quando informado, exibe "Resetar senha do [Escola]" no e-mail.
   *                     Útil para o cenário multi-escola onde o usuário recebe um
   *                     e-mail separado por vínculo.
   */
  async sendPasswordReset(email: string, name: string, resetToken: string, schoolName?: string) {
    const firstName = name.split(' ')[0];
    const resetUrl = `https://edusaas-web-xi.vercel.app/nova-senha?token=${resetToken}`;

    const schoolLine = schoolName
      ? `<p style="color:#64748b;font-size:14px;margin:0 0 20px;">🏫 Este link é para a conta vinculada a <strong style="color:#1E3A5F;">${schoolName}</strong>.</p>`
      : '';

    const content = `
      <h1 style="color:#1E3A5F;font-size:24px;font-weight:700;margin:0 0 8px;">Redefinição de senha 🔑</h1>
      <p style="color:#64748b;font-size:15px;margin:0 0 16px;">Olá, <strong>${firstName}</strong>! Clique no botão abaixo para criar uma nova senha. Este link expira em <strong>1 hora</strong>.</p>
      ${schoolLine}
      ${this.btnPrimary(resetUrl, 'Redefinir minha senha →')}
      <div style="background:#fef2f2;border:1.5px solid #fecaca;border-radius:12px;padding:14px 20px;margin-top:24px;">
        <p style="margin:0;font-size:13px;color:#991b1b;">🔒 Se não solicitou a redefinição, ignore este e-mail.</p>
      </div>
    `;

    const subject = schoolName
      ? `🔑 Redefinição de senha — ${schoolName} · Walladm`
      : `🔑 Redefinição de senha — Walladm`;

    try {
      if (!this.resend) {
        this.logger.warn('[Mail] E-mail não enviado — Resend não configurado');
        return;
      }
      await this.resend.emails.send({
        from: this.from,
        to: email,
        subject,
        html: this.baseTemplate('Redefinição de senha', content),
      });
      this.logger.log(`[Mail] Reset de senha enviado para ${email}${schoolName ? ` (${schoolName})` : ''}`);
    } catch (error) {
      this.logger.error(`[Mail] Erro reset senha para ${email}:`, error);
    }
  }
}