import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchoolsService } from './schools.service';
import { School } from './school.entity';

@Module({
  imports: [TypeOrmModule.forFeature([School])],
  providers: [SchoolsService],
  exports: [SchoolsService],
})
export class SchoolsModule {}