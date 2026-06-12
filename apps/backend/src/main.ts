import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as fs from 'fs';
import * as path from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Production: read allowed origins from CORS_ORIGIN env var (comma-separated)
  // Dev: default to localhost origins
  const corsOrigin = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
    : ['http://localhost:5173', 'http://localhost:3000'];

  app.enableCors({
    origin: corsOrigin,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Serve frontend static files in production
  // Try multiple paths for local dev and Docker
  const possiblePaths = [
    process.env.FRONTEND_DIST,
    '../frontend/dist',               // local: cwd = apps/backend/dist
    './apps/frontend/dist',           // Docker: cwd = /app
    path.join(process.cwd(), '../frontend/dist'),
  ].filter(Boolean);

  let frontendDist: string | null = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p!) && fs.existsSync(path.join(p!, 'index.html'))) {
      frontendDist = p;
      break;
    }
  }

  if (frontendDist) {
    app.useStaticAssets(frontendDist, {
      prefix: '/',
    });
    // SPA fallback — all non-API routes go to index.html
    app.use((req, res, next) => {
      if (!req.path.startsWith('/api') && !req.path.includes('.')) {
        res.sendFile(path.join(frontendDist!, 'index.html'));
      } else {
        next();
      }
    });
    console.log(`Serving frontend from: ${frontendDist}`);
  } else {
    console.log('No frontend dist found, API mode only.');
  }

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Backend running on http://localhost:${port}`);
}
bootstrap();
