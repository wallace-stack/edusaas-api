import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  async sendWelcome(schoolName: string, directorEmail: string, directorName: string) {
    this.logger.log(`Boas-vindas: ${directorEmail} — ${schoolName}`);
  }

  async sendTrialExpiringSoon(schoolName: string, email: string, name: string, daysLeft: number) {
    this.logger.log(`Trial expirando em ${daysLeft} dias: ${email}`);
  }

  async sendTrialExpired(schoolName: string, email: string, name: string) {
    this.logger.log(`Trial expirado: ${email}`);
  }

  async sendReactivation(schoolName: string, email: string, name: string) {
    this.logger.log(`Reativacao: ${email}`);
  }
}