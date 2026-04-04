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
  @Get('reset-director')
  async resetDirector(@Query('token') token: string) {
    if (token !== SEED_TOKEN) throw new ForbiddenException('Token inválido.');

    const bcrypt = await import('bcrypt');
    const newHash = await bcrypt.hash('Horizonte@2026', 10);

    // Atualiza TODOS os usuários com esse email, independente de schoolId
    const result = await this.dataSource.query(
      `UPDATE user SET password = ?, isActive = 1
       WHERE email = 'erikacarolinajunqueiradasilva@gmail.com'`,
      [newHash]
    );

    // Também apaga usuários duplicados, deixando só o mais recente
    const users = await this.dataSource.query(
      `SELECT id FROM user WHERE email = 'erikacarolinajunqueiradasilva@gmail.com' ORDER BY id DESC`
    );

    if (users.length > 1) {
      const [keep, ...duplicates] = users;
      const ids = duplicates.map((u: any) => u.id).join(',');
      await this.dataSource.query(`DELETE FROM user WHERE id IN (${ids})`);
    }

    const finalUser = await this.dataSource.query(
      `SELECT id, email, role, schoolId, isActive FROM user
       WHERE email = 'erikacarolinajunqueiradasilva@gmail.com' LIMIT 1`
    );

    return {
      success: true,
      affectedRows: result.affectedRows,
      user: finalUser[0],
      message: 'Senha redefinida para Horizonte@2026'
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

    const schools = await this.dataSource.query(`SELECT id, name FROM school`);

    // Mostra as colunas REAIS da tabela user
    const userColumns = await this.dataSource.query(
      `SELECT column_name, data_type
       FROM information_schema.columns
       WHERE table_schema = DATABASE() AND table_name = 'user'
       ORDER BY ordinal_position`
    );

    // Lista todos os usuários com schoolId para diagnóstico
    const users = await this.dataSource.query(
      `SELECT id, name, email, role, schoolId, isActive FROM user ORDER BY schoolId, id`
    ).catch(() =>
      this.dataSource.query(
        `SELECT id, name, email, role, school_id, isActive FROM user ORDER BY school_id, id`
      )
    );

    return { tables, schools, userColumns, users };
  }

  // TODO: remover antes do MVP
  @Get('purge-old-school')
  async purgeOldSchool(@Query('token') token: string) {
    if (token !== SEED_TOKEN) throw new ForbiddenException('Token inválido.');

    const schools = await this.dataSource.query(
      `SELECT id, name FROM school`
    );

    const horizonte = schools.find((s: any) => s.name === 'Colégio Horizonte');
    if (!horizonte) return { success: false, message: 'Colégio Horizonte não encontrado.' };

    const oldSchools = schools.filter((s: any) => s.id !== horizonte.id);
    if (!oldSchools.length) return { success: true, message: 'Banco já está limpo.' };

    const log: string[] = [];

    await this.dataSource.query(`SET FOREIGN_KEY_CHECKS = 0`);
    try {
      for (const school of oldSchools) {
        const sid = school.id;
        log.push(`Removendo "${school.name}" (ID ${sid})`);

        // Nomes exatos confirmados pelo db-info
        const tabelas = [
          'attendance',
          'grade',
          'enrollments',
          'feed_posts',
          'notification',
          'subjects',
          'school_class',
          'user',
        ];

        for (const tbl of tabelas) {
          try {
            // Tenta schoolId (camelCase) e school_id (snake_case)
            const r = await this.dataSource.query(
              `DELETE FROM \`${tbl}\` WHERE schoolId = ?`, [sid]
            ).catch(() =>
              this.dataSource.query(
                `DELETE FROM \`${tbl}\` WHERE school_id = ?`, [sid]
              )
            );
            log.push(`  ✅ ${tbl}: ${r.affectedRows ?? '?'} linhas removidas`);
          } catch (e: any) {
            log.push(`  ⚠️ ${tbl}: ${e.message}`);
          }
        }

        await this.dataSource.query(`DELETE FROM school WHERE id = ?`, [sid]);
        log.push(`✅ Escola ID ${sid} deletada`);
      }
    } finally {
      await this.dataSource.query(`SET FOREIGN_KEY_CHECKS = 1`);
    }

    return { success: true, removed: oldSchools.length, log };
  }
}
