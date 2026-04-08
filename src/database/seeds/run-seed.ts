import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { runDemoSeed } from './demo.seed';

dotenv.config();

const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
  synchronize: false,
});

async function main() {
  await dataSource.initialize();
  console.log('DataSource inicializado.');

  await runDemoSeed(dataSource);

  await dataSource.destroy();
  console.log('Conexão encerrada.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
