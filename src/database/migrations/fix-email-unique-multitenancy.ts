/**
 * Migration: fix-email-unique-multitenancy
 *
 * Problema: a constraint UNIQUE(email) em "user" é global, impedindo que o
 * mesmo e-mail exista em escolas diferentes (multi-tenancy quebrado).
 *
 * O que faz:
 *  1. Verifica duplicatas (email, schoolId) — aborta se encontrar
 *  2. Remove a constraint UNIQUE(email) gerada pelo TypeORM
 *  3. Cria UNIQUE(email, "schoolId") com nome fixo reconhecido pela entity
 *
 * Como rodar:
 *   npm run db:migrate
 *
 * IMPORTANTE: rode ANTES de reiniciar a API com as mudanças na entity.
 */
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
dotenv.config();

const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  extra: { family: 4 },
});

async function migrate() {
  console.log('🔗 Conectando ao banco...');
  await dataSource.initialize();
  const queryRunner = dataSource.createQueryRunner();

  try {
    // ─── 1. Verificar duplicatas (email, schoolId) ────────────────────────────
    console.log('\n🔍 Verificando duplicatas (email, schoolId)...');
    const duplicates: { email: string; schoolId: number; count: string }[] =
      await queryRunner.query(`
        SELECT email, "schoolId", COUNT(*) AS count
        FROM "user"
        GROUP BY email, "schoolId"
        HAVING COUNT(*) > 1
      `);

    if (duplicates.length > 0) {
      console.error('\n❌ DUPLICATAS ENCONTRADAS — migration ABORTADA:');
      console.table(duplicates);
      console.error('\nCorrija os dados manualmente antes de prosseguir.');
      process.exit(1);
    }
    console.log('✅ Nenhuma duplicata encontrada.');

    // ─── 2. Localizar constraints UNIQUE que envolvem apenas "email" ──────────
    console.log('\n🔍 Buscando constraints UNIQUE existentes na coluna email...');
    const emailOnlyConstraints: { constraint_name: string }[] =
      await queryRunner.query(`
        SELECT tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema   = kcu.table_schema
        WHERE tc.constraint_type = 'UNIQUE'
          AND tc.table_name      = 'user'
          AND tc.table_schema    = 'public'
          AND kcu.column_name    = 'email'
          -- garante que a constraint seja SOMENTE no email (não composta)
          AND tc.constraint_name NOT IN (
            SELECT constraint_name
            FROM information_schema.key_column_usage
            WHERE table_name   = 'user'
              AND table_schema = 'public'
              AND column_name  = 'schoolId'
          )
      `);

    if (emailOnlyConstraints.length === 0) {
      console.log('ℹ️  Nenhuma constraint UNIQUE(email) isolada encontrada (pode já ter sido removida).');
    }

    for (const c of emailOnlyConstraints) {
      console.log(`🗑️  Removendo constraint: ${c.constraint_name}`);
      await queryRunner.query(
        `ALTER TABLE "user" DROP CONSTRAINT "${c.constraint_name}"`,
      );
      console.log(`   ✅ Removida.`);
    }

    // ─── 3. Verificar se constraint composta já existe ────────────────────────
    const compositeExists: { constraint_name: string }[] =
      await queryRunner.query(`
        SELECT tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema   = kcu.table_schema
        WHERE tc.constraint_type = 'UNIQUE'
          AND tc.table_name      = 'user'
          AND tc.table_schema    = 'public'
          AND tc.constraint_name = 'UQ_user_email_schoolId'
      `);

    if (compositeExists.length > 0) {
      console.log('\nℹ️  Constraint UQ_user_email_schoolId já existe — nada a fazer.');
    } else {
      // ─── 4. Criar constraint composta ────────────────────────────────────────
      console.log('\n➕ Criando UNIQUE composta (email, "schoolId")...');
      await queryRunner.query(`
        ALTER TABLE "user"
        ADD CONSTRAINT "UQ_user_email_schoolId" UNIQUE (email, "schoolId")
      `);
      console.log('✅ Constraint UQ_user_email_schoolId criada.');
    }

    // ─── Resumo final ─────────────────────────────────────────────────────────
    console.log('\n🎉 Migration concluída com sucesso!');
    console.log('   → O mesmo e-mail agora pode existir em escolas diferentes.');
    console.log('   → Reinicie a API para aplicar as mudanças na entity.\n');
  } catch (error) {
    console.error('\n❌ Erro durante migration:', error);
    throw error;
  } finally {
    await queryRunner.release();
    await dataSource.destroy();
  }
}

migrate().catch((e) => {
  console.error(e);
  process.exit(1);
});
