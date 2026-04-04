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

    // Descobrir tabelas reais via information_schema
    const dbName = await this.dataSource.query(`SELECT DATABASE() AS db`);
    const currentDb = dbName[0].db;
    const tableRows: { TABLE_NAME: string }[] = await this.dataSource.query(
      `SELECT TABLE_NAME FROM information_schema.tables WHERE TABLE_SCHEMA = ?`,
      [currentDb],
    );
    const tableNames = tableRows.map(r => r.TABLE_NAME.toLowerCase());
    results.push(`Tabelas encontradas: ${tableNames.join(', ')}`);

    // Detectar nome real da tabela de escolas
    const schoolTable = tableNames.includes('school') ? 'school' : tableNames.includes('schools') ? 'schools' : null;
    if (!schoolTable) {
      return { success: false, message: 'Tabela de escolas não encontrada no banco.' };
    }

    const horizonte = await this.dataSource.query(
      `SELECT id FROM \`${schoolTable}\` WHERE name = 'Colégio Horizonte' LIMIT 1`,
    );

    if (horizonte.length === 0) {
      return { success: false, message: 'Colégio Horizonte não encontrado. Rode /seed/demo primeiro.' };
    }

    const horizonteId = horizonte[0].id;
    results.push(`Preservando escola ID ${horizonteId} (Colégio Horizonte)`);

    const oldSchools = await this.dataSource.query(
      `SELECT id, name FROM \`${schoolTable}\` WHERE id != ?`, [horizonteId],
    );

    if (oldSchools.length === 0) {
      return { success: true, message: 'Nenhuma escola antiga encontrada. Banco já está limpo.' };
    }

    // Mapeamento de possíveis nomes de tabela para cada entidade
    const tableCandidates: Record<string, string[]> = {
      attendance: ['attendance'],
      grade: ['grade', 'grades'],
      enrollments: ['enrollments', 'enrollment'],
      tuition: ['tuition'],
      cash_flow: ['cash_flow'],
      feed_posts: ['feed_posts', 'feed_post'],
      notification: ['notification', 'notifications'],
      subjects: ['subjects', 'school_subject'],
      school_class: ['school_class', 'school_classes'],
      user: ['user', 'users'],
    };

    const resolveTable = (candidates: string[]): string | null => {
      for (const c of candidates) {
        if (tableNames.includes(c)) return c;
      }
      return null;
    };

    for (const school of oldSchools) {
      const sid = school.id;
      results.push(`Removendo escola "${school.name}" (ID ${sid})...`);

      for (const [key, candidates] of Object.entries(tableCandidates)) {
        const tbl = resolveTable(candidates);
        if (tbl) {
          await this.dataSource.query(`DELETE FROM \`${tbl}\` WHERE schoolId = ?`, [sid]);
          results.push(`  Deletado de ${tbl}`);
        } else {
          results.push(`  Tabela não encontrada para: ${key} (candidatos: ${candidates.join(', ')})`);
        }
      }

      await this.dataSource.query(`DELETE FROM \`${schoolTable}\` WHERE id = ?`, [sid]);
      results.push(`✅ Escola ID ${sid} removida com todos os dados.`);
    }

    return { success: true, removed: oldSchools.length, log: results };
  }
}
