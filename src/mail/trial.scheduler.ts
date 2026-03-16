import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { School, SchoolStatus } from '../schools/school.entity';
import { User, UserRole } from '../users/user.entity';
import { MailService } from './mail.service';

@Injectable()
export class TrialScheduler {
  private readonly logger = new Logger(TrialScheduler.name);

  constructor(
    @InjectRepository(School)
    private schoolsRepository: Repository<School>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private mailService: MailService,
  ) {}

  // Roda todo dia às 8h da manhã
  @Cron('0 8 * * *')
  async checkTrials() {
    this.logger.log('Verificando trials...');
    const today = new Date();

    const schools = await this.schoolsRepository.find({
      where: { status: SchoolStatus.TRIAL },
    });

    for (const school of schools) {
      const director = await this.usersRepository.findOne({
        where: { schoolId: school.id, role: UserRole.DIRECTOR },
      });

      if (!director) continue;

      const trialExpires = new Date(school.trialExpiresAt);
      const daysLeft = Math.ceil((trialExpires.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      // 3 dias antes
      if (daysLeft === 3) {
        await this.mailService.sendTrialExpiringSoon(school.name, director.email, director.name, 3);
        this.logger.log(`Aviso 3 dias: ${school.name}`);
      }

      // 1 dia antes
      if (daysLeft === 1) {
        await this.mailService.sendTrialExpiringSoon(school.name, director.email, director.name, 1);
        this.logger.log(`Aviso 1 dia: ${school.name}`);
      }

      // Trial expirado
      if (daysLeft <= 0 && school.status === SchoolStatus.TRIAL) {
        school.status = SchoolStatus.EXPIRED;
        await this.schoolsRepository.save(school);
        await this.mailService.sendTrialExpired(school.name, director.email, director.name);
        this.logger.log(`Trial expirado: ${school.name}`);
      }

      // Dia 21 — reativação
      const daysSinceExpired = Math.abs(daysLeft);
      if (daysSinceExpired === 7 && school.status === SchoolStatus.EXPIRED) {
        await this.mailService.sendReactivation(school.name, director.email, director.name);
        this.logger.log(`E-mail reativacao: ${school.name}`);
      }
    }
  }
}