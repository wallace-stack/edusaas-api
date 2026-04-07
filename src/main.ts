import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';

async function bootstrap() {
  console.log('=== APP STARTING ===');
  console.log('BUILD_TIMESTAMP:', process.env.BUILD_TIMESTAMP || 'não definido');
  console.log('TURSO_DATABASE_URL:', process.env.TURSO_DATABASE_URL ? 'OK (' + process.env.TURSO_DATABASE_URL.substring(0, 30) + '...)' : 'MISSING');
  console.log('TURSO_AUTH_TOKEN:', process.env.TURSO_AUTH_TOKEN ? 'OK (' + process.env.TURSO_AUTH_TOKEN.length + ' chars)' : 'MISSING');
  console.log('===================');

  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: false,
    transform: true,
  }));

  app.enableCors({
    origin: [
      'https://edusaas-web-xi.vercel.app',
      'https://edusaas-web.vercel.app',
      'http://localhost:3000',
      'http://localhost:3001',
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Pragma'],
    credentials: true,
  });

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com'],
        connectSrc: ["'self'", 'https://edusaas-web-xi.vercel.app', 'https://edusaas-web.vercel.app', 'http://localhost:3000', 'http://localhost:3001'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));

  await app.listen(process.env.PORT || 3000);
}
bootstrap();