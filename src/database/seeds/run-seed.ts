import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { runDemoSeed } from './demo.seed';

dotenv.config();

const dataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST,
  port: +(process.env.DB_PORT ?? 3306),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
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
