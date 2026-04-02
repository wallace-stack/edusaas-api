import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
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

async function sync() {
  await dataSource.initialize();
  console.log('Sincronizando schema...');
  await dataSource.synchronize(false);
  console.log('✅ Schema sincronizado!');
  await dataSource.destroy();
}

sync().catch(console.error);
