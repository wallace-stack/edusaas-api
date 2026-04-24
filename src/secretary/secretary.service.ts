import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../users/user.entity';
import { SchoolClass } from '../classes/class.entity';
import { Tuition, TuitionStatus } from '../finance/tuition.entity';
import { Enrollment, EnrollmentStatus } from '../enrollment/enrollment.entity';
import { UsersService } from '../users/users.service';
import { FinanceService } from '../finance/finance.service';
import { ClassesService } from '../classes/classes.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { SecretaryCreateTuitionDto, SecretaryPayTuitionDto } from './dto/create-tuition.dto';
import { CreateClassDto } from '../classes/dto/create-class.dto';
import { PlanLimitsService } from '../plans/plan-limits.service';
import { EnrollmentService } from '../enrollment/enrollment.service';
import { MailService } from '../mail/mail.service';

/**
 * Sanitiza campos de texto vindos do CSV.
 * Remove prefixos de fórmula Excel (=, +) que podem ser perigosos.
 * ⚠️ NÃO usar em campos de e-mail — o @ é válido em e-mails.
 * Campos seguros: nome, telefone, cpf, endereço, responsável.
 */
function sanitizeCsvField(value?: string): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  // Prefixos de fórmula Excel/Sheets — perigosos em células abertas no Excel
  if (['=', '+', '\t', '\r'].some(c => trimmed.startsWith(c))) {
    return trimmed.replace(/^[=+\t\r]+/, '').trim() || undefined;
  }
  return trimmed || undefined;
}

@Injectable()
export class SecretaryService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(SchoolClass)
    private classesRepository: Repository<SchoolClass>,
    @InjectRepository(Tuition)
    private tuitionRepository: Repository<Tuition>,
    @InjectRepository(Enrollment)
    private enrollmentRepository: Repository<Enrollment>,
    private usersService: UsersService,
    private classesService: ClassesService,
    private financeService: FinanceService,
    private planLimitsService: PlanLimitsService,
    private enrollmentService: EnrollmentService,
    private mailService: MailService,
  ) {}

  // Dashboard da secretária — visão operacional
  async getDashboard(schoolId: number): Promise<any> {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalStudents, totalClasses, totalDefaulters, enrollmentsThisMonth] =
      await Promise.all([
        this.usersRepository.count({
          where: { schoolId, role: UserRole.STUDENT, isActive: true },
        }),
        this.classesRepository.count({
          where: { schoolId, isActive: true },
        }),
        this.tuitionRepository.count({
          where: { schoolId, status: TuitionStatus.OVERDUE },
        }),
        this.usersRepository
          .createQueryBuilder('user')
          .where('user.schoolId = :schoolId', { schoolId })
          .andWhere('user.role = :role', { role: UserRole.STUDENT })
          .andWhere('user.createdAt >= :start', { start: firstDayOfMonth })
          .getCount(),
      ]);

    return {
      totalStudents,
      totalClasses,
      totalDefaulters,
      enrollmentsThisMonth,
    };
  }

  // Lista todos os alunos com status financeiro e turma atual
  async listStudents(schoolId: number): Promise<any[]> {
    const currentYear = new Date().getFullYear();

    const [students, enrollments] = await Promise.all([
      this.usersRepository.find({
        where: { schoolId, role: UserRole.STUDENT, isActive: true },
        order: { name: 'ASC' },
      }),
      this.enrollmentRepository.find({
        where: { schoolId, year: currentYear, status: EnrollmentStatus.ACTIVE },
        relations: ['schoolClass'],
      }),
    ]);

    const enrollmentMap = new Map(enrollments.map(e => [e.studentId, e]));

    const overdueList = await this.tuitionRepository
      .createQueryBuilder('t')
      .select('t.studentId', 'studentId')
      .addSelect('COUNT(*)', 'overdueCount')
      .where('t.schoolId = :schoolId', { schoolId })
      .andWhere('t.status = :status', { status: TuitionStatus.OVERDUE })
      .groupBy('t.studentId')
      .getRawMany();

    const overdueMap = new Map<number, number>(
      overdueList.map(r => [Number(r.studentId), Number(r.overdueCount)]),
    );

    // Frequência por aluno — média ponderada de presenças
    const attendanceRaw: any[] = await this.enrollmentRepository.manager.query(`
      SELECT
        "studentId",
        ROUND(100.0 * SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) / COUNT(*), 0) AS "attendanceRate"
      FROM attendance
      WHERE "schoolId" = $1
      GROUP BY "studentId"
    `, [schoolId]);
    const attendanceMap = new Map<number, number>(
      attendanceRaw.map(r => [Number(r.studentId), Number(r.attendanceRate)])
    );

    // Média de notas por aluno — média ponderada (value * weight / sum_weight)
    const gradesRaw: any[] = await this.enrollmentRepository.manager.query(`
      SELECT
        "studentId",
        ROUND(SUM(value * weight) / NULLIF(SUM(weight), 0), 2) AS "avgGrade"
      FROM grade
      WHERE "schoolId" = $1
      GROUP BY "studentId"
    `, [schoolId]);
    const gradesMap = new Map<number, number>(
      gradesRaw.map(r => [Number(r.studentId), Number(r.avgGrade ?? r.avggrade)])
    );

    return students.map(s => {
      const enrollment = enrollmentMap.get(s.id);
      const attendanceRate = attendanceMap.get(s.id) ?? null;
      const avgGrade = gradesMap.get(s.id) ?? null;

      let situation: string | null = null;
      if (avgGrade !== null) {
        if (avgGrade >= 7) situation = 'APPROVED';
        else if (avgGrade >= 5) situation = 'RECOVERY';
        else situation = 'FAILED';
      }

      return {
        id: s.id,
        name: s.name,
        email: s.email,
        phone: s.phone,
        isActive: s.isActive,
        createdAt: s.createdAt,
        address: s.address,
        city: s.city,
        state: s.state,
        zipCode: s.zipCode,
        addressNumber: s.addressNumber,
        complement: s.complement,
        guardianName: s.guardianName,
        guardianPhone: s.guardianPhone,
        guardianRelation: s.guardianRelation,
        class: enrollment?.schoolClass
          ? { id: enrollment.schoolClass.id, name: enrollment.schoolClass.name }
          : null,
        classId: enrollment?.classId ?? null,
        attendanceRate,
        situation,
        financialStatus: overdueMap.has(s.id) ? 'overdue' : 'ok',
        overdueCount: overdueMap.get(s.id) ?? 0,
      };
    });
  }

  // Matricula novo aluno
  async enrollStudent(dto: CreateEnrollmentDto, schoolId: number): Promise<any> {
    const { allowed, current, limit } = await this.planLimitsService.canAddStudent(schoolId);
    if (!allowed) {
      throw new ForbiddenException(
        `Limite de alunos do plano atingido (${current}/${limit}).`,
      );
    }

    // Gera senha automática segura
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$';
    const randomPassword = Array.from({ length: 10 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join('');
    const password = 'Ed' + randomPassword + '1@';

    const user = await this.usersService.create({
      name: dto.name,
      email: dto.email,
      password,
      phone: dto.phone,
      address: dto.address,
      city: dto.city,
      state: dto.state,
      zipCode: dto.zipCode,
      addressNumber: dto.addressNumber,
      complement: dto.complement,
      guardianName: dto.guardianName,
      guardianPhone: dto.guardianPhone,
      guardianRelation: dto.guardianRelation,
      role: UserRole.STUDENT,
      schoolId,
    });

    if (dto.classId) {
      await this.enrollmentService.enroll(user.id, dto.classId, schoolId);
    }

    await this.mailService.sendMail({
      to: dto.email,
      subject: `${dto.name}, suas credenciais de acesso ao EduSaaS`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <div style="background: #1E3A5F; padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">EduSaaS</h1>
            <p style="color: #a0b4c8; margin: 5px 0 0;">Gestão Escolar Inteligente</p>
          </div>
          <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
            <h2 style="color: #1E3A5F;">Olá, ${dto.name}! 👋</h2>
            <p>Sua matrícula foi realizada com sucesso. Aqui estão suas credenciais de acesso:</p>
            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="margin: 0 0 10px;"><strong>📧 Email:</strong> ${dto.email}</p>
              <p style="margin: 0;"><strong>🔑 Senha temporária:</strong> <code style="background: #f1f5f9; padding: 2px 8px; border-radius: 4px;">${password}</code></p>
            </div>
            <div style="text-align: center; margin: 25px 0;">
              <a href="https://edusaas-web-xi.vercel.app/login"
                 style="background: #1E3A5F; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                Acessar o Sistema
              </a>
            </div>
            <p style="color: #64748b; font-size: 13px;">
              ⚠️ Por segurança, recomendamos alterar sua senha após o primeiro acesso.
            </p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
            <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
              Este email foi enviado automaticamente pelo sistema EduSaaS.<br>
              Em caso de dúvidas, entre em contato com a secretaria da sua escola.
            </p>
          </div>
        </body>
        </html>
      `,
    });

    const { password: _, ...safe } = user as any;
    return { ...safe, message: 'Aluno matriculado. Credenciais enviadas por email.' };
  }

  // Lista turmas
  async listClasses(schoolId: number): Promise<SchoolClass[]> {
    return this.classesService.findAllClasses(schoolId);
  }

  // Cria turma
  async createClass(dto: CreateClassDto, schoolId: number): Promise<SchoolClass> {
    return this.classesService.createClass(dto, schoolId);
  }

  // Edita turma — valida que pertence à escola
  async updateClass(id: number, data: Partial<CreateClassDto>, schoolId: number): Promise<SchoolClass> {
    const schoolClass = await this.classesRepository.findOne({ where: { id, schoolId } });
    if (!schoolClass) throw new NotFoundException('Turma não encontrada.');
    Object.assign(schoolClass, data);
    return this.classesRepository.save(schoolClass);
  }

  // Relatório financeiro completo
  async getFinancialReport(schoolId: number, month?: number, year?: number): Promise<any> {
    const m = month || new Date().getMonth() + 1;
    const y = year || new Date().getFullYear();
    return this.financeService.getFinancialReport(schoolId, m, y);
  }

  // Lista mensalidades pendentes/vencidas com nome do aluno
  async getPendingTuitions(schoolId: number): Promise<any[]> {
    return this.enrollmentRepository.manager.query(`
      SELECT
        t.id,
        t.amount,
        t.status,
        t."dueDate",
        t."paidDate",
        t."paymentMethod",
        t."paymentNotes",
        t.reference,
        u.name as "studentName",
        u.email as "studentEmail"
      FROM tuition t
      JOIN "user" u ON u.id = t."studentId"
      WHERE t."schoolId" = $1
        AND t.status IN ('pending', 'overdue')
      ORDER BY t.status DESC, t."dueDate" ASC
    `, [schoolId]);
  }

  // Resumo financeiro com dados para gráficos
  async getFinancialSummary(schoolId: number, month: number, year: number): Promise<any> {
    const rows = await this.enrollmentRepository.manager.query(`
      SELECT
        COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as "totalReceived",
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as "totalPending",
        COALESCE(SUM(CASE WHEN status = 'overdue' THEN amount ELSE 0 END), 0) as "totalOverdue",
        COALESCE(SUM(amount), 0) as "totalExpected"
      FROM tuition
      WHERE "schoolId" = $1
        AND EXTRACT(MONTH FROM "dueDate") = $2
        AND EXTRACT(YEAR FROM "dueDate") = $3
    `, [schoolId, month, year]);

    const r = rows[0];
    const totalExpected = Number(r.totalExpected);
    const totalReceived = Number(r.totalReceived);
    const totalPending = Number(r.totalPending);
    const totalOverdue = Number(r.totalOverdue);
    const inadimplencia = totalExpected > 0
      ? Math.round((totalOverdue / totalExpected) * 100)
      : 0;

    const methodRows = await this.enrollmentRepository.manager.query(`
      SELECT
        COALESCE("paymentMethod", 'other') as method,
        SUM(amount) as total
      FROM tuition
      WHERE "schoolId" = $1
        AND status = 'paid'
        AND EXTRACT(MONTH FROM "dueDate") = $2
        AND EXTRACT(YEAR FROM "dueDate") = $3
      GROUP BY "paymentMethod"
    `, [schoolId, month, year]);

    const methodChart: Record<string, number> = { pix: 0, credit_card: 0, debit_card: 0, cash: 0, bank_slip: 0, other: 0 };
    for (const row of methodRows) {
      const key = row.method as string;
      if (key in methodChart) methodChart[key] = Number(row.total);
      else methodChart.other += Number(row.total);
    }

    const monthlyRows = await this.enrollmentRepository.manager.query(`
      SELECT
        TO_CHAR("dueDate", 'Mon/YY') as month,
        EXTRACT(YEAR FROM "dueDate") * 100 + EXTRACT(MONTH FROM "dueDate") as sort_key,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as received,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending,
        COALESCE(SUM(CASE WHEN status = 'overdue' THEN amount ELSE 0 END), 0) as overdue
      FROM tuition
      WHERE "schoolId" = $1
        AND "dueDate" >= NOW() AT TIME ZONE 'UTC' - INTERVAL '6 months'
      GROUP BY 1, 2
      ORDER BY 2 ASC
    `, [schoolId]);

    return {
      totalReceived,
      totalPending,
      totalOverdue,
      inadimplencia,
      statusChart: { received: totalReceived, pending: totalPending, overdue: totalOverdue },
      paymentMethodChart: methodChart,
      monthlyChart: monthlyRows.map((row: any) => ({
        month: row.month,
        received: Number(row.received),
        pending: Number(row.pending),
        overdue: Number(row.overdue),
      })),
    };
  }

  // Lista todas as mensalidades com filtros
  async getAllTuitions(schoolId: number, filters: { month: number; year: number; status: string; search: string }): Promise<any[]> {
    const { month, year, status, search } = filters;
    const statusFilter = status === 'all' ? `AND t.status IN ('paid','pending','overdue')` : `AND t.status = '${status}'`;
    const searchFilter = search ? `AND LOWER(u.name) LIKE LOWER('%${search.replace(/'/g, '')}%')` : '';

    return this.enrollmentRepository.manager.query(`
      SELECT
        t.id,
        t.amount,
        t.status,
        t."dueDate",
        t."paidDate",
        t."paymentMethod",
        t."paymentNotes",
        t.reference,
        u.name as "studentName",
        u.email as "studentEmail"
      FROM tuition t
      JOIN "user" u ON u.id = t."studentId"
      WHERE t."schoolId" = $1
        AND EXTRACT(MONTH FROM t."dueDate") = $2
        AND EXTRACT(YEAR FROM t."dueDate") = $3
        ${statusFilter}
        ${searchFilter}
      ORDER BY t.status DESC, t."dueDate" ASC
    `, [schoolId, month, year]);
  }

  // Exporta relatório fiscal em CSV
  async exportFiscalCsv(
    schoolId: number,
    month: number | null,
    year: number | null,
  ): Promise<string> {
    const params: any[] = [schoolId];
    let monthFilter = '';
    if (month && year) {
      monthFilter = ` AND EXTRACT(MONTH FROM t."dueDate") = $2
                     AND EXTRACT(YEAR  FROM t."dueDate") = $3`;
      params.push(month, year);
    }

    const rows = await this.enrollmentRepository.manager.query(`
      SELECT
        t.reference        AS "Referência",
        u.name             AS "Aluno",
        t.amount           AS "Valor",
        t."paidDate"       AS "Data Pagamento",
        t."paymentMethod"  AS "Forma Pagamento",
        t.status           AS "Status",
        t."dueDate"        AS "Vencimento"
      FROM tuition t
      JOIN "user" u ON u.id = t."studentId"
      WHERE t."schoolId" = $1
        ${monthFilter}
      ORDER BY t."dueDate" DESC, u.name ASC
    `, params);

    const PAYMENT_MAP: Record<string, string> = {
      pix: 'PIX',
      credit_card: 'Cartão de Crédito',
      debit_card: 'Cartão de Débito',
      cash: 'Dinheiro',
      bank_slip: 'Boleto',
      other: 'Outro',
    };

    const STATUS_MAP: Record<string, string> = {
      paid: 'Paga',
      pending: 'Pendente',
      overdue: 'Em atraso',
    };

    const fmt = (d: any) =>
      d ? new Date(d).toLocaleDateString('pt-BR') : '-';

    const brl = (v: any) =>
      Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const esc = (v: any) => `"${String(v ?? '-').replace(/"/g, '""')}"`;

    const header = 'Referência,Aluno,Valor,Data Pagamento,Forma Pagamento,Status,Vencimento';

    const lines = rows.map((r: any) =>
      [
        esc(r['Referência']),
        esc(r['Aluno']),
        esc(brl(r['Valor'])),
        esc(fmt(r['Data Pagamento'])),
        esc(PAYMENT_MAP[r['Forma Pagamento']] ?? r['Forma Pagamento'] ?? '-'),
        esc(STATUS_MAP[r['Status']] ?? r['Status'] ?? '-'),
        esc(fmt(r['Vencimento'])),
      ].join(',')
    );

    return [header, ...lines].join('\n');
  }

  // Notifica inadimplentes por e-mail
  async notifyOverdue(schoolId: number): Promise<{ sent: number; errors: number }> {
    const tuitions = await this.tuitionRepository.find({
      where: { schoolId, status: TuitionStatus.OVERDUE },
      relations: ['student'],
    });

    let sent = 0;
    let errors = 0;

    for (const t of tuitions) {
      const student = t.student;
      if (!student?.email) { errors++; continue; }
      try {
        await this.mailService.sendMail({
          to: student.email,
          subject: 'Aviso de mensalidade em atraso',
          html: `
            <p>Olá, <strong>${student.name}</strong>!</p>
            <p>Identificamos que sua mensalidade referente a <strong>${t.reference || 'período não informado'}</strong>
            no valor de <strong>R$ ${Number(t.amount).toFixed(2).replace('.', ',')}</strong> está em atraso.</p>
            <p>Por favor, entre em contato com a secretaria para regularizar sua situação.</p>
          `,
        });
        sent++;
      } catch {
        errors++;
      }
    }

    return { sent, errors };
  }

  // Lança mensalidade
  async createTuition(dto: SecretaryCreateTuitionDto, schoolId: number): Promise<Tuition> {
    return this.financeService.createTuition(
      { amount: dto.amount, dueDate: dto.dueDate, studentId: dto.studentId, reference: dto.reference, notes: dto.notes },
      schoolId,
    );
  }

  // Registra pagamento
  async payTuition(dto: SecretaryPayTuitionDto, schoolId: number): Promise<Tuition> {
    return this.financeService.payTuition(
      dto.tuitionId,
      { paymentMethod: dto.paymentMethod, paidDate: dto.paidDate, notes: dto.notes, paymentNotes: dto.paymentNotes },
      schoolId,
    );
  }

  // Lista apenas professores
  async getTeachers(schoolId: number): Promise<any[]> {
    return this.usersRepository.find({
      where: { schoolId, role: UserRole.TEACHER, isActive: true },
      select: ['id', 'name', 'email'],
      order: { name: 'ASC' },
    });
  }

  // Lista professores e coordenadores
  async listStaff(schoolId: number): Promise<any[]> {
    const staff = await this.usersRepository.find({
      where: [
        { schoolId, role: UserRole.TEACHER, isActive: true },
        { schoolId, role: UserRole.COORDINATOR, isActive: true },
        { schoolId, role: UserRole.SECRETARY, isActive: true },
      ],
      order: { name: 'ASC' },
    });

    return staff.map(({ password: _, resetToken: __, resetTokenExpiry: ___, ...safe }) => safe);
  }

  // Cria funcionário — impede criar DIRECTOR
  async createStaff(
    dto: { name: string; email: string; password: string; role: UserRole; phone?: string },
    schoolId: number,
  ): Promise<any> {
    if (dto.role === UserRole.DIRECTOR) {
      throw new ForbiddenException('Secretária não pode criar usuário com papel de Diretor.');
    }

    const user = await this.usersService.create({ ...dto, schoolId });
    const { password: _, ...safe } = user as any;
    return safe;
  }

  // Importação em lote de alunos via CSV
  async importStudents(
    rows: Array<{
      name: string;
      email: string;
      className: string;
      phone?: string;
      document?: string;
      birthDate?: string;
      guardianName?: string;
      guardianPhone?: string;
      zipCode?: string;
      address?: string;
      addressNumber?: string;
      city?: string;
      state?: string;
      password?: string;
    }>,
    schoolId: number,
  ): Promise<{ total: number; success: number; errors: Array<{ linha: number; email: string; erro: string }> }> {
    const errors: Array<{ linha: number; email: string; erro: string }> = [];
    let success = 0;

    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$';
    const genPassword = () => 'Ed' + Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('') + '1@';

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const linha = i + 2; // linha 1 = cabeçalho, dados começam na 2

      // Validações básicas
      if (!row.name?.trim()) {
        errors.push({ linha, email: row.email ?? '', erro: 'Nome obrigatório' });
        continue;
      }
      if (!row.email?.trim()) {
        errors.push({ linha, email: '', erro: 'E-mail obrigatório' });
        continue;
      }
      if (!row.className?.trim()) {
        errors.push({ linha, email: row.email, erro: 'Turma obrigatória' });
        continue;
      }

      // Busca turma por nome
      const turma = await this.classesRepository.findOne({
        where: { name: row.className.trim(), schoolId },
      });
      if (!turma) {
        errors.push({ linha, email: row.email, erro: `Turma "${row.className}" não encontrada` });
        continue;
      }

      // Verifica limite do plano (conta os que já foram importados com sucesso)
      const { allowed, current, limit } = await this.planLimitsService.canAddStudent(schoolId);
      if (!allowed) {
        errors.push({ linha, email: row.email, erro: `Limite do plano atingido (${current}/${limit})` });
        continue;
      }

      try {
        // Verifica se e-mail já existe — faz upsert silencioso
        const existing = await this.usersRepository.findOne({
          where: { email: row.email.trim().toLowerCase(), schoolId },
        });

        let studentUser: User;
        let isNew = false;
        let tempPassword = '';

        if (existing) {
          studentUser = existing;
        } else {
          isNew = true;
          tempPassword = row.password?.trim() || genPassword();
          studentUser = await this.usersService.create({
            name: sanitizeCsvField(row.name) ?? row.name.trim(),
            email: row.email.trim().toLowerCase(),
            password: tempPassword,
            phone: sanitizeCsvField(row.phone),
            document: sanitizeCsvField(row.document),
            birthDate: (() => {
              if (!row.birthDate?.trim()) return undefined;
              const d = new Date(row.birthDate.trim());
              return isNaN(d.getTime()) ? undefined : d;
            })(),
            guardianName: sanitizeCsvField(row.guardianName),
            guardianPhone: sanitizeCsvField(row.guardianPhone),
            zipCode: sanitizeCsvField(row.zipCode),
            address: sanitizeCsvField(row.address),
            addressNumber: sanitizeCsvField(row.addressNumber),
            city: sanitizeCsvField(row.city),
            state: sanitizeCsvField(row.state),
            role: UserRole.STUDENT,
            schoolId,
          });
        }

        // Matrícula — ignora se já matriculado na turma
        const jaMatriculado = await this.enrollmentRepository.findOne({
          where: { studentId: studentUser.id, classId: turma.id },
        });
        if (!jaMatriculado) {
          await this.enrollmentService.enroll(studentUser.id, turma.id, schoolId);
        }

        if (isNew) {
          try {
            await this.mailService.sendMail({
              to: studentUser.email,
              subject: `${studentUser.name}, suas credenciais de acesso`,
              html: `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333"><div style="background:#1E3A5F;padding:20px;border-radius:12px 12px 0 0;text-align:center"><h1 style="color:white;margin:0;font-size:24px">EduSaaS</h1><p style="color:#a0b4c8;margin:5px 0 0">Gestao Escolar Inteligente</p></div><div style="background:#f8fafc;padding:30px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px"><h2 style="color:#1E3A5F">Ola, ${studentUser.name}!</h2><p>Sua matricula foi realizada com sucesso. Aqui estao suas credenciais:</p><div style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin:20px 0"><p style="margin:0 0 10px"><strong>Email:</strong> ${studentUser.email}</p><p style="margin:0"><strong>Senha temporaria:</strong> <code style="background:#f1f5f9;padding:2px 8px;border-radius:4px">${tempPassword}</code></p></div><div style="text-align:center;margin:25px 0"><a href="https://edusaas-web-xi.vercel.app/login" style="background:#1E3A5F;color:white;padding:12px 30px;border-radius:8px;text-decoration:none;font-weight:bold">Acessar o Sistema</a></div><p style="color:#64748b;font-size:13px">Por seguranca, recomendamos alterar sua senha apos o primeiro acesso.</p></div></body></html>`,
            });
          } catch (mailErr) {
            console.error(`Email nao enviado para ${studentUser.email}:`, mailErr);
          }
        }

        success++;
      } catch (e: any) {
        const msg = e?.message?.includes('duplicate') || e?.code === '23505'
          ? 'E-mail já cadastrado em outra escola'
          : (e?.message ?? 'Erro inesperado');
        errors.push({ linha, email: row.email, erro: msg });
      }
    }

    return { total: rows.length, success, errors };
  }

  // Lista alunos de uma turma com dados pessoais completos
  async getStudentsByClass(classId: number, schoolId: number): Promise<any[]> {
    return this.enrollmentRepository.manager.query(
      `SELECT
        u.id, u.name, u.email, u.phone, u.document,
        u."birthDate", u.address, u."addressNumber",
        u.city, u.state, u."zipCode",
        u."guardianName", u."guardianPhone", u."guardianRelation",
        u."isActive"
       FROM "enrollments" e
       JOIN "user" u ON u.id = e."studentId"
       WHERE e."classId" = $1 AND u."schoolId" = $2
       ORDER BY u.name`,
      [classId, schoolId],
    );
  }

  async exportStudentsCSV(schoolId: number): Promise<string> {
    const students = await this.listStudents(schoolId);

    const header = [
      'nome','email','turma','telefone','cpf',
      'data_nascimento','responsavel','telefone_responsavel',
      'relacao_responsavel','endereco','numero','complemento',
      'cidade','estado','cep','status_financeiro'
    ].join(',');

    const escape = (val: any) => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"` : str;
    };

    const rows = students.map(s => [
      escape(s.name),
      escape(s.email),
      escape(s.class?.name ?? ''),
      escape(s.phone ?? ''),
      escape((s as any).document ?? ''),
      escape((s as any).birthDate ? new Date((s as any).birthDate).toLocaleDateString('pt-BR') : ''),
      escape(s.guardianName ?? ''),
      escape(s.guardianPhone ?? ''),
      escape(s.guardianRelation ?? ''),
      escape(s.address ?? ''),
      escape(s.addressNumber ?? ''),
      escape(s.complement ?? ''),
      escape(s.city ?? ''),
      escape(s.state ?? ''),
      escape(s.zipCode ?? ''),
      escape(s.financialStatus === 'overdue' ? 'Inadimplente' : 'Em dia'),
    ].join(','));

    return '\uFEFF' + [header, ...rows].join('\n');
  }

  // Desativa usuário — impede desativar diretor
  async deactivateUser(id: number, schoolId: number): Promise<{ message: string }> {
    const user = await this.usersRepository.findOne({ where: { id, schoolId } });
    if (!user) throw new NotFoundException('Usuário não encontrado.');
    if (user.role === UserRole.DIRECTOR) {
      throw new ForbiddenException('Secretária não pode desativar o Diretor.');
    }
    await this.usersService.remove(id, schoolId);
    return { message: 'Usuário desativado com sucesso.' };
  }
}
