import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InfantilRecord } from './infantil-record.entity';
import { DiarioBordo } from './diario-bordo.entity';
import { PlanejamentoDiario } from './planejamento-diario.entity';
import {
  UpsertInfantilRecordDto,
  CreateDiarioBordoDto,
  UpdateDiarioBordoDto,
  CreatePlanejamentoDiarioDto,
  UpdatePlanejamentoDiarioDto,
} from './dto/infantil.dto';

@Injectable()
export class InfantilService {
  constructor(
    @InjectRepository(InfantilRecord)
    private recordRepo: Repository<InfantilRecord>,
    @InjectRepository(DiarioBordo)
    private diarioRepo: Repository<DiarioBordo>,
    @InjectRepository(PlanejamentoDiario)
    private planejamentoRepo: Repository<PlanejamentoDiario>,
  ) {}

  // ─── Registros de conceito / parecer ─────────────────────────────────────

  async upsertRecord(dto: UpsertInfantilRecordDto, schoolId: number): Promise<InfantilRecord> {
    let record = await this.recordRepo.findOne({
      where: { studentId: dto.studentId, classId: dto.classId, subjectId: dto.subjectId ?? null, period: dto.period, schoolId },
    });
    if (!record) {
      record = this.recordRepo.create({ ...dto, schoolId });
    } else {
      Object.assign(record, dto);
    }
    return this.recordRepo.save(record);
  }

  async getRecordsByClass(classId: number, period: number, schoolId: number): Promise<InfantilRecord[]> {
    return this.recordRepo.find({
      where: { classId, period, schoolId },
      relations: ['student', 'subject'],
      order: { studentId: 'ASC' },
    });
  }

  async getRecordsByStudent(studentId: number, classId: number, schoolId: number): Promise<InfantilRecord[]> {
    return this.recordRepo.find({
      where: { studentId, classId, schoolId },
      relations: ['subject'],
      order: { period: 'ASC' },
    });
  }

  // ─── Diário de Bordo ─────────────────────────────────────────────────────

  async createDiario(dto: CreateDiarioBordoDto, teacherId: number, schoolId: number): Promise<DiarioBordo> {
    const diario = this.diarioRepo.create({ ...dto, teacherId, schoolId, date: new Date(dto.date) });
    return this.diarioRepo.save(diario);
  }

  async getDiarioByClass(classId: number, schoolId: number): Promise<DiarioBordo[]> {
    return this.diarioRepo.find({
      where: { classId, schoolId },
      relations: ['teacher'],
      order: { date: 'DESC' },
    });
  }

  async updateDiario(id: number, dto: UpdateDiarioBordoDto, schoolId: number): Promise<DiarioBordo> {
    const diario = await this.diarioRepo.findOne({ where: { id, schoolId } });
    if (!diario) throw new NotFoundException('Registro não encontrado');
    Object.assign(diario, dto);
    return this.diarioRepo.save(diario);
  }

  async deleteDiario(id: number, schoolId: number): Promise<void> {
    const diario = await this.diarioRepo.findOne({ where: { id, schoolId } });
    if (!diario) throw new NotFoundException('Registro não encontrado');
    await this.diarioRepo.remove(diario);
  }

  // ─── Planejamento Diário ──────────────────────────────────────────────────

  async createPlanejamento(dto: CreatePlanejamentoDiarioDto, teacherId: number, schoolId: number): Promise<PlanejamentoDiario> {
    const plan = this.planejamentoRepo.create({ ...dto, teacherId, schoolId, date: new Date(dto.date) });
    return this.planejamentoRepo.save(plan);
  }

  async getPlanejamentoByClass(classId: number, schoolId: number): Promise<PlanejamentoDiario[]> {
    return this.planejamentoRepo.find({
      where: { classId, schoolId },
      relations: ['teacher'],
      order: { date: 'DESC' },
    });
  }

  async updatePlanejamento(id: number, dto: UpdatePlanejamentoDiarioDto, schoolId: number): Promise<PlanejamentoDiario> {
    const plan = await this.planejamentoRepo.findOne({ where: { id, schoolId } });
    if (!plan) throw new NotFoundException('Registro não encontrado');
    Object.assign(plan, dto);
    return this.planejamentoRepo.save(plan);
  }

  async deletePlanejamento(id: number, schoolId: number): Promise<void> {
    const plan = await this.planejamentoRepo.findOne({ where: { id, schoolId } });
    if (!plan) throw new NotFoundException('Registro não encontrado');
    await this.planejamentoRepo.remove(plan);
  }
}
