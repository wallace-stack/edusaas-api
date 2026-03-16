import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../users/user.entity';
import { Grade } from '../grades/grade.entity';
import { Attendance, AttendanceStatus } from '../attendance/attendance.entity';
import { Tuition, TuitionStatus } from '../finance/tuition.entity';
import { Notification } from '../notifications/notification.entity';

@Injectable()
export class MetricsService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Grade)
    private gradesRepository: Repository<Grade>,
    @InjectRepository(Attendance)
    private attendanceRepository: Repository<Attendance>,
    @InjectRepository(Tuition)
    private tuitionRepository: Repository<Tuition>,
    @InjectRepository(Notification)
    private notificationsRepository: Repository<Notification>,
  ) {}

  // Dashboard do diretor — visão geral da escola
  async getDirectorDashboard(schoolId: number): Promise<any> {
    const [
      totalStudents,
      totalTeachers,
      totalCoordinators,
      tuitions,
      attendances,
      grades,
    ] = await Promise.all([
      this.usersRepository.count({ where: { schoolId, role: UserRole.STUDENT, isActive: true } }),
      this.usersRepository.count({ where: { schoolId, role: UserRole.TEACHER, isActive: true } }),
      this.usersRepository.count({ where: { schoolId, role: UserRole.COORDINATOR, isActive: true } }),
      this.tuitionRepository.find({ where: { schoolId } }),
      this.attendanceRepository.find({ where: { schoolId } }),
      this.gradesRepository.find({ where: { schoolId } }),
    ]);

    // Métricas financeiras
    const paidTuitions = tuitions.filter(t => t.status === TuitionStatus.PAID);
    const overdueTuitions = tuitions.filter(t => t.status === TuitionStatus.OVERDUE);
    const totalRevenue = paidTuitions.reduce((sum, t) => sum + Number(t.amount), 0);
    const defaultRate = tuitions.length > 0
      ? Math.round((overdueTuitions.length / tuitions.length) * 100)
      : 0;

    // Métricas acadêmicas
    const avgGrade = grades.length > 0
      ? Math.round((grades.reduce((sum, g) => sum + Number(g.value), 0) / grades.length) * 100) / 100
      : 0;

    // Métricas de frequência
    const presentCount = attendances.filter(a => a.status === AttendanceStatus.PRESENT).length;
    const avgAttendance = attendances.length > 0
      ? Math.round((presentCount / attendances.length) * 100)
      : 0;

    return {
      people: {
        totalStudents,
        totalTeachers,
        totalCoordinators,
      },
      academic: {
        avgGrade,
        totalGrades: grades.length,
        avgAttendance: `${avgAttendance}%`,
        totalAttendanceRecords: attendances.length,
      },
      financial: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalPaidTuitions: paidTuitions.length,
        totalOverdueTuitions: overdueTuitions.length,
        defaultRate: `${defaultRate}%`,
      },
    };
  }

  // Dashboard do coordenador — foco em turmas
  async getCoordinatorDashboard(schoolId: number): Promise<any> {
    const [students, grades, attendances] = await Promise.all([
      this.usersRepository.find({ where: { schoolId, role: UserRole.STUDENT, isActive: true } }),
      this.gradesRepository.find({ where: { schoolId } }),
      this.attendanceRepository.find({ where: { schoolId } }),
    ]);

    // Alunos em risco (média abaixo de 6)
    const studentGrades: any = {};
    grades.forEach(g => {
      if (!studentGrades[g.studentId]) studentGrades[g.studentId] = [];
      studentGrades[g.studentId].push(Number(g.value));
    });

    const atRiskStudents = Object.entries(studentGrades)
      .filter(([_, values]: any) => {
        const avg = values.reduce((a: number, b: number) => a + b, 0) / values.length;
        return avg < 6;
      }).length;

    // Alunos com frequência irregular (abaixo de 75%)
    const studentAttendance: any = {};
    attendances.forEach(a => {
      if (!studentAttendance[a.studentId]) studentAttendance[a.studentId] = { total: 0, present: 0 };
      studentAttendance[a.studentId].total++;
      if (a.status === AttendanceStatus.PRESENT) studentAttendance[a.studentId].present++;
    });

    const irregularAttendance = Object.values(studentAttendance)
      .filter((data: any) => (data.present / data.total) < 0.75).length;

    return {
      totalStudents: students.length,
      atRiskStudents,
      irregularAttendance,
      alerts: {
        gradesAlert: atRiskStudents > 0 ? `${atRiskStudents} aluno(s) com média abaixo de 6` : null,
        attendanceAlert: irregularAttendance > 0 ? `${irregularAttendance} aluno(s) com frequência irregular` : null,
      },
    };
  }

  // Dashboard do professor — suas turmas
  async getTeacherDashboard(teacherId: number, schoolId: number): Promise<any> {
    const [grades, attendances] = await Promise.all([
      this.gradesRepository.find({ where: { schoolId } }),
      this.attendanceRepository.find({ where: { schoolId } }),
    ]);

    const avgGrade = grades.length > 0
      ? Math.round((grades.reduce((sum, g) => sum + Number(g.value), 0) / grades.length) * 100) / 100
      : 0;

    const presentCount = attendances.filter(a => a.status === AttendanceStatus.PRESENT).length;
    const avgAttendance = attendances.length > 0
      ? Math.round((presentCount / attendances.length) * 100)
      : 0;

    return {
      totalGradesLaunched: grades.length,
      avgGrade,
      totalAttendanceRecords: attendances.length,
      avgAttendance: `${avgAttendance}%`,
    };
  }
}