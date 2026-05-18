import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InfantilService } from './infantil.service';
import { InfantilController } from './infantil.controller';
import { InfantilRecord } from './infantil-record.entity';
import { DiarioBordo } from './diario-bordo.entity';
import { PlanejamentoDiario } from './planejamento-diario.entity';

@Module({
  imports: [TypeOrmModule.forFeature([InfantilRecord, DiarioBordo, PlanejamentoDiario])],
  controllers: [InfantilController],
  providers: [InfantilService],
})
export class InfantilModule {}
