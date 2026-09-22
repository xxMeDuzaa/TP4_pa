import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Config fail-fast
  const requiredEnvVars = ['STRIPE_SECRET', 'STRIPE_SUCCESS_URL', 'STRIPE_CANCEL_URL'];
  const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key]);
  if (missingEnvVars.length > 0) {
    logger.error(`Faltan variables de entorno requeridas: ${missingEnvVars.join(', ')}`);
    process.exit(1);
  }

  // Habilitar rawBody para los webhooks de Stripe
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // Validation Pipe global requerido
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = process.env.PORT || 3003;
  await app.listen(port);
  logger.log(`Payments MS corriendo en el puerto ${port}`);
}
bootstrap();