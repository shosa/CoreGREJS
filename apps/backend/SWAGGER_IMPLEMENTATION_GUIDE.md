# Guida Implementazione Swagger - CoreGREJS Backend

Questa guida fornisce esempi pratici per implementare la documentazione Swagger su tutti i controller del backend CoreGREJS.

---

## Indice

1. [Setup Base](#setup-base)
2. [Decorator Controller](#decorator-controller)
3. [Decorator Endpoint](#decorator-endpoint)
4. [Documentazione DTO](#documentazione-dto)
5. [Query Parameters](#query-parameters)
6. [File Upload](#file-upload)
7. [Response Types](#response-types)
8. [Esempi Completi per Modulo](#esempi-completi-per-modulo)

---

## Setup Base

### Imports Necessari

Aggiungi all'inizio di ogni controller:

```typescript
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiConsumes
} from '@nestjs/swagger';
```

---

## Decorator Controller

### Template Base Controller

```typescript
@ApiTags('ModuleName')           // Raggruppa endpoint in Swagger UI
@ApiBearerAuth()                 // Indica che richiede JWT
@Controller('module-path')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('permission_name')
export class ModuleController {
  // endpoints...
}
```

### Esempio: ProduzioneController

```typescript
@ApiTags('Produzione')
@ApiBearerAuth()
@Controller('produzione')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('produzione')
export class ProduzioneController {
  // ...
}
```

---

## Decorator Endpoint

### GET Endpoint (Senza Parametri)

```typescript
@Get('phases')
@ApiOperation({
  summary: 'Lista fasi produzione',
  description: 'Recupera tutte le fasi di produzione configurate nel sistema'
})
@ApiResponse({
  status: 200,
  description: 'Lista fasi recuperata con successo'
})
@ApiResponse({
  status: 401,
  description: 'Non autorizzato - Token JWT mancante o non valido'
})
@ApiResponse({
  status: 403,
  description: 'Accesso negato - Permesso "produzione" richiesto'
})
async getAllPhases() {
  return this.produzioneService.getAllPhases();
}
```

### GET Endpoint con Path Parameter

```typescript
@Get('phases/:id')
@ApiOperation({
  summary: 'Dettagli fase produzione',
  description: 'Recupera i dettagli di una specifica fase di produzione'
})
@ApiParam({
  name: 'id',
  type: 'number',
  description: 'ID della fase',
  example: 1
})
@ApiResponse({
  status: 200,
  description: 'Fase recuperata con successo'
})
@ApiResponse({
  status: 404,
  description: 'Fase non trovata'
})
async getPhaseById(@Param('id') id: string) {
  return this.produzioneService.getPhaseById(parseInt(id));
}
```

### POST Endpoint

```typescript
@Post('phases')
@ApiOperation({
  summary: 'Crea fase produzione',
  description: 'Crea una nuova fase di produzione'
})
@ApiBody({
  description: 'Dati della nuova fase',
  schema: {
    type: 'object',
    properties: {
      nome: { type: 'string', example: 'Taglio' },
      ordine: { type: 'number', example: 1 },
      attivo: { type: 'boolean', example: true }
    },
    required: ['nome', 'ordine']
  }
})
@ApiResponse({
  status: 201,
  description: 'Fase creata con successo'
})
@ApiResponse({
  status: 400,
  description: 'Dati non validi'
})
@LogActivity({
  module: 'produzione',
  action: 'create',
  entity: 'ProductionPhase',
  description: 'Creazione nuova fase produzione'
})
async createPhase(@Body() data: any) {
  return this.produzioneService.createPhase(data);
}
```

### PUT Endpoint

```typescript
@Put('phases/:id')
@ApiOperation({
  summary: 'Aggiorna fase produzione',
  description: 'Aggiorna i dati di una fase esistente'
})
@ApiParam({
  name: 'id',
  type: 'number',
  description: 'ID della fase da aggiornare'
})
@ApiBody({
  description: 'Dati aggiornati della fase',
  schema: {
    type: 'object',
    properties: {
      nome: { type: 'string', example: 'Taglio Laser' },
      ordine: { type: 'number', example: 1 },
      attivo: { type: 'boolean', example: true }
    }
  }
})
@ApiResponse({
  status: 200,
  description: 'Fase aggiornata con successo'
})
@ApiResponse({
  status: 404,
  description: 'Fase non trovata'
})
@LogActivity({
  module: 'produzione',
  action: 'update',
  entity: 'ProductionPhase',
  description: 'Aggiornamento fase produzione'
})
async updatePhase(@Param('id') id: string, @Body() data: any) {
  return this.produzioneService.updatePhase(parseInt(id), data);
}
```

### DELETE Endpoint

```typescript
@Delete('phases/:id')
@ApiOperation({
  summary: 'Elimina fase produzione',
  description: 'Elimina una fase di produzione dal sistema'
})
@ApiParam({
  name: 'id',
  type: 'number',
  description: 'ID della fase da eliminare'
})
@ApiResponse({
  status: 200,
  description: 'Fase eliminata con successo'
})
@ApiResponse({
  status: 404,
  description: 'Fase non trovata'
})
@ApiResponse({
  status: 409,
  description: 'Impossibile eliminare - fase in uso'
})
@LogActivity({
  module: 'produzione',
  action: 'delete',
  entity: 'ProductionPhase',
  description: 'Eliminazione fase produzione'
})
async deletePhase(@Param('id') id: string) {
  return this.produzioneService.deletePhase(parseInt(id));
}
```

---

## Query Parameters

### Singolo Query Parameter

```typescript
@Get('recent')
@ApiOperation({
  summary: 'Record produzione recenti',
  description: 'Recupera gli ultimi N record di produzione'
})
@ApiQuery({
  name: 'limit',
  required: false,
  type: 'number',
  description: 'Numero massimo di record da recuperare',
  example: 15
})
@ApiResponse({
  status: 200,
  description: 'Record recuperati con successo'
})
async getRecentRecords(@Query('limit') limit: string) {
  const numLimit = limit ? parseInt(limit) : 15;
  return this.produzioneService.getRecentRecords(numLimit);
}
```

### Multiple Query Parameters

```typescript
@Get('calendar')
@ApiOperation({
  summary: 'Calendario produzione mensile',
  description: 'Recupera i dati di produzione per un mese specifico'
})
@ApiQuery({
  name: 'month',
  required: true,
  type: 'number',
  description: 'Mese (1-12)',
  example: 1
})
@ApiQuery({
  name: 'year',
  required: true,
  type: 'number',
  description: 'Anno (YYYY)',
  example: 2025
})
@ApiResponse({
  status: 200,
  description: 'Calendario recuperato con successo',
  schema: {
    type: 'object',
    properties: {
      month: { type: 'number', example: 1 },
      year: { type: 'number', example: 2025 },
      days: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            date: { type: 'string', example: '2025-01-15' },
            totalProduced: { type: 'number', example: 1250 },
            efficiency: { type: 'number', example: 83.3 }
          }
        }
      }
    }
  }
})
@ApiResponse({
  status: 400,
  description: 'Parametri non validi'
})
async getCalendar(
  @Query('month') month: string,
  @Query('year') year: string,
) {
  const now = new Date();
  const m = month ? parseInt(month) : now.getMonth() + 1;
  const y = year ? parseInt(year) : now.getFullYear();
  return this.produzioneService.getCalendarData(m, y);
}
```

### Query Parameters con Filtri Complessi

```typescript
@Get('comparison')
@ApiOperation({
  summary: 'Confronto periodi produzione',
  description: 'Confronta i dati di produzione tra due periodi diversi'
})
@ApiQuery({ name: 'month1', required: false, type: 'number', description: 'Mese periodo 1' })
@ApiQuery({ name: 'year1', required: false, type: 'number', description: 'Anno periodo 1' })
@ApiQuery({ name: 'month2', required: false, type: 'number', description: 'Mese periodo 2' })
@ApiQuery({ name: 'year2', required: false, type: 'number', description: 'Anno periodo 2' })
@ApiResponse({
  status: 200,
  description: 'Confronto completato con successo'
})
async getComparison(
  @Query('month1') month1: string,
  @Query('year1') year1: string,
  @Query('month2') month2: string,
  @Query('year2') year2: string,
) {
  // implementation...
}
```

---

## File Upload

### Upload Singolo File

```typescript
@Post('process-csv')
@UseInterceptors(FileInterceptor('csvFile'))
@ApiOperation({
  summary: 'Carica e processa CSV produzione',
  description: 'Upload di un file CSV contenente dati di produzione e relativo processamento'
})
@ApiConsumes('multipart/form-data')
@ApiBody({
  description: 'File CSV da processare',
  schema: {
    type: 'object',
    properties: {
      csvFile: {
        type: 'string',
        format: 'binary',
        description: 'File CSV'
      }
    },
    required: ['csvFile']
  }
})
@ApiResponse({
  status: 200,
  description: 'CSV processato con successo',
  schema: {
    type: 'object',
    properties: {
      processed: { type: 'number', example: 150 },
      errors: { type: 'array', items: { type: 'string' } }
    }
  }
})
@ApiResponse({
  status: 400,
  description: 'File non valido o mancante'
})
@LogActivity({
  module: 'produzione',
  action: 'upload_csv',
  entity: 'CSV',
  description: 'Upload e elaborazione CSV produzione'
})
async processCsv(
  @UploadedFile() file: Express.Multer.File,
  @Request() req,
) {
  if (!file) {
    throw new BadRequestException('File CSV non presente');
  }
  const userId = req.user?.userId || req.user?.id;
  return this.produzioneService.processCsv(file, userId);
}
```

---

## Response Types

### Response con Job Asincrono

```typescript
@Get('pdf/:date')
@ApiOperation({
  summary: 'Genera report PDF produzione',
  description: 'Enqueue job asincrono per generare report PDF produzione per una data specifica'
})
@ApiParam({
  name: 'date',
  type: 'string',
  description: 'Data nel formato YYYY-MM-DD',
  example: '2025-01-15'
})
@ApiResponse({
  status: 202,
  description: 'Job enqueued con successo',
  schema: {
    type: 'object',
    properties: {
      jobId: { type: 'string', example: 'job_123456789' },
      status: { type: 'string', example: 'pending', enum: ['pending', 'processing', 'done', 'failed'] }
    }
  }
})
@ApiResponse({
  status: 400,
  description: 'Data non valida'
})
async generatePdf(@Param('date') date: string, @Request() req: any) {
  const userId = req.user?.userId || req.user?.id;
  const job = await this.jobsQueueService.enqueue('prod.report-pdf', { date }, userId);
  return { jobId: job.id, status: job.status };
}
```

### Response con Pagination

```typescript
@Get('records')
@ApiOperation({
  summary: 'Lista record produzione',
  description: 'Recupera lista paginata dei record di produzione'
})
@ApiQuery({ name: 'page', required: false, type: 'number', example: 1 })
@ApiQuery({ name: 'limit', required: false, type: 'number', example: 20 })
@ApiResponse({
  status: 200,
  description: 'Lista recuperata con successo',
  schema: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            date: { type: 'string', example: '2025-01-15' },
            totalProduced: { type: 'number', example: 1250 }
          }
        }
      },
      total: { type: 'number', example: 150 },
      page: { type: 'number', example: 1 },
      limit: { type: 'number', example: 20 },
      totalPages: { type: 'number', example: 8 }
    }
  }
})
async getRecords(
  @Query('page') page: string,
  @Query('limit') limit: string
) {
  // implementation...
}
```

---

## Documentazione DTO

### DTO Base con @ApiProperty

Crea file `dto/create-phase.dto.ts`:

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsBoolean, IsNotEmpty, Min } from 'class-validator';

export class CreatePhaseDto {
  @ApiProperty({
    description: 'Nome della fase di produzione',
    example: 'Taglio',
    minLength: 2,
    maxLength: 100
  })
  @IsString()
  @IsNotEmpty()
  nome: string;

  @ApiProperty({
    description: 'Ordine di esecuzione della fase',
    example: 1,
    minimum: 1
  })
  @IsNumber()
  @Min(1)
  ordine: number;

  @ApiProperty({
    description: 'Indica se la fase è attiva',
    example: true,
    default: true
  })
  @IsBoolean()
  attivo: boolean;
}
```

### DTO con Campi Opzionali

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsBoolean, IsOptional, Min } from 'class-validator';

export class UpdatePhaseDto {
  @ApiPropertyOptional({
    description: 'Nome della fase di produzione',
    example: 'Taglio Laser'
  })
  @IsString()
  @IsOptional()
  nome?: string;

  @ApiPropertyOptional({
    description: 'Ordine di esecuzione della fase',
    example: 2
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  ordine?: number;

  @ApiPropertyOptional({
    description: 'Indica se la fase è attiva',
    example: false
  })
  @IsBoolean()
  @IsOptional()
  attivo?: boolean;
}
```

### DTO con Array e Nested Objects

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNumber, IsString, ValidateNested, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

class PhaseDataDto {
  @ApiProperty({
    description: 'ID della fase',
    example: 1
  })
  @IsNumber()
  phaseId: number;

  @ApiProperty({
    description: 'Quantità prodotta',
    example: 500
  })
  @IsNumber()
  produced: number;

  @ApiProperty({
    description: 'Quantità target',
    example: 600
  })
  @IsNumber()
  target: number;
}

class DepartmentDataDto {
  @ApiProperty({
    description: 'ID del reparto',
    example: 1
  })
  @IsNumber()
  departmentId: number;

  @ApiProperty({
    description: 'Fasi del reparto',
    type: [PhaseDataDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PhaseDataDto)
  phases: PhaseDataDto[];
}

export class SaveProductionDataDto {
  @ApiProperty({
    description: 'Data di produzione (YYYY-MM-DD)',
    example: '2025-01-15'
  })
  @IsString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({
    description: 'Dati per reparto',
    type: [DepartmentDataDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DepartmentDataDto)
  departments: DepartmentDataDto[];
}
```

### DTO per Query Filters

```typescript
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsString, IsEnum, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum StatusEnum {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed'
}

export class FilterRecordsDto {
  @ApiPropertyOptional({
    description: 'Numero pagina',
    example: 1,
    default: 1,
    minimum: 1
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Numero record per pagina',
    example: 20,
    default: 20,
    minimum: 1,
    maximum: 100
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Data inizio filtro (YYYY-MM-DD)',
    example: '2025-01-01'
  })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Data fine filtro (YYYY-MM-DD)',
    example: '2025-01-31'
  })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Stato del record',
    enum: StatusEnum,
    example: StatusEnum.COMPLETED
  })
  @IsOptional()
  @IsEnum(StatusEnum)
  status?: StatusEnum;
}
```

---

## Esempi Completi per Modulo

### 1. ProduzioneController - Completo

```typescript
import {
  Controller, Get, Post, Put, Delete, Body, Query, Param,
  UseGuards, Request, BadRequestException, UseInterceptors, UploadedFile
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags, ApiBearerAuth, ApiOperation, ApiResponse,
  ApiParam, ApiQuery, ApiConsumes, ApiBody
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { LogActivity } from '../../common/decorators/log-activity.decorator';
import { ProduzioneService } from './produzione.service';

@ApiTags('Produzione')
@ApiBearerAuth()
@Controller('produzione')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('produzione')
export class ProduzioneController {
  constructor(private produzioneService: ProduzioneService) {}

  @Get('phases')
  @ApiOperation({ summary: 'Lista fasi produzione' })
  @ApiResponse({ status: 200, description: 'Lista recuperata con successo' })
  @ApiResponse({ status: 401, description: 'Non autorizzato' })
  async getAllPhases() {
    return this.produzioneService.getAllPhases();
  }

  @Get('phases/:id')
  @ApiOperation({ summary: 'Dettagli fase produzione' })
  @ApiParam({ name: 'id', type: 'number', example: 1 })
  @ApiResponse({ status: 200, description: 'Fase recuperata' })
  @ApiResponse({ status: 404, description: 'Fase non trovata' })
  async getPhaseById(@Param('id') id: string) {
    return this.produzioneService.getPhaseById(parseInt(id));
  }

  @Post('phases')
  @ApiOperation({ summary: 'Crea fase produzione' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        nome: { type: 'string', example: 'Taglio' },
        ordine: { type: 'number', example: 1 },
        attivo: { type: 'boolean', example: true }
      },
      required: ['nome', 'ordine']
    }
  })
  @ApiResponse({ status: 201, description: 'Fase creata' })
  @ApiResponse({ status: 400, description: 'Dati non validi' })
  @LogActivity({ module: 'produzione', action: 'create', entity: 'ProductionPhase' })
  async createPhase(@Body() data: any) {
    return this.produzioneService.createPhase(data);
  }

  @Get('calendar')
  @ApiOperation({ summary: 'Calendario produzione mensile' })
  @ApiQuery({ name: 'month', type: 'number', example: 1 })
  @ApiQuery({ name: 'year', type: 'number', example: 2025 })
  @ApiResponse({ status: 200, description: 'Calendario recuperato' })
  async getCalendar(@Query('month') month: string, @Query('year') year: string) {
    const m = parseInt(month);
    const y = parseInt(year);
    return this.produzioneService.getCalendarData(m, y);
  }
}
```

### 2. QualityController - Completo

```typescript
import {
  Controller, Get, Post, Put, Delete, Body, Query, Param, UseGuards
} from '@nestjs/common';
import {
  ApiTags, ApiBearerAuth, ApiOperation, ApiResponse,
  ApiParam, ApiQuery, ApiBody
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { QualityService } from './quality.service';

@ApiTags('Quality')
@ApiBearerAuth()
@Controller('quality')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('qualita')
export class QualityController {
  constructor(private qualityService: QualityService) {}

  @Get('dashboard/stats')
  @ApiOperation({
    summary: 'Statistiche dashboard qualità',
    description: 'Recupera statistiche aggregate per la dashboard qualità'
  })
  @ApiResponse({
    status: 200,
    description: 'Statistiche recuperate',
    schema: {
      type: 'object',
      properties: {
        totalRecords: { type: 'number', example: 1500 },
        totalDefects: { type: 'number', example: 85 },
        defectRate: { type: 'number', example: 5.67 }
      }
    }
  })
  async getDashboardStats() {
    return this.qualityService.getDashboardStats();
  }

  @Get('records')
  @ApiOperation({ summary: 'Lista record controlli qualità' })
  @ApiQuery({ name: 'page', required: false, type: 'number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: 'number', example: 50 })
  @ApiQuery({ name: 'startDate', required: false, type: 'string', example: '2025-01-01' })
  @ApiQuery({ name: 'endDate', required: false, type: 'string', example: '2025-01-31' })
  @ApiResponse({ status: 200, description: 'Lista recuperata' })
  async getRecords(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ) {
    return this.qualityService.getRecords({ page, limit, startDate, endDate });
  }

  @Post('records')
  @ApiOperation({ summary: 'Crea record controllo qualità' })
  @ApiBody({
    description: 'Dati del controllo qualità',
    schema: {
      type: 'object',
      properties: {
        cartellino: { type: 'string', example: 'CART001' },
        quantita: { type: 'number', example: 50 },
        departmentId: { type: 'number', example: 1 },
        defects: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              defectTypeId: { type: 'number', example: 1 },
              quantity: { type: 'number', example: 2 }
            }
          }
        }
      },
      required: ['cartellino', 'quantita', 'departmentId']
    }
  })
  @ApiResponse({ status: 201, description: 'Record creato' })
  @ApiResponse({ status: 400, description: 'Dati non validi' })
  async createRecord(@Body() data: any) {
    return this.qualityService.createRecord(data);
  }
}
```

### 3. AuthController - Completo

```typescript
import { Controller, Post, Get, Put, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { LocalAuthGuard } from '../../common/guards/local-auth.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: 'Login utente',
    description: 'Autentica utente con username e password, ritorna JWT token'
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login effettuato con successo',
    schema: {
      type: 'object',
      properties: {
        access_token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            username: { type: 'string', example: 'admin' },
            email: { type: 'string', example: 'admin@coregre.com' }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Credenziali non valide' })
  async login(@Request() req) {
    return this.authService.login(req.user);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Profilo utente corrente' })
  @ApiResponse({ status: 200, description: 'Profilo recuperato' })
  @ApiResponse({ status: 401, description: 'Non autorizzato' })
  async getProfile(@Request() req) {
    return this.authService.getProfile(req.user.userId);
  }
}
```

---

## Checklist Implementazione

Per ogni controller, seguire questa checklist:

- [ ] Import decorator Swagger
- [ ] Aggiungere `@ApiTags('ModuleName')`
- [ ] Aggiungere `@ApiBearerAuth()` se protetto da JWT
- [ ] Per ogni endpoint:
  - [ ] Aggiungere `@ApiOperation({ summary: '...' })`
  - [ ] Aggiungere `@ApiResponse()` per status 200/201
  - [ ] Aggiungere `@ApiResponse()` per errori comuni (400, 401, 404)
  - [ ] Aggiungere `@ApiParam()` per path parameters
  - [ ] Aggiungere `@ApiQuery()` per query parameters
  - [ ] Aggiungere `@ApiBody()` per request body
  - [ ] Se upload file, aggiungere `@ApiConsumes('multipart/form-data')`

Per ogni DTO:

- [ ] Creare file DTO separato (non usare `any`)
- [ ] Importare `@ApiProperty` e `@ApiPropertyOptional`
- [ ] Documentare ogni campo con esempio e descrizione
- [ ] Aggiungere validatori class-validator (`@IsString()`, ecc.)

---

## Test Swagger UI

Dopo implementazione:

1. Avvia server: `npm run dev`
2. Apri browser: `http://localhost:3011/api/docs`
3. Verifica:
   - [ ] Tutti i moduli raggruppati correttamente sotto Tags
   - [ ] Endpoint visibili con descrizioni
   - [ ] Pulsante "Authorize" funzionante per JWT
   - [ ] Request body examples corretti
   - [ ] Response examples visibili
   - [ ] Query parameters documentati

---

## Priority Implementation Order

### HIGH PRIORITY (completare entro settimana 1)
1. **ProduzioneController** - modulo critico
2. **QualityController** - molti endpoint
3. **AuthController** - completare @ApiResponse

### MEDIUM PRIORITY (settimana 2)
4. **ExportController** - 40+ endpoint
5. **TrackingController** - endpoint complessi
6. **ScmController** - creare DTO

### LOW PRIORITY (settimana 3)
7. **JobsController** - documentare job queue
8. **RiparazioniController** - completare
9. Altri controller minori

---

## Risorse Utili

- [NestJS Swagger Module](https://docs.nestjs.com/openapi/introduction)
- [Swagger OpenAPI Specification](https://swagger.io/specification/)
- [Class Validator Decorators](https://github.com/typestack/class-validator#validation-decorators)

---

**Fine guida - Buon lavoro!**
