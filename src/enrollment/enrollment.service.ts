import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Enrollment, EnrollmentStatus } from './enrollment.entity';
import { User, UserRole } from '../users/user.entity';

@Injectable()
export class EnrollmentService {
  constructor(
    @InjectRepository(Enrollment)
    private enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async enroll(studentId: number, classId: number, schoolId: number, year?: number): Promise<Enrollment> {
    const currentYear = year || new Date().getFullYear();

    const student = await this.userRepository.findOne({ where: { id: studentId, schoolId } });
    if (!student) throw new NotFoundException('Aluno não encontrado nesta escola.');
    if (student.role !== UserRole.STUDENT) throw new ForbiddenException('Usuário não é um aluno.');

    const existing = await this.enrollmentRepository.findOne({
      where: { studentId, classId, year: currentYear },
    });
    if (existing) throw new BadRequestException('Aluno já matriculado nesta turma neste ano.');

    const enrollment = this.enrollmentRepository.create({
      studentId,
      classId,
      schoolId,
      year: currentYear,
      status: EnrollmentStatus.ACTIVE,
    });

    return this.enrollmentRepository.save(enrollment);
  }

  async getStudentClass(studentId: number, schoolId: number): Promise<Enrollment | null> {
    const currentYear = new Date().getFullYear();
    return this.enrollmentRepository.findOne({
      where: { studentId, schoolId, year: currentYear, status: EnrollmentStatus.ACTIVE },
      relations: ['schoolClass'],
    });
  }

  async getClassStudents(classId: number, schoolId: number): Promise<Enrollment[]> {
    const currentYear = new Date().getFullYear();
    return this.enrollmentRepository.find({
      where: { classId, schoolId, year: currentYear, status: EnrollmentStatus.ACTIVE },
      relations: ['student'],
      select: {
        id: true,
        student: { id: true, name: true },
      },
    });
  }

  async transferByStudent(studentId: number, newClassId: number, schoolId: number): Promise<Enrollment> {
    const currentYear = new Date().getFullYear();
    const current = await this.enrollmentRepository.findOne({
      where: { studentId, schoolId, year: currentYear, status: EnrollmentStatus.ACTIVE },
    });
    if (current) {
      current.status = EnrollmentStatus.TRANSFERRED;
      await this.enrollmentRepository.save(current);
    }
    return this.enroll(studentId, newClassId, schoolId);
  }

  async transfer(enrollmentId: number, newClassId: number): Promise<Enrollment> {
    const enrollment = await this.enrollmentRepository.findOne({ where: { id: enrollmentId } });
    if (!enrollment) throw new NotFoundException('Matrícula não encontrada.');
    if (enrollment.status !== EnrollmentStatus.ACTIVE) throw new BadRequestException('Matrícula não está ativa.');

    enrollment.status = EnrollmentStatus.TRANSFERRED;
    await this.enrollmentRepository.save(enrollment);

    const newEnrollment = this.enrollmentRepository.create({
      studentId: enrollment.studentId,
      classId: newClassId,
      schoolId: enrollment.schoolId,
      year: enrollment.year,
      status: EnrollmentStatus.ACTIVE,
    });

    return this.enrollmentRepository.save(newEnrollment);
  }

  async unenroll(enrollmentId: number): Promise<{ message: string }> {
    const enrollment = await this.enrollmentRepository.findOne({ where: { id: enrollmentId } });
    if (!enrollment) throw new NotFoundException('Matrícula não encontrada.');

    enrollment.status = EnrollmentStatus.CANCELLED;
    await this.enrollmentRepository.save(enrollment);
    return { message: 'Matrícula cancelada com sucesso.' };
  }
}
