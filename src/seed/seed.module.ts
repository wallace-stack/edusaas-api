// TODO: remover antes do MVP
import { Module } from '@nestjs/common';
import { SeedController } from './seed.controller';

// TODO: remover antes do MVP
@Module({
  controllers: [SeedController],
})
export class SeedModule {}
