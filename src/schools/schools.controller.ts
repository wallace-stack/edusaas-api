import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SchoolsService } from './schools.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/user.entity';

@Controller('schools')
export class SchoolsController {
  constructor(private readonly schoolsService: SchoolsService) {}

  @Post('cancel')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.DIRECTOR)
  async cancelPlan(
    @CurrentUser() user: any,
    @Body() body: { reason?: string },
  ) {
    return this.schoolsService.cancelPlan(user.schoolId, body.reason);
  }
}
