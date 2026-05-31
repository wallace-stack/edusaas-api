import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { User, UserRole } from '../users/user.entity';
import { Grade } from '../grades/grade.entity';
import { Attendance, AttendanceStatus } from '../attendance/attendance.entity';
import { Tuition, TuitionStatus } from '../finance/tuition.entity';
import { CashFlow, CashFlowType } from '../finance/cashflow.entity';
import { Notification } from '../notifications/notification.entity';
import { SchoolSubject } from '../classes/subject.entity';

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
    @InjectRepository(CashFlow)
    private cashFlowRepository: Repository<CashFlow>,
    @InjectRepository(Notification)
    private notificationsRepository: Repository<Notification>,
    @InjectRepository(SchoolSubject)
    private subjectRepository: Repository<SchoolSubject>,
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

    // Frequência irregular por aluno
    const studentAttendance: any = {};
    attendances.forEach(a => {
      if (!studentAttendance[a.studentId]) studentAttendance[a.studentId] = { total: 0, present: 0 };
      studentAttendance[a.studentId].total++;
      if (a.status === AttendanceStatus.PRESENT) studentAttendance[a.studentId].present++;
    });
    const irregularStudents = Object.values(studentAttendance)
      .filter((d: any) => d.total > 0 && (d.present / d.total) < 0.75).length;
    const regularStudents = totalStudents - irregularStudents;

    // Frequência por turma
    const classAttendanceRaw: any[] = await this.attendanceRepository.manager.query(
      `SELECT sc.name AS "className",
              COUNT(*) AS total,
              SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) AS present
       FROM attendance a
       JOIN school_class sc ON sc.id = a."classId"
       WHERE a."schoolId" = $1
       GROUP BY sc.name
       ORDER BY sc.name`,
      [schoolId],
    );

    const classAttendance = classAttendanceRaw.map(r => ({
      className: r.className,
      avgRate: r.total > 0 ? Math.round((Number(r.present) / Number(r.total)) * 100) : 0,
    }));

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
      attendance: {
        regularStudents,
        irregularStudents,
        avgRate: avgAttendance,
        classAttendance,
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

    let atRiskStudents = 0;
    let approvedStudents = 0;
    let recoveryStudents = 0;
    let failedStudents = 0;
    Object.values(studentGrades).forEach((values: any) => {
      const avg = values.reduce((a: number, b: number) => a + b, 0) / values.length;
      if (avg < 6) atRiskStudents++;
      if (avg >= 7) approvedStudents++;
      else if (avg >= 5) recoveryStudents++;
      else failedStudents++;
    });
    const noGradesStudents = students.length - Object.keys(studentGrades).length;

    // Alunos com frequência irregular (abaixo de 75%)
    const studentAttendance: any = {};
    attendances.forEach(a => {
      if (!studentAttendance[a.studentId]) studentAttendance[a.studentId] = { total: 0, present: 0 };
      studentAttendance[a.studentId].total++;
      if (a.status === AttendanceStatus.PRESENT) studentAttendance[a.studentId].present++;
    });

    const irregularAttendance = Object.values(studentAttendance)
      .filter((data: any) => (data.present / data.total) < 0.75).length;

    // Frequência por turma
    const classAttendanceRaw: any[] = await this.attendanceRepository.manager.query(
      `SELECT sc.name AS "className",
              COUNT(*) AS total,
              SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) AS present
       FROM attendance a
       JOIN school_class sc ON sc.id = a."classId"
       WHERE a."schoolId" = $1
       GROUP BY sc.name
       ORDER BY sc.name`,
      [schoolId],
    );

    const classAttendance = classAttendanceRaw.map(r => ({
      className: r.className,
      avgRate: r.total > 0 ? Math.round((Number(r.present) / Number(r.total)) * 100) : 0,
    }));

    return {
      totalStudents: students.length,
      atRiskStudents,
      irregularAttendance,
      classAttendance,
      academicSituation: {
        approved: approvedStudents,
        recovery: recoveryStudents,
        failed: failedStudents,
        noGrades: noGradesStudents,
      },
      alerts: {
        gradesAlert: atRiskStudents > 0 ? `${atRiskStudents} aluno(s) com média abaixo de 6` : null,
        attendanceAlert: irregularAttendance > 0 ? `${irregularAttendance} aluno(s) com frequência irregular` : null,
      },
    };
  }

  // Dashboard financeiro do diretor — dados reais do banco
  async getFinancialDashboard(schoolId: number): Promise<any> {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const monthNames = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

    // Alunos ativos com turma do ano atual
    const students: any[] = await this.usersRepository.manager.query(
      `SELECT u.id, u.name, COALESCE(sc.name, '—') AS "className"
       FROM "user" u
       LEFT JOIN enrollments e ON e."studentId" = u.id AND e.year = $2
       LEFT JOIN school_class sc ON sc.id = e."classId"
       WHERE u."schoolId" = $1 AND u.role = 'student' AND u."isActive" = true
       ORDER BY u.name`,
      [schoolId, currentYear],
    );

    // Todas as mensalidades da escola
    const allTuitions = await this.tuitionRepository.find({ where: { schoolId } });

    // Mensalidades do mês atual por aluno
    const currentMonthMap: Record<number, typeof allTuitions[0]> = {};
    allTuitions.forEach(t => {
      const d = new Date(t.dueDate);
      if (d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear) {
        currentMonthMap[t.studentId] = t;
      }
    });

    // Status real por aluno (mês atual)
    const studentsWithStatus = students.map(s => {
      const t = currentMonthMap[s.id];
      return {
        id: s.id,
        name: s.name,
        className: s.className,
        paymentStatus: t
          ? (t.status === TuitionStatus.PAID    ? 'Em dia'
           : t.status === TuitionStatus.OVERDUE ? 'Inadimplente'
           : 'Pendente')
          : 'Sem mensalidade',
        valor: t ? Number(t.amount) : 0,
      };
    });

    // Métricas do mês atual
    const currentMonthList = Object.values(currentMonthMap);
    const mensalidadeUnitaria = currentMonthList.length > 0
      ? Math.round(currentMonthList.reduce((s, t) => s + Number(t.amount), 0) / currentMonthList.length)
      : 0;
    const totalEsperado = Math.round(currentMonthList.reduce((s, t) => s + Number(t.amount), 0));

    // Métricas gerais (todas as mensalidades)
    const paidAll = allTuitions.filter(t => t.status === TuitionStatus.PAID);
    const overdueAll = allTuitions.filter(t => t.status === TuitionStatus.OVERDUE);
    const totalRecebido = Math.round(paidAll.reduce((s, t) => s + Number(t.amount), 0));
    const totalInadimplente = Math.round(overdueAll.reduce((s, t) => s + Number(t.amount), 0));

    const totalStudents = students.length;
    const adimplentes = studentsWithStatus.filter(s => s.paymentStatus === 'Em dia').length;
    const inadimplentes = studentsWithStatus.filter(s => s.paymentStatus === 'Inadimplente').length;
    const taxaAdimplencia = totalStudents > 0 ? Math.round((adimplentes / totalStudents) * 100) : 0;

    // Faturamento mensal — últimos 6 meses
    const faturamentoMensal: { mes: string; recebido: number; esperado: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - 1 - i, 1);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      const monthTuitions = allTuitions.filter(t => {
        const td = new Date(t.dueDate);
        return td.getMonth() + 1 === m && td.getFullYear() === y;
      });
      faturamentoMensal.push({
        mes: `${monthNames[m - 1]}/${String(y).slice(2)}`,
        recebido: Math.round(monthTuitions.filter(t => t.status === TuitionStatus.PAID).reduce((s, t) => s + Number(t.amount), 0)),
        esperado: Math.round(monthTuitions.reduce((s, t) => s + Number(t.amount), 0)),
      });
    }

    return {
      totalStudents,
      mensalidadeUnitaria,
      totalEsperado,
      totalRecebido,
      totalInadimplente,
      adimplentes,
      inadimplentes,
      taxaAdimplencia,
      faturamentoMensal,
      students: studentsWithStatus,
    };
  }

  // Dashboard do professor — suas turmas
  async getTeacherDashboard(teacherId: number, schoolId: number): Promise<any> {
    // Obter turmas do professor via disciplinas
    const subjects = await this.subjectRepository.find({
      where: { teacherId, schoolId },
      select: ['classId'],
    });

    const classIds = [...new Set(subjects.map(s => s.classId))];

    if (classIds.length === 0) {
      return {
        totalGrades: 0,
        avgGrade: 0,
        totalAttendance: 0,
        avgAttendance: '0%',
        classAttendance: [],
        subjectAvgGrades: [],
      };
    }

    const [grades, attendances, classAttendanceRaw, subjectGradesRaw] = await Promise.all([
      this.gradesRepository
        .createQueryBuilder('g')
        .where('g.schoolId = :schoolId', { schoolId })
        .andWhere('g.classId IN (:...classIds)', { classIds })
        .getMany(),
      this.attendanceRepository
        .createQueryBuilder('a')
        .where('a.schoolId = :schoolId', { schoolId })
        .andWhere('a.classId IN (:...classIds)', { classIds })
        .getMany(),
      this.attendanceRepository.manager.query(
        `SELECT sc.name AS "className",
                COUNT(*) AS total,
                SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) AS present
         FROM attendance a
         JOIN school_class sc ON sc.id = a."classId"
         WHERE a."schoolId" = $1 AND a."classId" = ANY($2::int[])
         GROUP BY sc.name ORDER BY sc.name`,
        [schoolId, classIds],
      ),
      this.gradesRepository.manager.query(
        `SELECT ss.name AS "subjectName",
                ROUND(AVG(g.value), 1) AS "avgGrade"
         FROM grade g
         JOIN subjects ss ON ss.id = g."subjectId"
         WHERE g."schoolId" = $1 AND ss."teacherId" = $2
         GROUP BY ss.name ORDER BY ss.name`,
        [schoolId, teacherId],
      ),
    ]);

    const avgGrade = grades.length > 0
      ? Math.round((grades.reduce((sum, g) => sum + Number(g.value), 0) / grades.length) * 100) / 100
      : 0;

    const presentCount = attendances.filter(a => a.status === AttendanceStatus.PRESENT).length;
    const avgAttendance = attendances.length > 0
      ? Math.round((presentCount / attendances.length) * 100)
      : 0;

    const classAttendance = classAttendanceRaw.map((r: any) => ({
      className: r.className,
      avgRate: r.total > 0 ? Math.round((Number(r.present) / Number(r.total)) * 100) : 0,
    }));

    const subjectAvgGrades = subjectGradesRaw.map((r: any) => ({
      subjectName: r.subjectName,
      avgGrade: Number(r.avgGrade ?? 0),
    }));

    return {
      totalGrades: grades.length,
      avgGrade,
      totalAttendance: attendances.length,
      avgAttendance: `${avgAttendance}%`,
      classAttendance,
      subjectAvgGrades,
    };
  }

  // CSV contabilidade — Nome, Turma, Valor, Status, Dt.Vencimento, Dt.Pagamento
  async exportContabilidadeCsv(schoolId: number, month: number, year: number): Promise<string> {
    const rows: any[] = await this.tuitionRepository.manager.query(
      `SELECT u.name AS "studentName",
              COALESCE(sc.name, '—') AS "className",
              t.amount, t.status, t."dueDate", t."paidDate"
       FROM tuition t
       JOIN "user" u ON u.id = t."studentId"
       LEFT JOIN enrollments e ON e."studentId" = t."studentId" AND e.year = $3
       LEFT JOIN school_class sc ON sc.id = e."classId"
       WHERE t."schoolId" = $1
         AND EXTRACT(MONTH FROM t."dueDate") = $2
         AND EXTRACT(YEAR FROM t."dueDate") = $3
       ORDER BY u.name`,
      [schoolId, month, year],
    );

    const statusLabel = (s: string) =>
      ({ paid: 'Pago', overdue: 'Atrasado', pending: 'Pendente', cancelled: 'Cancelado' }[s] ?? s);
    const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('pt-BR') : '';
    const fmtVal  = (v: any) => Number(v).toFixed(2).replace('.', ',');

    const header = 'Nome do Aluno;Turma;Valor;Status;Data Vencimento;Data Pagamento';
    const lines = rows.map(r =>
      [r.studentName, r.className, fmtVal(r.amount), statusLabel(r.status), fmtDate(r.dueDate), fmtDate(r.paidDate)].join(';')
    );
    return [header, ...lines].join('\n');
  }

  // CSV relatório completo — mensalidades + lançamentos de caixa do período
  async exportCompletoCsv(schoolId: number, month: number, year: number): Promise<string> {
    const startDate = new Date(year, month - 1, 1);
    const endDate   = new Date(year, month, 0);

    const [tuitions, cashFlows] = await Promise.all([
      this.tuitionRepository.manager.query(
        `SELECT u.name AS "studentName",
                COALESCE(sc.name, '—') AS "className",
                t.amount, t.status, t."dueDate", t."paidDate",
                t.reference, t."paymentMethod", t.notes
         FROM tuition t
         JOIN "user" u ON u.id = t."studentId"
         LEFT JOIN enrollments e ON e."studentId" = t."studentId" AND e.year = $3
         LEFT JOIN school_class sc ON sc.id = e."classId"
         WHERE t."schoolId" = $1
           AND EXTRACT(MONTH FROM t."dueDate") = $2
           AND EXTRACT(YEAR FROM t."dueDate") = $3
         ORDER BY t."dueDate", u.name`,
        [schoolId, month, year],
      ),
      this.cashFlowRepository.find({
        where: { schoolId, date: Between(startDate, endDate) as any },
        order: { date: 'ASC' },
      }),
    ]);

    const statusLabel   = (s: string) =>
      ({ paid: 'Pago', overdue: 'Atrasado', pending: 'Pendente', cancelled: 'Cancelado' }[s] ?? s);
    const paymentLabel  = (m: string) =>
      ({ pix: 'PIX', credit_card: 'Crédito', debit_card: 'Débito', cash: 'Dinheiro', bank_slip: 'Boleto', other: 'Outro', card: 'Cartão' }[m] ?? (m ?? ''));
    const typeLabel     = (t: string) => t === CashFlowType.INCOME ? 'Entrada' : 'Saída';
    const categoryLabel = (c: string) =>
      ({ tuition: 'Mensalidade', salary: 'Salário', maintenance: 'Manutenção', supplies: 'Material', other: 'Outros' }[c] ?? c);
    const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('pt-BR') : '';
    const fmtVal  = (v: any) => Number(v).toFixed(2).replace('.', ',');

    const header = 'Tipo;Descrição;Turma;Referência;Valor;Status;Forma de Pagamento;Data;Data Pagamento;Observações';

    const tuitionLines: string[] = (tuitions as any[]).map(r =>
      ['Mensalidade', r.studentName, r.className, r.reference ?? '', fmtVal(r.amount),
       statusLabel(r.status), paymentLabel(r.paymentMethod), fmtDate(r.dueDate), fmtDate(r.paidDate), r.notes ?? ''].join(';')
    );

    const cashFlowLines: string[] = cashFlows.map(c =>
      [`${typeLabel(c.type)} — ${categoryLabel(c.category)}`, c.description, '', c.reference ?? '',
       fmtVal(c.amount), '', '', fmtDate(c.date as any), '', ''].join(';')
    );

    return [header, ...tuitionLines, ...cashFlowLines].join('\n');
  }
}