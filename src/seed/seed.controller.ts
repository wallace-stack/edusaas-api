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

    // Pega o ID do Colégio Horizonte
    const school = await this.dataSource.query(
      `SELECT id FROM school WHERE name = 'Colégio Horizonte' LIMIT 1`
    );
    if (!school.length) return { success: false, message: 'Escola não encontrada.' };
    const schoolId = school[0].id;

    // Deleta qualquer versão existente do email (duplicatas)
    await this.dataSource.query(
      `DELETE FROM "user" WHERE email = 'erikacarolinajunqueiradasilva@gmail.com'`
    );

    // Insere a diretora do zero (datetime('now') compatível com SQLite)
    await this.dataSource.query(
      `INSERT INTO "user" (name, email, password, role, "schoolId", "isActive", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, 'director', $4, true, NOW(), NOW())`,
      ['Érika Junqueira', 'erikacarolinajunqueiradasilva@gmail.com', newHash, schoolId]
    );

    const user = await this.dataSource.query(
      `SELECT id, email, role, "schoolId", "isActive" FROM "user"
       WHERE email = 'erikacarolinajunqueiradasilva@gmail.com' LIMIT 1`
    );

    return { success: true, user: user[0], message: 'Diretora criada com senha Horizonte@2026' };
  }

  // TODO: remover antes do MVP
  @Get('db-info')
  async dbInfo(@Query('token') token: string) {
    if (token !== SEED_TOKEN) throw new ForbiddenException('Token inválido.');

    // SQLite: lista tabelas via sqlite_master
    const tables = await this.dataSource.query(
      `SELECT name as table_name FROM sqlite_master WHERE type='table' ORDER BY name`
    );

    const schools = await this.dataSource.query(`SELECT id, name FROM school`);

    // SQLite: colunas reais via PRAGMA
    const userColumns = await this.dataSource.query(`PRAGMA table_info(user)`);

    // Lista todos os usuários para diagnóstico
    const users = await this.dataSource.query(
      `SELECT id, name, email, role, "schoolId", "isActive" FROM "user" ORDER BY "schoolId", id`
    ).catch(() =>
      this.dataSource.query(
        `SELECT id, name, email, role, "schoolId", "isActive" FROM "user" ORDER BY "schoolId", id`
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

    // SQLite não usa FOREIGN_KEY_CHECKS — deletar na ordem certa
    for (const school of oldSchools) {
      const sid = school.id;
      log.push(`Removendo "${school.name}" (ID ${sid})`);

      const tabelas = [
        'attendance',
        'grade',
        'enrollments',
        'feed_posts',
        'notification',
        'subjects',
        'school_class',
        'tuition',
        'cash_flow',
        'user',
      ];

      for (const tbl of tabelas) {
        try {
          const r = await this.dataSource.query(
            `DELETE FROM "${tbl}" WHERE schoolId = ?`, [sid]
          ).catch(() =>
            this.dataSource.query(
              `DELETE FROM "${tbl}" WHERE school_id = ?`, [sid]
            )
          );
          log.push(`  ✅ ${tbl}: ${r.changes ?? r.affectedRows ?? '?'} linhas removidas`);
        } catch (e: any) {
          log.push(`  ⚠️ ${tbl}: ${e.message}`);
        }
      }

      await this.dataSource.query(`DELETE FROM school WHERE id = ?`, [sid]);
      log.push(`✅ Escola ID ${sid} deletada`);
    }

    return { success: true, removed: oldSchools.length, log };
  }
}
