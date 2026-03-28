import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Grade } from './grade.entity';
import { CreateGradeDto } from './dto/create-grade.dto';

@Injectable()
export class GradesService {
  constructor(
    @InjectRepository(Grade)
    private gradesRepository: Repository<Grade>,
  ) {}

  async create(dto: CreateGradeDto, schoolId: number): Promise<Grade> {
    // Validar se já existe nota para esse instrumento/período/aluno/disciplina
    const existing = await this.gradesRepository.findOne({
      where: {
        studentId: dto.studentId,
        subjectId: dto.subjectId,
        classId: dto.classId,
        period: dto.period,
        instrument: dto.instrument,
        schoolId,
      },
    });

    if (existing) {
      // Atualiza a nota existente ao invés de duplicar
      existing.value = dto.value;
      existing.label = dto.label ?? existing.label;
      existing.weight = dto.weight ?? existing.weight;
      existing.description = dto.description ?? existing.description;
      return this.gradesRepository.save(existing);
    }

    const grade = this.gradesRepository.create({
      ...dto,
      schoolId,
      weight: dto.weight ?? 1,
    });
    return this.gradesRepository.save(grade);
  }

  // Lançamento em lote (todos os instrumentos de um aluno de uma vez)
  async bulkCreate(grades: CreateGradeDto[], schoolId: number): Promise<Grade[]> {
    const results: Grade[] = [];
    for (const dto of grades) {
      const grade = await this.create(dto, schoolId);
      results.push(grade);
    }
    return results;
  }

  async findByStudent(studentId: number, schoolId: number): Promise<Grade[]> {
    return this.gradesRepository.find({
      where: { studentId, schoolId },
      relations: ['subject', 'schoolClass'],
      order: { period: 'ASC', instrument: 'ASC' },
    });
  }

  async findByClass(classId: number, subjectId: number, schoolId: number): Promise<Grade[]> {
    return this.gradesRepository.find({
      where: { classId, subjectId, schoolId },
      relations: ['student', 'subject'],
      order: { studentId: 'ASC', period: 'ASC', instrument: 'ASC' },
    });
  }

  // Calcula média de um bimestre (com pesos)
  calculatePeriodAverage(grades: Grade[]): number | null {
    if (!grades.length) return null;
    let sumWeighted = 0;
    let sumWeights = 0;
    for (const g of grades) {
      const w = Number(g.weight) || 1;
      sumWeighted += Number(g.value) * w;
      sumWeights += w;
    }
    if (sumWeights === 0) return null;
    return Math.round((sumWeighted / sumWeights) * 100) / 100;
  }

  // Média geral do aluno em uma disciplina (média dos bimestres)
  async getAverage(studentId: number, subjectId: number, schoolId: number): Promise<number> {
    const grades = await this.gradesRepository.find({
      where: { studentId, subjectId, schoolId },
    });
    if (!grades.length) return 0;

    // Agrupar por bimestre e calcular média ponderada de cada
    const byPeriod: Record<number, Grade[]> = {};
    grades.forEach(g => {
      if (!byPeriod[g.period]) byPeriod[g.period] = [];
      byPeriod[g.period].push(g);
    });

    const periodAverages: number[] = [];
    for (const period of Object.keys(byPeriod)) {
      const avg = this.calculatePeriodAverage(byPeriod[Number(period)]);
      if (avg !== null) periodAverages.push(avg);
    }

    if (!periodAverages.length) return 0;
    const sum = periodAverages.reduce((a, b) => a + b, 0);
    return Math.round((sum / periodAverages.length) * 100) / 100;
  }

  async getClassReport(classId: number, schoolId: number) {
    const grades = await this.gradesRepository.find({
      where: { classId, schoolId },
      relations: ['student', 'subject'],
    });

    const report: Record<string, Record<string, Record<number, Grade[]>>> = {};
    grades.forEach(grade => {
      const studentName = grade.student?.name || 'Aluno';
      const subjectName = grade.subject?.name || 'Disciplina';
      if (!report[studentName]) report[studentName] = {};
      if (!report[studentName][subjectName]) report[studentName][subjectName] = {};
      if (!report[studentName][subjectName][grade.period]) report[studentName][subjectName][grade.period] = [];
      report[studentName][subjectName][grade.period].push(grade);
    });

    return Object.entries(report).map(([student, subjects]) => ({
      student,
      subjects: Object.entries(subjects).map(([subject, periods]) => {
        const periodAverages: Record<number, number | null> = {};
        const allAverages: number[] = [];
        for (const [p, gs] of Object.entries(periods)) {
          const avg = this.calculatePeriodAverage(gs as Grade[]);
          periodAverages[Number(p)] = avg;
          if (avg !== null) allAverages.push(avg);
        }
        const overall = allAverages.length
          ? Math.round((allAverages.reduce((a, b) => a + b, 0) / allAverages.length) * 100) / 100
          : null;
        return {
          subject,
          periods: periodAverages,
          average: overall,
          status: overall === null ? 'Pendente' : overall >= 6 ? 'Aprovado' : overall >= 5 ? 'Recuperação' : 'Reprovado',
        };
      }),
    }));
  }
}
