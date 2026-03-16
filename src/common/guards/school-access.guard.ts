import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { SchoolsService } from '../../schools/schools.service';

@Injectable()
export class SchoolAccessGuard implements CanActivate {
  constructor(private schoolsService: SchoolsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.schoolId) return false;

    const hasAccess = await this.schoolsService.hasAccess(user.schoolId);

    if (!hasAccess) {
      throw new HttpException(
        {
          statusCode: 402,
          message: 'Seu período de acesso expirou. Assine um plano para continuar.',
          error: 'Payment Required',
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    return true;
  }
}