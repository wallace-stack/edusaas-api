import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { School } from './school.entity';

@Injectable()
export class SchoolsService {
  constructor(
    @InjectRepository(School)
    private schoolsRepository: Repository<School>,
  ) {}

  // Busca escola por CNPJ — usado para verificar duplicata antes do cadastro
  async findByCnpj(cnpj: string): Promise<School | null> {
    return this.schoolsRepository.findOne({
      where: { cnpj: cnpj.replace(/\D/g, '') },
    });
  }

  // Cria escola — uso geral (fora de transação)
  async create(data: Partial<School>): Promise<School> {
    try {
      const school = this.schoolsRepository.create(data);
      return await this.schoolsRepository.save(school);
    } catch (error: any) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new ConflictException('CNPJ já cadastrado.');
      }
      throw error;
    }
  }

  // Cria escola DENTRO de uma transação existente
  async createWithRunner(data: Partial<School>, queryRunner: QueryRunner): Promise<School> {
    const school = queryRunner.manager.create(School, data);
    return await queryRunner.manager.save(School, school);
  }

  // Busca escola por ID
  async findOne(id: number): Promise<School | null> {
    return this.schoolsRepository.findOne({ where: { id } });
  }
}