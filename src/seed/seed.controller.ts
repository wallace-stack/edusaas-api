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
  @Get('db-info')
  async dbInfo(@Query('token') token: string) {
    if (token !== SEED_TOKEN) throw new ForbiddenException('Token inválido.');

    const tables = await this.dataSource.query(
      `SELECT table_name, table_rows
       FROM information_schema.tables
       WHERE table_schema = DATABASE()
       ORDER BY table_name`
    );

    const schools = await this.dataSource.query(`SELECT id, name FROM school`).catch(() =>
      this.dataSource.query(`SELECT id, name FROM schools`).catch(() => [])
    );

    return { tables, schools };
  }

  // TODO: remover antes do MVP
  @Get('purge-old-school')
  async purgeOldSchool(@Query('token') token: string) {
    if (token !== SEED_TOKEN) throw new ForbiddenException('Token inválido.');

    // Descobre tabela de escolas
    const schoolRows = await this.dataSource.query(`SELECT id, name FROM school`)
      .catch(() => this.dataSource.query(`SELECT id, name FROM schools`).catch(() => []));

    const horizonte = schoolRows.find((s: any) => s.name === 'Colégio Horizonte');
    if (!horizonte) return { success: false, message: 'Colégio Horizonte não encontrado. Rode /seed/demo primeiro.' };

    const horizonteId = horizonte.id;
    const oldSchools = schoolRows.filter((s: any) => s.id !== horizonteId);
    if (!oldSchools.length) return { success: true, message: 'Banco já está limpo.' };

    const log: string[] = [];

    // Desabilita FK checks para deletar sem se preocupar com ordem
    await this.dataSource.query(`SET FOREIGN_KEY_CHECKS = 0`);

    try {
      for (const school of oldSchools) {
        const sid = school.id;
        log.push(`Removendo escola "${school.name}" ID ${sid}`);

        const tableList = await this.dataSource.query(
          `SELECT table_name FROM information_schema.columns
           WHERE table_schema = DATABASE() AND column_name = 'schoolId'`
        );

        for (const { table_name } of tableList) {
          const result = await this.dataSource.query(
            `DELETE FROM \`${table_name}\` WHERE schoolId = ?`, [sid]
          );
          log.push(`  ${table_name}: ${result.affectedRows} linhas removidas`);
        }

        // Deleta a escola
        const schoolTable = await this.dataSource.query(
          `SELECT table_name FROM information_schema.tables
           WHERE table_schema = DATABASE() AND table_name IN ('school','schools') LIMIT 1`
        );
        await this.dataSource.query(
          `DELETE FROM \`${schoolTable[0].table_name}\` WHERE id = ?`, [sid]
        );
        log.push(`Escola ID ${sid} deletada.`);
      }
    } finally {
      await this.dataSource.query(`SET FOREIGN_KEY_CHECKS = 1`);
    }

    return { success: true, removed: oldSchools.length, log };
  }
}
