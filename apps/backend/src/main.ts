import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggerService } from './common/services/logger.service';

async function bootstrap() {
  const logger = new LoggerService();

  try {
    logger.log('🚀 Inizializzazione CoreGRE Backend...', 'Bootstrap');

    const app = await NestFactory.create(AppModule, {
      logger: logger,
    });

    logger.success('✓ Applicazione NestJS creata', 'Bootstrap');

    // CORS configuration
    app.enableCors({
      origin: process.env.FRONTEND_URL || 'http://localhost:3010',
      credentials: true,
    });
    logger.success('✓ CORS configurato', 'Bootstrap');

    // Global filters - L'ordine è importante: prima specifici, poi generali
    app.useGlobalFilters(
      new PrismaExceptionFilter(), // Gestisce errori Prisma specifici
      new AllExceptionsFilter(),   // Gestisce tutte le altre eccezioni
    );
    logger.success('✓ Filtri eccezioni globali registrati', 'Bootstrap');

    // Global validation pipe
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
        exceptionFactory: (errors) => {
          // Personalizza i messaggi di validazione in italiano
          const messages = errors.map((error) => {
            const constraints = error.constraints;
            if (!constraints) return 'Errore di validazione';

            // Traduci i messaggi di validazione comuni
            const translations: Record<string, string> = {
              isNotEmpty: `Il campo "${error.property}" è obbligatorio`,
              isString: `Il campo "${error.property}" deve essere una stringa`,
              isNumber: `Il campo "${error.property}" deve essere un numero`,
              isEmail: `Il campo "${error.property}" deve essere un'email valida`,
              minLength: `Il campo "${error.property}" è troppo corto`,
              maxLength: `Il campo "${error.property}" è troppo lungo`,
              min: `Il valore di "${error.property}" è troppo basso`,
              max: `Il valore di "${error.property}" è troppo alto`,
            };

            const key = Object.keys(constraints)[0];
            return translations[key] || constraints[key];
          });

          return {
            statusCode: 400,
            error: 'Errore Validazione',
            message: messages,
          };
        },
      }),
    );
    logger.success('✓ Validation pipe configurato', 'Bootstrap');

    // Swagger documentation
    const config = new DocumentBuilder()
      .setTitle('CoreGRE API')
      .setDescription('CoreGRE ERP System API')
      .setVersion('1.0.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
    logger.success('✓ Documentazione Swagger configurata', 'Bootstrap');

    const port = process.env.PORT || 3011;
    await app.listen(port);

    // Log di avvio con informazioni utili
    logger.logServerStart(port);
  } catch (error: any) {
    logger.error('💥 ERRORE FATALE durante l\'avvio dell\'applicazione', error.stack, 'Bootstrap');
    logger.error(`   Messaggio: ${error.message}`, undefined, 'Bootstrap');
    process.exit(1);
  }
}

bootstrap();
