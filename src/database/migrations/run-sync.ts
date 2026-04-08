import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
dotenv.config();

const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
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
