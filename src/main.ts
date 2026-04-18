import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import * as http from 'http';

// Servidor temporário para satisfazer o port scan do Render enquanto o DB conecta
const PORT = process.env.PORT || 3000;
const tempServer = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('starting...');
});
tempServer.listen(PORT);

async function bootstrap() {
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

  app.useGlobalFilters(new GlobalExceptionFilter());

  // Limite de payload — impede uploads gigantes que derrubam o servidor
  app.use(require('express').json({ limit: '5mb' }));
  app.use(require('express').urlencoded({ extended: true, limit: '5mb' }));

  tempServer.close();
  await app.listen(PORT);
}
bootstrap();