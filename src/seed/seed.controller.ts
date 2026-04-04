// TODO: remover antes do MVP
import { Controller, Get, Query, ForbiddenException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { runDemoSeed } from '../database/seeds/demo.seed';

const SEED_TOKEN = 'seed-horizonte-2026';

// TODO: remover antes do MVP
@Controller('seed')
export class SeedController {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  // TODO: remover antes do MVP
  @Get('sync')
  async syncSchema(@Query('token') token: string) {
    if (token !== SEED_TOKEN) {
      throw new ForbiddenException('Token inválido.');
    }
    console.log('Sincronizando schema do banco...');
    await this.dataSource.synchronize(false);
    console.log('✅ Schema sincronizado!');
    return { success: true, message: 'Schema sincronizado com sucesso.' };
  }

  // TODO: remover antes do MVP
  @Get('demo')
  async runDemo(@Query('token') token: string) {
    if (token !== SEED_TOKEN) {
      throw new ForbiddenException('Token inválido.');
    }

    // Sincronizar tabelas faltantes antes do seed
    console.log('Sincronizando schema do banco...');
    await this.dataSource.synchronize(false);
    console.log('✅ Schema OK');

    await runDemoSeed(this.dataSource);

    return {
      success: true,
      message: 'Demo seed executado com sucesso. Veja os logs do servidor para detalhes.',
    };
  }

  // TODO: remover antes do MVP
  @Get('purge-old-school')
  async purgeOldSchool(@Query('token') token: string) {
    if (token !== SEED_TOKEN) {
      throw new ForbiddenException('Token inválido.');
    }

    const results: string[] = [];

    const horizonte = await this.dataSource.query(
      `SELECT id FROM school WHERE name = 'Colégio Horizonte' LIMIT 1`,
    );

    if (horizonte.length === 0) {
      return { success: false, message: 'Colégio Horizonte não encontrado. Rode /seed/demo primeiro.' };
    }

    const horizonteId = horizonte[0].id;
    results.push(`Preservando escola ID ${horizonteId} (Colégio Horizonte)`);

    const oldSchools = await this.dataSource.query(
      `SELECT id, name FROM school WHERE id != ?`, [horizonteId],
    );

    if (oldSchools.length === 0) {
      return { success: true, message: 'Nenhuma escola antiga encontrada. Banco já está limpo.' };
    }

    for (const school of oldSchools) {
      const sid = school.id;
      results.push(`Removendo escola "${school.name}" (ID ${sid})...`);

      await this.dataSource.query(`DELETE FROM attendance WHERE schoolId = ?`, [sid]);
      await this.dataSource.query(`DELETE FROM grade WHERE schoolId = ?`, [sid]);
      await this.dataSource.query(`DELETE FROM enrollments WHERE schoolId = ?`, [sid]);
      await this.dataSource.query(`DELETE FROM tuition WHERE schoolId = ?`, [sid]);
      await this.dataSource.query(`DELETE FROM cash_flow WHERE schoolId = ?`, [sid]);
      await this.dataSource.query(`DELETE FROM feed_posts WHERE schoolId = ?`, [sid]);
      await this.dataSource.query(`DELETE FROM notification WHERE schoolId = ?`, [sid]);
      await this.dataSource.query(`DELETE FROM subjects WHERE schoolId = ?`, [sid]);
      await this.dataSource.query(`DELETE FROM school_class WHERE schoolId = ?`, [sid]);
      await this.dataSource.query(`DELETE FROM user WHERE schoolId = ?`, [sid]);
      await this.dataSource.query(`DELETE FROM school WHERE id = ?`, [sid]);

      results.push(`✅ Escola ID ${sid} removida com todos os dados.`);
    }

    return { success: true, removed: oldSchools.length, log: results };
  }
}
