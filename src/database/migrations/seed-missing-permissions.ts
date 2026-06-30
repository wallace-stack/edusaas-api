/**
 * Seed retroativo de permissões granulares.
 *
 * Problema: usuários criados antes do sistema de permissões não têm linhas
 * em user_permission e dependem do DEFAULT_PERMISSIONS em runtime.
 * Este script cria as linhas faltantes explicitamente, sem sobrescrever nada.
 *
 * Regras:
 *  - DIRECTOR é pulado (guard trata DIRECTOR como always-true; linhas seriam estado morto).
 *  - Para cada (userId, permissionKey): INSERT apenas se NÃO existir. Nunca UPDATE.
 *  - granted = DEFAULT_PERMISSIONS[role][key]. Se undefined → ABORTAR com erro explícito.
 *  - updatedBy = null (marca origem = seed automático).
 *  - Tudo em UMA transação. Qualquer erro → rollback total.
 *  - Dry-run: conta sem inserir. Ativar via env DRY_RUN=1 ou flag --dry-run.
 *
 * Como rodar:
 *   npm run db:seed-perms:dry    ← dry-run (valida números sem gravar)
 *   npm run db:seed-perms        ← executa o INSERT real
 */
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
dotenv.config();

import { DEFAULT_PERMISSIONS, PermissionKey } from '../../permissions/user-permission.entity';

const ALL_KEYS = Object.values(PermissionKey);
const SKIP_ROLES = ['director'];

// Suporta tanto DRY_RUN=1 (env var, compatível com PowerShell) quanto --dry-run (argv)
const isDryRun =
  process.env.DRY_RUN === '1' ||
  process.argv.includes('--dry-run') ||
  process.argv.some((a) => a.includes('dry-run'));

const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  extra: { family: 4 },
});

async function seed() {
  console.log(`\n🔗 Conectando ao banco...`);
  await dataSource.initialize();
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.startTransaction();

  try {
    // ─── 1. Carregar todos os usuários (exceto DIRECTOR) ─────────────────────
    const users: { id: number; role: string; schoolId: number }[] =
      await queryRunner.query(
        `SELECT id, role, "schoolId" FROM "user"
         WHERE role NOT IN (${SKIP_ROLES.map((_, i) => `$${i + 1}`).join(', ')})
         ORDER BY role, id`,
        SKIP_ROLES,
      );

    console.log(`\n📋 ${users.length} usuários encontrados (DIRECTOR pulado).`);

    // ─── 2. Buscar linhas já existentes ───────────────────────────────────────
    const existing: { userId: number; permissionKey: string }[] =
      await queryRunner.query(
        `SELECT "userId", "permissionKey" FROM user_permission`,
      );

    const existingSet = new Set(
      existing.map((r) => `${r.userId}:${r.permissionKey}`),
    );

    console.log(`📦 ${existingSet.size} linhas já existentes em user_permission.`);

    // ─── 3. Calcular o que precisa ser inserido ────────────────────────────────
    type Row = { userId: number; permissionKey: PermissionKey; granted: boolean; schoolId: number };
    const toInsert: Row[] = [];
    const countByRole: Record<string, { insert: number; skip: number }> = {};

    for (const user of users) {
      const roleDefaults = DEFAULT_PERMISSIONS[user.role];
      if (!countByRole[user.role]) countByRole[user.role] = { insert: 0, skip: 0 };

      for (const key of ALL_KEYS) {
        // Validação de segurança — aborta se o default for undefined
        if (roleDefaults === undefined || roleDefaults[key] === undefined) {
          throw new Error(
            `❌ DEFAULT_PERMISSIONS undefined para role="${user.role}" key="${key}". ` +
            `Corrija o enum antes de continuar.`,
          );
        }

        if (existingSet.has(`${user.id}:${key}`)) {
          countByRole[user.role].skip++;
        } else {
          toInsert.push({ userId: user.id, permissionKey: key, granted: roleDefaults[key], schoolId: user.schoolId });
          countByRole[user.role].insert++;
        }
      }
    }

    // ─── 4. Dry-run: reportar e sair sem commitar ─────────────────────────────
    if (isDryRun) {
      console.log('\n🧪 MODO DRY-RUN — nenhuma linha será inserida.\n');
      let total = 0;
      for (const [role, counts] of Object.entries(countByRole)) {
        console.log(
          `  [${role.padEnd(12)}]  ${String(counts.insert).padStart(4)} linhas seriam criadas  |  ${String(counts.skip).padStart(4)} já existiam`,
        );
        total += counts.insert;
      }
      console.log(`\n  ${'TOTAL'.padEnd(12)}   ${String(total).padStart(4)} linhas seriam criadas`);
      await queryRunner.rollbackTransaction();
      console.log('\n✅ Dry-run concluído. Rollback aplicado (nenhuma alteração no banco).\n');
      return;
    }

    // ─── 5. Execução real: INSERT em lotes de 100 ────────────────────────────
    console.log(`\n🚀 Inserindo ${toInsert.length} linhas em lotes de 100...`);

    const BATCH = 100;
    for (let i = 0; i < toInsert.length; i += BATCH) {
      const batch = toInsert.slice(i, i + BATCH);

      // Cada linha: (userId, schoolId, permissionKey, granted, updatedBy)
      const values: (number | string | boolean | null)[] = [];
      const placeholders = batch.map((row, idx) => {
        const base = idx * 5;
        values.push(row.userId, row.schoolId, row.permissionKey, row.granted, null);
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`;
      });

      await queryRunner.query(
        `INSERT INTO user_permission ("userId", "schoolId", "permissionKey", granted, "updatedBy")
         VALUES ${placeholders.join(', ')}
         ON CONFLICT ("userId", "permissionKey") DO NOTHING`,
        values,
      );

      process.stdout.write(`  ${Math.min(i + BATCH, toInsert.length)}/${toInsert.length}\r`);
    }

    await queryRunner.commitTransaction();

    // ─── 6. Resumo final ──────────────────────────────────────────────────────
    console.log('\n\n📊 Resumo por role:\n');
    let totalInserted = 0;
    let totalSkipped = 0;
    for (const [role, counts] of Object.entries(countByRole)) {
      console.log(
        `  [${role.padEnd(12)}]  ${String(counts.insert).padStart(4)} criadas  |  ${String(counts.skip).padStart(4)} skipped`,
      );
      totalInserted += counts.insert;
      totalSkipped += counts.skip;
    }
    console.log(`\n  ${'TOTAL'.padEnd(12)}   ${String(totalInserted).padStart(4)} criadas  |  ${String(totalSkipped).padStart(4)} skipped`);
    console.log('\n✅ Seed concluído com sucesso!\n');

  } catch (error) {
    await queryRunner.rollbackTransaction();
    console.error('\n❌ ERRO — rollback aplicado:', error);
    process.exit(1);
  } finally {
    await queryRunner.release();
    await dataSource.destroy();
  }
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
