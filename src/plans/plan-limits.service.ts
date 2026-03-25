import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { School } from '../schools/school.entity';
import { User, UserRole } from '../users/user.entity';
import { SchoolPlan, PLAN_LIMITS } from './plan-limits';

@Injectable()
export class PlanLimitsService {
  constructor(
    @InjectRepository(School)
    private schoolsRepository: Repository<School>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async canAddStudent(
    schoolId: number,
  ): Promise<{ allowed: boolean; current: number; limit: number }> {
    const school = await this.schoolsRepository.findOne({ where: { id: schoolId } });
    if (!school) throw new NotFoundException('Escola não encontrada.');

    const current = await this.usersRepository.count({
      where: { schoolId, role: UserRole.STUDENT, isActive: true },
    });

    const limit = PLAN_LIMITS[school.plan].maxStudents;
    const allowed = current < limit;

    return { allowed, current, limit };
  }

  async getMaxImagesPerPost(schoolId: number): Promise<number> {
    const school = await this.schoolsRepository.findOne({ where: { id: schoolId } });
    if (!school) throw new NotFoundException('Escola não encontrada.');
    return PLAN_LIMITS[school.plan].maxImagesPerPost;
  }

  getPlanDetails(plan: SchoolPlan) {
    return PLAN_LIMITS[plan];
  }

  async getUsageStats(schoolId: number): Promise<{
    students: { current: number; limit: number };
    images: { limitPerPost: number };
    plan: SchoolPlan;
    planStatus: string;
  }> {
    const school = await this.schoolsRepository.findOne({ where: { id: schoolId } });
    if (!school) throw new NotFoundException('Escola não encontrada.');

    const current = await this.usersRepository.count({
      where: { schoolId, role: UserRole.STUDENT, isActive: true },
    });

    const limits = PLAN_LIMITS[school.plan];

    return {
      students: { current, limit: limits.maxStudents },
      images: { limitPerPost: limits.maxImagesPerPost },
      plan: school.plan,
      planStatus: school.planStatus,
    };
  }
}
