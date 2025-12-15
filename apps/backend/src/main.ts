import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { PrismaExceptionFilter } from "./common/filters/prisma-exception.filter";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { LoggerService } from "./common/services/logger.service";
import { NestExpressApplication } from "@nestjs/platform-express";
import { join } from "path";

async function bootstrap() {
  const logger = new LoggerService();

  try {
    console.log('\n');
    logger.log("Inizializzazione CoreGRE Backend in corso...", "Bootstrap");
    logger.log("", "");

    logger.log("Step 1/7: Creazione applicazione NestJS", "Bootstrap");
    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
      logger: logger,
    });
    logger.success("[OK] Applicazione NestJS creata", "Bootstrap");

    logger.log("Step 2/7: Configurazione static assets", "Bootstrap");
    app.useStaticAssets(join(process.cwd(), "storage"), {
      prefix: "/storage/",
    });
    logger.success("[OK] Static assets configurati", "Bootstrap");

    logger.log("Step 3/7: Configurazione CORS", "Bootstrap");
    app.enableCors({
      origin: true,
      credentials: true,
    });
    logger.success("[OK] CORS configurato", "Bootstrap");

    logger.log("Step 4/7: Registrazione filtri eccezioni globali", "Bootstrap");
    app.useGlobalFilters(
      new PrismaExceptionFilter(),
      new AllExceptionsFilter()
    );
    logger.success("[OK] Filtri eccezioni globali registrati", "Bootstrap");

    logger.log("Step 5/7: Configurazione validation pipe", "Bootstrap");
    app.setGlobalPrefix("api");
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
        exceptionFactory: (errors) => {
          const messages = errors.map((error) => {
            const constraints = error.constraints;
            if (!constraints) return "Errore di validazione";

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
            error: "Errore Validazione",
            message: messages,
          };
        },
      })
    );
    logger.success("[OK] Validation pipe configurato", "Bootstrap");

    logger.log("Step 6/7: Configurazione documentazione Swagger", "Bootstrap");
    const config = new DocumentBuilder()
      .setTitle("CoreGRE API")
      .setDescription("CoreGRE ERP System API")
      .setVersion("1.0.0")
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("api/docs", app, document);
    logger.success("[OK] Documentazione Swagger configurata", "Bootstrap");

    logger.log("Step 7/7: Avvio server HTTP", "Bootstrap");
    const port = process.env.PORT || 3011;
    await app.listen(port);
    logger.success("[OK] Server HTTP in ascolto", "Bootstrap");

    logger.log("", "");
    logger.success("Bootstrap completato con successo", "Bootstrap");
    console.log('\n');

    logger.logServerStart(port);
  } catch (error: any) {
    console.log('\n');
    logger.error(
      "[ERRORE FATALE] Impossibile avviare l'applicazione",
      error.stack,
      "Bootstrap"
    );
    logger.error(`Dettagli: ${error.message}`, undefined, "Bootstrap");
    logger.error("Il server verra terminato", undefined, "Bootstrap");
    console.log('\n');
    process.exit(1);
  }
}

bootstrap();
