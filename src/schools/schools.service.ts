import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { School, SchoolStatus } from './school.entity';
import { CreateSchoolDto } from './dto/create-school.dto';

@Injectable()
export class SchoolsService {
  constructor(
    @InjectRepository(School)
    private schoolsRepository: Repository<School>,
  ) {}

  // Cria uma nova escola e inicia o trial de 14 dias
  async create(createSchoolDto: CreateSchoolDto): Promise<School> {
    try {
      const trialDays = 14;
      const trialExpiresAt = new Date();
      trialExpiresAt.setDate(trialExpiresAt.getDate() + trialDays);

      const school = this.schoolsRepository.create({
        ...createSchoolDto,
        status: SchoolStatus.TRIAL,
        trialExpiresAt,
      });

      return await this.schoolsRepository.save(school);
    } catch (error: any) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new ConflictException('CNPJ ou email já cadastrado');
      }
      throw error;
    }
  }

  // Busca escola por ID
  async findOne(id: number): Promise<School> {
    const school = await this.schoolsRepository.findOne({ where: { id } });
    if (!school) throw new NotFoundException('Escola não encontrada');
    return school;
  }

  // Lista todas as escolas
  async findAll(): Promise<School[]> {
    return this.schoolsRepository.find();
  }

  // Verifica se o trial ainda é válido
  async isTrialValid(schoolId: number): Promise<boolean> {
    const school = await this.findOne(schoolId);
    if (school.status !== SchoolStatus.TRIAL) return false;
    return new Date() < new Date(school.trialExpiresAt);
  }

  // Verifica se a escola tem acesso (trial ou assinatura ativa)
  async hasAccess(schoolId: number): Promise<boolean> {
    const school = await this.findOne(schoolId);
    if (school.status === SchoolStatus.ACTIVE) return true;
    if (school.status === SchoolStatus.TRIAL) {
      return new Date() < new Date(school.trialExpiresAt);
    }
    return false;
  }
}