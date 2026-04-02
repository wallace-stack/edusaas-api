import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { User, UserRole } from './user.entity';
import { SchoolSubject } from '../classes/subject.entity';
import { Enrollment, EnrollmentStatus } from '../enrollment/enrollment.entity';
import { GradesService } from '../grades/grades.service';
import { AttendanceService } from '../attendance/attendance.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(SchoolSubject)
    private subjectsRepository: Repository<SchoolSubject>,
    @InjectRepository(Enrollment)
    private enrollmentRepository: Repository<Enrollment>,
    private gradesService: GradesService,
    private attendanceService: AttendanceService,
  ) { }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email }, relations: ['school'] });
  }

  async findOne(id: number, schoolId: number): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id, schoolId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return user;
  }

  async findBySchool(schoolId: number, role?: UserRole): Promise<User[] | any[]> {
    if (role === UserRole.TEACHER) {
      return this.findTeachersWithSubjects(schoolId);
    }
    if (role === UserRole.STUDENT) {
      return this.findStudentsWithDetails(schoolId);
    }
    const where: any = { schoolId, isActive: true };
    if (role) where.role = role;
    return this.usersRepository.find({ where });
  }

  async findTeachersWithSubjects(schoolId: number): Promise<any[]> {
    const teachers = await this.usersRepository.find({
      where: { schoolId, role: UserRole.TEACHER, isActive: true },
    });

    const subjects = await this.subjectsRepository.find({
      where: { schoolId },
      relations: ['schoolClass'],
    });

    return teachers.map(teacher => ({
      id: teacher.id,
      name: teacher.name,
      email: teacher.email,
      phone: teacher.phone,
      subjects: subjects
        .filter(s => s.teacherId === teacher.id)
        .map(s => ({
          subjectName: s.name,
          className: s.schoolClass?.name ?? null,
        })),
    }));
  }

  async findStudentsWithDetails(schoolId: number): Promise<any[]> {
    const students = await this.usersRepository.find({
      where: { schoolId, role: UserRole.STUDENT, isActive: true },
    });

    const currentYear = new Date().getFullYear();
    const enrollments = await this.enrollmentRepository.find({
      where: { schoolId, year: currentYear, status: EnrollmentStatus.ACTIVE },
      relations: ['schoolClass'],
    });

    const enrollmentMap = new Map(enrollments.map(e => [e.studentId, e]));

    const results: any[] = [];
    for (const student of students) {
      const enrollment = enrollmentMap.get(student.id);
      const { gradeAverage, attendanceRate } = await this.computeStudentStats(student.id, schoolId);

      let situation: string;
      if (gradeAverage === null) situation = 'NO_GRADES';
      else if (gradeAverage >= 6) situation = 'APPROVED';
      else if (gradeAverage >= 5) situation = 'RECOVERY';
      else situation = 'FAILED';

      results.push({
        id: student.id,
        name: student.name,
        email: student.email,
        phone: student.phone,
        classId: enrollment?.classId ?? null,
        className: enrollment?.schoolClass?.name ?? null,
        gradeAverage,
        attendanceRate,
        situation,
      });
    }
    return results;
  }

  async getProfileDetail(id: number, schoolId: number): Promise<any> {
    const user = await this.usersRepository.findOne({
      where: { id, schoolId },
      relations: ['school'],
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    const currentYear = new Date().getFullYear();
    const activeEnrollment = await this.enrollmentRepository.findOne({
      where: { studentId: id, schoolId, year: currentYear, status: EnrollmentStatus.ACTIVE },
      relations: ['schoolClass'],
    });

    const { gradeAverage, attendanceRate } = await this.computeStudentStats(id, schoolId);

    // Notas agrupadas por disciplina
    const grades = await this.gradesService.findByStudent(id, schoolId);
    const bySubject: Record<number, { name: string; grades: typeof grades }> = {};
    grades.forEach(g => {
      const sid = g.subjectId;
      if (!bySubject[sid]) bySubject[sid] = { name: g.subject?.name ?? 'Disciplina', grades: [] };
      bySubject[sid].grades.push(g);
    });

    const gradesBySubject = Object.values(bySubject).map(({ name, grades: sg }) => {
      const byPeriod: Record<number, typeof sg> = {};
      sg.forEach(g => {
        if (!byPeriod[g.period]) byPeriod[g.period] = [];
        byPeriod[g.period].push(g);
      });
      const periods = Object.entries(byPeriod).map(([p, pg]) => ({
        period: Number(p),
        average: this.gradesService.calculatePeriodAverage(pg) ?? 0,
      })).sort((a, b) => a.period - b.period);

      const periodAvgs = periods.map(p => p.average);
      const finalAverage = periodAvgs.length
        ? Math.round((periodAvgs.reduce((a, b) => a + b, 0) / periodAvgs.length) * 100) / 100
        : null;

      return { subjectName: name, periods, finalAverage };
    });

    let situation: string;
    if (gradeAverage === null) situation = 'NO_GRADES';
    else if (gradeAverage >= 6) situation = 'APPROVED';
    else if (gradeAverage >= 5) situation = 'RECOVERY';
    else situation = 'FAILED';

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      class: activeEnrollment?.schoolClass
        ? { id: activeEnrollment.schoolClass.id, name: activeEnrollment.schoolClass.name, year: activeEnrollment.schoolClass.year }
        : null,
      gradeAverage,
      attendanceRate,
      situation,
      gradesBySubject,
    };
  }

  private async computeStudentStats(studentId: number, schoolId: number): Promise<{ gradeAverage: number | null; attendanceRate: number | null }> {
    const grades = await this.gradesService.findByStudent(studentId, schoolId);
    let gradeAverage: number | null = null;
    if (grades.length > 0) {
      // Agrupar por disciplina, calcular média por disciplina, depois média geral
      const bySubject: Record<number, typeof grades> = {};
      grades.forEach(g => {
        if (!bySubject[g.subjectId]) bySubject[g.subjectId] = [];
        bySubject[g.subjectId].push(g);
      });
      const subjectAverages: number[] = [];
      for (const subjectGrades of Object.values(bySubject)) {
        const byPeriod: Record<number, typeof grades> = {};
        subjectGrades.forEach(g => {
          if (!byPeriod[g.period]) byPeriod[g.period] = [];
          byPeriod[g.period].push(g);
        });
        const periodAvgs: number[] = [];
        for (const pg of Object.values(byPeriod)) {
          const avg = this.gradesService.calculatePeriodAverage(pg);
          if (avg !== null) periodAvgs.push(avg);
        }
        if (periodAvgs.length) {
          subjectAverages.push(Math.round((periodAvgs.reduce((a, b) => a + b, 0) / periodAvgs.length) * 100) / 100);
        }
      }
      if (subjectAverages.length) {
        gradeAverage = Math.round((subjectAverages.reduce((a, b) => a + b, 0) / subjectAverages.length) * 100) / 100;
      }
    }

    const attendanceData = await this.attendanceService.findByStudent(studentId, schoolId);
    const attendanceRate = attendanceData.summary.total > 0
      ? attendanceData.summary.percentage
      : null;

    return { gradeAverage, attendanceRate };
  }

  async create(data: Partial<User>): Promise<User> {
    try {
      const hashedPassword = await bcrypt.hash(data.password!, 10);
      const user = this.usersRepository.create({ ...data, password: hashedPassword });
      return await this.usersRepository.save(user);
    } catch (error: any) {
      if (error.code === 'ER_DUP_ENTRY') throw new ConflictException('E-mail já cadastrado.');
      throw error;
    }
  }

  async createWithRunner(data: Partial<User>, queryRunner: QueryRunner): Promise<User> {
    const hashedPassword = await bcrypt.hash(data.password!, 10);
    const user = queryRunner.manager.create(User, { ...data, password: hashedPassword });
    return await queryRunner.manager.save(User, user);
  }

  async setResetToken(userId: number, token: string, expiry: Date): Promise<void> {
    await this.usersRepository.update(userId, {
      resetToken: token,
      resetTokenExpiry: expiry,
    });
  }

  async findByResetToken(token: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { resetToken: token },
    });
  }

  async updatePassword(userId: number, newPassword: string): Promise<void> {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.usersRepository.update(userId, {
      password: hashedPassword,
      resetToken: null as any,
      resetTokenExpiry: null as any,
    });
  }

  async remove(id: number, schoolId: number, requestingUserId?: number): Promise<void> {
    const user = await this.findOne(id, schoolId);

    if (user.role === UserRole.DIRECTOR && user.id === requestingUserId) {
      throw new ForbiddenException('O diretor não pode excluir a si mesmo.');
    }

    user.isActive = false;
    await this.usersRepository.save(user);
  }

  async update(id: number, schoolId: number, data: Partial<{
    name: string;
    phone: string;
    document: string;
    birthDate: Date;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    addressNumber: string;
    complement: string;
    guardianName: string;
    guardianPhone: string;
    guardianRelation: string;
  }>): Promise<User> {
    const user = await this.findOne(id, schoolId);
    Object.assign(user, data);
    return this.usersRepository.save(user);
  }
}
