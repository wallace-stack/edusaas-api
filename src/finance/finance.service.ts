import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Tuition, TuitionStatus } from './tuition.entity';
import { CashFlow, CashFlowType } from './cashflow.entity';
import { CreateTuitionDto, PayTuitionDto } from './dto/create-tuition.dto';
import { CreateCashFlowDto } from './dto/create-cashflow.dto';

@Injectable()
export class FinanceService {
  constructor(
    @InjectRepository(Tuition)
    private tuitionRepository: Repository<Tuition>,
    @InjectRepository(CashFlow)
    private cashFlowRepository: Repository<CashFlow>,
  ) {}

  // Cria mensalidade para um aluno
  async createTuition(dto: CreateTuitionDto, schoolId: number): Promise<Tuition> {
    const tuition = this.tuitionRepository.create({ ...dto, schoolId });
    return this.tuitionRepository.save(tuition);
  }

  // Cria mensalidades em massa para todos os alunos
  async createBulkTuitions(studentIds: number[], amount: number, dueDate: string, reference: string, schoolId: number): Promise<Tuition[]> {
    const tuitions = studentIds.map(studentId =>
      this.tuitionRepository.create({ studentId, amount, dueDate: new Date(dueDate), reference, schoolId }),
    );
    return this.tuitionRepository.save(tuitions);
  }

  // Registra pagamento de mensalidade
  async payTuition(id: number, dto: PayTuitionDto, schoolId: number): Promise<Tuition> {
    const tuition = await this.tuitionRepository.findOneOrFail({ where: { id, schoolId } });
    tuition.status = TuitionStatus.PAID;
    tuition.paymentMethod = dto.paymentMethod;
    tuition.paidDate = dto.paidDate ? new Date(dto.paidDate) : new Date();
    if (dto.notes) tuition.notes = dto.notes;
    return this.tuitionRepository.save(tuition);
  }

  // Lista mensalidades de um aluno
  async findTuitionsByStudent(studentId: number, schoolId: number): Promise<Tuition[]> {
    return this.tuitionRepository.find({
      where: { studentId, schoolId },
      order: { dueDate: 'DESC' },
    });
  }

  // Lista inadimplentes
  async findDefaulters(schoolId: number): Promise<any[]> {
    const overdue = await this.tuitionRepository.find({
      where: { schoolId, status: TuitionStatus.OVERDUE },
      relations: ['student'],
      order: { dueDate: 'ASC' },
    });
    const pending = await this.tuitionRepository.find({
      where: { schoolId, status: TuitionStatus.PENDING },
      relations: ['student'],
    });

    // Marca pendentes vencidos automaticamente
    const today = new Date();
    const overdueFromPending = pending.filter(t => new Date(t.dueDate) < today);
    for (const t of overdueFromPending) {
      t.status = TuitionStatus.OVERDUE;
      await this.tuitionRepository.save(t);
    }

    return [...overdue, ...overdueFromPending].map(t => ({
      id: t.id,
      student: t.student?.name,
      amount: Number(t.amount),
      dueDate: t.dueDate,
      reference: t.reference,
      daysOverdue: Math.floor((today.getTime() - new Date(t.dueDate).getTime()) / (1000 * 60 * 60 * 24)),
    }));
  }

  // Adiciona lançamento no fluxo de caixa
  async createCashFlow(dto: CreateCashFlowDto, schoolId: number, createdById: number): Promise<CashFlow> {
    const cashFlow = this.cashFlowRepository.create({ ...dto, schoolId, createdById });
    return this.cashFlowRepository.save(cashFlow);
  }

  // Relatório financeiro do diretor
  async getFinancialReport(schoolId: number, month: number, year: number): Promise<any> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const tuitions = await this.tuitionRepository.find({
      where: { schoolId },
    });

    const cashFlows = await this.cashFlowRepository.find({
      where: {
        schoolId,
        date: Between(startDate, endDate) as any,
      },
    });

    const totalRevenue = tuitions
      .filter(t => t.status === TuitionStatus.PAID)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalPending = tuitions
      .filter(t => t.status === TuitionStatus.PENDING)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalOverdue = tuitions
      .filter(t => t.status === TuitionStatus.OVERDUE)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalExpenses = cashFlows
      .filter(c => c.type === CashFlowType.EXPENSE)
      .reduce((sum, c) => sum + Number(c.amount), 0);

    const totalIncome = cashFlows
      .filter(c => c.type === CashFlowType.INCOME)
      .reduce((sum, c) => sum + Number(c.amount), 0);

    const defaultRate = tuitions.length > 0
      ? Math.round((tuitions.filter(t => t.status === TuitionStatus.OVERDUE).length / tuitions.length) * 100)
      : 0;

    return {
      period: `${month}/${year}`,
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalPending: Math.round(totalPending * 100) / 100,
        totalOverdue: Math.round(totalOverdue * 100) / 100,
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        totalIncome: Math.round(totalIncome * 100) / 100,
        balance: Math.round((totalRevenue + totalIncome - totalExpenses) * 100) / 100,
        defaultRate: `${defaultRate}%`,
      },
      cashFlows,
    };
  }
}