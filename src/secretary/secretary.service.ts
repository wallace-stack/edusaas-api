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

    // Busca frequência e situação de cada aluno
    const attendanceRaw = await this.enrollmentRepository.manager.query(`
      SELECT
        a.studentId,
        ROUND(100.0 * SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) / COUNT(*), 0) as attendanceRate
      FROM attendance a
      WHERE a.schoolId = ?
      GROUP BY a.studentId
    `, [schoolId]);
    const attendanceMap = new Map<number, number>(
      attendanceRaw.map((r: any) => [Number(r.studentId), Number(r.attendanceRate)])
    );

    const gradesRaw = await this.enrollmentRepository.manager.query(`
      SELECT studentId, AVG(value) as avg
      FROM grade
      WHERE schoolId = ?
      GROUP BY studentId
    `, [schoolId]);
    const gradesMap = new Map<number, number>(
      gradesRaw.map((r: any) => [Number(r.studentId), Number(r.avg)])
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
      { paymentMethod: dto.paymentMethod, paidDate: dto.paidDate, notes: dto.notes },
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
