import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  constructor(private mailerService: MailerService) {}

  // E-mail de boas-vindas
  async sendWelcome(schoolName: string, directorEmail: string, directorName: string) {
    await this.mailerService.sendMail({
      to: directorEmail,
      subject: `Bem-vindo ao EduSaaS, ${schoolName}!`,
      html: `
        <h2>Olá, ${directorName}!</h2>
        <p>Sua escola <strong>${schoolName}</strong> foi cadastrada com sucesso!</p>
        <p>Você tem <strong>14 dias gratuitos</strong> para explorar todas as funcionalidades.</p>
        <p>Acesse agora: <a href="https://app.edusaas.com">app.edusaas.com</a></p>
        <br/>
        <p>Qualquer dúvida, estamos à disposição!</p>
        <p>Equipe EduSaaS</p>
      `,
    });
  }

  // Aviso 3 dias antes do vencimento
  async sendTrialExpiringSoon(schoolName: string, email: string, name: string, daysLeft: number) {
    await this.mailerService.sendMail({
      to: email,
      subject: `Seu trial expira em ${daysLeft} dias — EduSaaS`,
      html: `
        <h2>Olá, ${name}!</h2>
        <p>Seu período gratuito da <strong>${schoolName}</strong> expira em <strong>${daysLeft} dias</strong>.</p>
        <p>Para continuar usando sem interrupções, escolha um plano:</p>
        <a href="https://app.edusaas.com/planos" style="background:#E0234E;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin:16px 0">
          Ver planos
        </a>
        <p>Equipe EduSaaS</p>
      `,
    });
  }

  // E-mail de trial expirado
  async sendTrialExpired(schoolName: string, email: string, name: string) {
    await this.mailerService.sendMail({
      to: email,
      subject: `Seu acesso expirou — EduSaaS`,
      html: `
        <h2>Olá, ${name}!</h2>
        <p>O período gratuito da <strong>${schoolName}</strong> expirou.</p>
        <p><strong>Seus dados estão preservados por 30 dias.</strong></p>
        <p>Assine agora e retome de onde parou:</p>
        <a href="https://app.edusaas.com/planos" style="background:#E0234E;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin:16px 0">
          Assinar agora
        </a>
        <p>Equipe EduSaaS</p>
      `,
    });
  }

  // E-mail de recuperação (dia 21)
  async sendReactivation(schoolName: string, email: string, name: string) {
    await this.mailerService.sendMail({
      to: email,
      subject: `Seus dados ainda estão aqui — EduSaaS`,
      html: `
        <h2>Olá, ${name}!</h2>
        <p>Seus dados da <strong>${schoolName}</strong> ainda estão salvos.</p>
        <p>Reative agora com <strong>20% de desconto</strong> no primeiro mês!</p>
        <a href="https://app.edusaas.com/planos?desconto=REATIVA20" style="background:#E0234E;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin:16px 0">
          Reativar com desconto
        </a>
        <p>Equipe EduSaaS</p>
      `,
    });
  }
}