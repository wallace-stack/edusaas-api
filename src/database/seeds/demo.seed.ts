import { DataSource } from 'typeorm';

/**
 * Demo seed — idempotente (seguro rodar múltiplas vezes).
 * Popula a escola de demonstração e sua estrutura base.
 * Os dados concretos (turmas, alunos, etc.) são adicionados em próximos passos.
 */
export async function runDemoSeed(dataSource: DataSource): Promise<void> {
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // Verificar se escola demo já existe
    const existing = await queryRunner.manager.query(
      `SELECT id FROM school WHERE slug = 'demo' LIMIT 1`,
    );

    if (existing.length > 0) {
      console.log('Demo seed já foi executado anteriormente. Pulando.');
      await queryRunner.rollbackTransaction();
      return;
    }

    // Inserções virão aqui no próximo passo
    // Ex: await queryRunner.manager.save(School, { ... })

    await queryRunner.commitTransaction();
    console.log('Demo seed executado com sucesso.');
  } catch (err) {
    await queryRunner.rollbackTransaction();
    console.error('Erro no demo seed — rollback realizado:', err);
    throw err;
  } finally {
    await queryRunner.release();
  }
}
