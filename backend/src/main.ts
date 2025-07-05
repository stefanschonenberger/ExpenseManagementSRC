import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { LogLevel } from '@nestjs/common';
import { ConfigService } from '@nestjs/config'; // 1. Import ConfigService

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  // 2. Get an instance of ConfigService from the app
  const configService = app.get(ConfigService);

  // 3. Read HOST and PORT from environment variables, with defaults
  const host = configService.get<string>('HOST', 'localhost');
  const port = configService.get<number>('PORT', 3000);
  const frontendUrl = configService.get<string>('FRONTEND_URL', 'http://192.168.1.26:3001');

  // --- ENABLE CORS ---
  // This tells our backend to accept requests from our frontend.
  app.enableCors({
    origin: frontendUrl, // Use the configured frontend URL
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  await app.listen(port, host); // 4. Use the variables here
  
  console.log(`Backend is running on: ${await app.getUrl()}`);
  console.log(`Accepting requests from: ${frontendUrl}`);
}
bootstrap();
