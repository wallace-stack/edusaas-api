import { Module, Global } from '@nestjs/common';
import { createClient } from '@libsql/client';
import { ConfigService } from '@nestjs/config';

export const TURSO_CLIENT = 'TURSO_CLIENT';

@Global()
@Module({
  providers: [
    {
      provide: TURSO_CLIENT,
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('TURSO_DATABASE_URL')!;
        const authToken = config.get<string>('TURSO_AUTH_TOKEN');
        console.log('Turso URL:', url.substring(0, 40));
        console.log('Turso token:', authToken ? `OK (${authToken.length} chars)` : 'MISSING');
        return createClient({ url, authToken });
      },
      inject: [ConfigService],
    },
  ],
  exports: [TURSO_CLIENT],
})
export class TursoModule {}
