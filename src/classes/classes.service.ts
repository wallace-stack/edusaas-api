import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SchoolClass } from './class.entity';
import { SchoolSubject } from './subject.entity';
import { CreateClassDto } from './dto/create-class.dto';
import { CreateSubjectDto } from './dto/create-subject.dto';

@Injectable()
export class ClassesService {
  constructor(
    @InjectRepository(SchoolClass)
    private classesRepository: Repository<SchoolClass>,
    @InjectRepository(SchoolSubject)
    private SchoolSubjectsRepository: Repository<SchoolSubject>,
  ) {}

  async createClass(dto: CreateClassDto, schoolId: number): Promise<SchoolClass> {
    const schoolClass = this.classesRepository.create({ ...dto, schoolId });
    return this.classesRepository.save(schoolClass);
  }

  async findAllClasses(schoolId: number): Promise<any[]> {
    const currentYear = new Date().getFullYear();
    const classes = await this.classesRepository
      .createQueryBuilder('c')
      .leftJoin('c.subjects', 'subject')
      .leftJoin('subject.teacher', 'teacher')
      .where('c.schoolId = :schoolId', { schoolId })
      .andWhere('c.isActive = true')
      .getMany();

    const results: any[] = [];
    for (const c of classes) {
      const count = await this.classesRepository.manager
        .createQueryBuilder()
        .select('COUNT(*)', 'total')
        .from('enrollment', 'e')
        .where('e.classId = :classId', { classId: c.id })
        .andWhere('e.year = :year', { year: currentYear })
        .andWhere('e.status = :status', { status: 'active' })
        .getRawOne();

      results.push({
        ...c,
        totalStudents: parseInt(count?.total || '0'),
      });
    }
    return results;
  }

  async findOneClass(id: number, schoolId: number): Promise<SchoolClass> {
    const schoolClass = await this.classesRepository.findOne({ where: { id, schoolId } });
    if (!schoolClass) throw new NotFoundException('Turma não encontrada');
    return schoolClass;
  }

  async createSubject(dto: CreateSubjectDto, schoolId: number): Promise<SchoolSubject> {
    const subject = this.SchoolSubjectsRepository.create({ ...dto, schoolId });
    return this.SchoolSubjectsRepository.save(subject);
  }

  async findByTeacher(teacherId: number, schoolId: number): Promise<SchoolClass[]> {
    return this.classesRepository
      .createQueryBuilder('class')
      .innerJoin('class.subjects', 'subject')
      .where('subject.teacherId = :teacherId', { teacherId })
      .andWhere('class.schoolId = :schoolId', { schoolId })
      .getMany();
  }

  async findSubjectsByClass(classId: number, schoolId: number): Promise<SchoolSubject[]> {
    const subjects = await this.SchoolSubjectsRepository.find({
      where: { classId, schoolId },
      relations: ['teacher'],
    });
    return subjects;
  }

  async removeSubject(classId: number, subjectId: number, schoolId: number): Promise<{ message: string }> {
    const subject = await this.SchoolSubjectsRepository.findOne({
      where: { id: subjectId, classId, schoolId },
    });
    if (!subject) throw new NotFoundException('Disciplina não encontrada.');
    await this.SchoolSubjectsRepository.remove(subject);
    return { message: 'Disciplina removida com sucesso.' };
  }
}