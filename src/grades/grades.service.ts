import { Injectable, NotFoundException } from '@nestjs/common';
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

  // Professor lança nota
  async create(dto: CreateGradeDto, schoolId: number): Promise<Grade> {
    const grade = this.gradesRepository.create({ ...dto, schoolId });
    return this.gradesRepository.save(grade);
  }

  // Lista notas de um aluno por disciplina
  async findByStudent(studentId: number, schoolId: number): Promise<Grade[]> {
    return this.gradesRepository.find({
      where: { studentId, schoolId },
      relations: ['subject', 'schoolClass'],
      order: { createdAt: 'DESC' },
    });
  }

  // Lista notas de uma turma por disciplina
  async findByClass(classId: number, subjectId: number, schoolId: number): Promise<Grade[]> {
    return this.gradesRepository.find({
      where: { classId, subjectId, schoolId },
      relations: ['student', 'subject'],
      order: { studentId: 'ASC' },
    });
  }

  // Calcula média de um aluno em uma disciplina
  async getAverage(studentId: number, subjectId: number, schoolId: number): Promise<number> {
    const grades = await this.gradesRepository.find({
      where: { studentId, subjectId, schoolId },
    });
    if (!grades.length) return 0;
    const sum = grades.reduce((acc, g) => acc + Number(g.value), 0);
    return Math.round((sum / grades.length) * 100) / 100;
  }

  // Relatório completo de notas de uma turma
  async getClassReport(classId: number, schoolId: number) {
    const grades = await this.gradesRepository.find({
      where: { classId, schoolId },
      relations: ['student', 'subject'],
    });

    const report: any = {};
    grades.forEach(grade => {
      const studentName = grade.student.name;
      const subjectName = grade.subject.name;
      if (!report[studentName]) report[studentName] = {};
      if (!report[studentName][subjectName]) report[studentName][subjectName] = [];
      report[studentName][subjectName].push(Number(grade.value));
    });

    return Object.entries(report).map(([student, subjects]: any) => ({
      student,
      subjects: Object.entries(subjects).map(([subject, values]: any) => ({
        subject,
        grades: values,
        average: Math.round((values.reduce((a: number, b: number) => a + b, 0) / values.length) * 100) / 100,
        status: (values.reduce((a: number, b: number) => a + b, 0) / values.length) >= 6 ? 'Aprovado' : 'Reprovado',
      })),
    }));
  }
}