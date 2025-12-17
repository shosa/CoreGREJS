/**
 * Script per aggiungere decorator Swagger a tutti i controller
 * Esegui con: node scripts/add-swagger-decorators.js
 */

const fs = require('fs');
const path = require('path');

// Configurazione controller da aggiornare
const controllers = [
  {
    path: 'src/modules/produzione/produzione.controller.ts',
    tag: 'Produzione',
    needsBearerAuth: true
  },
  {
    path: 'src/modules/quality/quality.controller.ts',
    tag: 'Quality',
    needsBearerAuth: true
  },
  {
    path: 'src/modules/export/export.controller.ts',
    tag: 'Export',
    needsBearerAuth: true
  },
  {
    path: 'src/modules/tracking/tracking.controller.ts',
    tag: 'Tracking',
    needsBearerAuth: true
  },
  {
    path: 'src/modules/riparazioni/riparazioni.controller.ts',
    tag: 'Riparazioni',
    needsBearerAuth: true
  },
  {
    path: 'src/modules/scm/scm.controller.ts',
    tag: 'SCM',
    needsBearerAuth: true
  },
  {
    path: 'src/modules/jobs/jobs.controller.ts',
    tag: 'Jobs',
    needsBearerAuth: true
  },
  {
    path: 'src/modules/file-manager/file-manager.controller.ts',
    tag: 'File Manager',
    needsBearerAuth: true
  },
  {
    path: 'src/modules/activity-log/activity-log.controller.ts',
    tag: 'Activity Log',
    needsBearerAuth: true
  },
  {
    path: 'src/modules/settings/settings.controller.ts',
    tag: 'Settings',
    needsBearerAuth: true
  },
  {
    path: 'src/modules/inwork/inwork.controller.ts',
    tag: 'Inwork',
    needsBearerAuth: true
  },
  {
    path: 'src/modules/mobile/discovery.controller.ts',
    tag: 'Mobile - Discovery',
    needsBearerAuth: false
  },
  {
    path: 'src/modules/mobile/mobile-api.controller.ts',
    tag: 'Mobile - API',
    needsBearerAuth: false
  },
  {
    path: 'src/modules/mobile/operators.controller.ts',
    tag: 'Mobile - Operators',
    needsBearerAuth: false
  },
  {
    path: 'src/modules/mobile/quality-api.controller.ts',
    tag: 'Mobile - Quality API',
    needsBearerAuth: false
  }
];

// Funzione per aggiungere import Swagger se mancante
function addSwaggerImports(content) {
  const swaggerImports = `import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiConsumes, ApiBody } from '@nestjs/swagger';`;

  // Verifica se già presente
  if (content.includes('@nestjs/swagger')) {
    console.log('  ✓ Import Swagger già presente');
    return content;
  }

  // Trova l'ultima riga di import
  const lines = content.split('\n');
  let lastImportIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('import ') || lines[i].trim().includes(' from ')) {
      lastImportIndex = i;
    }
  }

  if (lastImportIndex !== -1) {
    lines.splice(lastImportIndex + 1, 0, swaggerImports);
    console.log('  ✓ Aggiunto import Swagger');
    return lines.join('\n');
  }

  return content;
}

// Funzione per aggiungere decorator al controller
function addControllerDecorators(content, tag, needsBearerAuth) {
  // Trova @Controller
  const controllerRegex = /(@Controller\([^)]+\))/;
  const match = content.match(controllerRegex);

  if (!match) {
    console.log('  ✗ @Controller non trovato');
    return content;
  }

  // Verifica se già ha @ApiTags
  if (content.includes('@ApiTags')) {
    console.log('  ✓ @ApiTags già presente');
    return content;
  }

  // Costruisci decorator
  let decorators = `@ApiTags('${tag}')\n`;
  if (needsBearerAuth) {
    decorators += `@ApiBearerAuth()\n`;
  }

  // Sostituisci
  const newContent = content.replace(controllerRegex, `${decorators}$1`);
  console.log('  ✓ Aggiunti decorator controller');

  return newContent;
}

// Funzione principale
function processController(controllerConfig) {
  const filePath = path.join(__dirname, '..', controllerConfig.path);

  console.log(`\nProcessando: ${controllerConfig.path}`);

  // Verifica esistenza file
  if (!fs.existsSync(filePath)) {
    console.log(`  ✗ File non trovato: ${filePath}`);
    return;
  }

  // Leggi contenuto
  let content = fs.readFileSync(filePath, 'utf8');

  // Aggiungi import
  content = addSwaggerImports(content);

  // Aggiungi decorator
  content = addControllerDecorators(content, controllerConfig.tag, controllerConfig.needsBearerAuth);

  // Scrivi file
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('  ✓ File aggiornato con successo');
}

// Esegui per tutti i controller
console.log('='.repeat(60));
console.log('AGGIUNTA DECORATOR SWAGGER AI CONTROLLER');
console.log('='.repeat(60));

controllers.forEach(processController);

console.log('\n' + '='.repeat(60));
console.log('COMPLETATO!');
console.log('='.repeat(60));
console.log(`\nAggiornati ${controllers.length} controller`);
console.log('\nProssimi step:');
console.log('1. Verifica i file aggiornati');
console.log('2. Aggiungi @ApiOperation agli endpoint individuali');
console.log('3. Aggiungi @ApiResponse per documentare risposte');
console.log('4. Crea DTO con @ApiProperty per request body');
console.log('5. Testa Swagger UI: http://localhost:3011/api/docs');
