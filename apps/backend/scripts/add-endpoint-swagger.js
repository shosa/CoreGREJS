/**
 * Script per aggiungere @ApiOperation agli endpoint basandosi sui commenti esistenti
 * Esegui con: node scripts/add-endpoint-swagger.js
 */

const fs = require('fs');
const path = require('path');

// Controller da processare
const controllers = [
  'src/modules/produzione/produzione.controller.ts',
  'src/modules/quality/quality.controller.ts',
  'src/modules/export/export.controller.ts',
  'src/modules/tracking/tracking.controller.ts',
  'src/modules/riparazioni/riparazioni.controller.ts',
  'src/modules/scm/scm.controller.ts',
];

// Mappa HTTP method -> descrizione generica
const methodDescriptions = {
  Get: 'Recupera',
  Post: 'Crea',
  Put: 'Aggiorna',
  Delete: 'Elimina',
  Patch: 'Modifica parzialmente'
};

// Funzione per estrarre summary da commento JSDoc o path
function extractSummary(comment, httpMethod, routePath) {
  // Se c'è un commento JSDoc, usalo
  if (comment) {
    const lines = comment.split('\n').map(l => l.trim());
    for (const line of lines) {
      // Cerca linee che descrivono l'azione
      if (line.startsWith('*') && !line.startsWith('* @') && line.length > 3) {
        let summary = line.replace(/^\*\s*/, '').trim();
        // Rimuovi GET /path se presente
        summary = summary.replace(/^(GET|POST|PUT|DELETE|PATCH)\s+\/\S+\s*-?\s*/i, '');
        if (summary.length > 0) {
          return summary;
        }
      }
    }
  }

  // Fallback: genera da method e path
  const pathParts = routePath.replace(/:\w+/g, '').split('/').filter(Boolean);
  const resource = pathParts[pathParts.length - 1] || 'risorsa';
  const action = methodDescriptions[httpMethod] || 'Gestisce';

  return `${action} ${resource}`;
}

// Funzione per aggiungere @ApiOperation prima di un decorator HTTP
function addApiOperation(content) {
  const httpMethods = ['Get', 'Post', 'Put', 'Delete', 'Patch'];
  const lines = content.split('\n');
  const result = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Cerca decorator HTTP (@Get, @Post, etc)
    const methodMatch = trimmed.match(/@(Get|Post|Put|Delete|Patch)\((.*)\)/);

    if (methodMatch && !lines[i - 1]?.includes('@ApiOperation')) {
      const httpMethod = methodMatch[1];
      const routePath = methodMatch[2].replace(/['"]/g, '');

      // Cerca commento JSDoc precedente
      let comment = '';
      let j = i - 1;
      while (j >= 0 && (lines[j].trim().startsWith('*') || lines[j].trim().startsWith('/*') || lines[j].trim().startsWith('//'))) {
        comment = lines[j] + '\n' + comment;
        j--;
      }

      // Estrai summary
      const summary = extractSummary(comment, httpMethod, routePath);

      // Aggiungi decorator
      const indent = line.match(/^\s*/)[0];
      result.push(`${indent}@ApiOperation({ summary: '${summary}' })`);
      console.log(`  ✓ Aggiunto @ApiOperation per ${httpMethod} ${routePath}`);
    }

    result.push(line);
    i++;
  }

  return result.join('\n');
}

// Funzione per assicurare import Swagger completo
function ensureSwaggerImports(content) {
  if (content.includes('import { ApiTags')) {
    // Import già presente, verifica che sia completo
    if (!content.includes('ApiOperation')) {
      content = content.replace(
        /import \{([^}]+)\} from '@nestjs\/swagger';/,
        "import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiConsumes, ApiBody } from '@nestjs/swagger';"
      );
      console.log('  ✓ Aggiornato import Swagger con ApiOperation');
    }
  }
  return content;
}

// Processa controller
function processController(controllerPath) {
  const filePath = path.join(__dirname, '..', controllerPath);

  console.log(`\nProcessando: ${controllerPath}`);

  if (!fs.existsSync(filePath)) {
    console.log(`  ✗ File non trovato`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // Assicura import
  content = ensureSwaggerImports(content);

  // Conta @ApiOperation esistenti
  const existingCount = (content.match(/@ApiOperation/g) || []).length;

  // Aggiungi @ApiOperation
  content = addApiOperation(content);

  // Conta nuovi @ApiOperation
  const newCount = (content.match(/@ApiOperation/g) || []).length;
  const added = newCount - existingCount;

  // Scrivi file
  fs.writeFileSync(filePath, content, 'utf8');

  console.log(`  ✓ File aggiornato: +${added} @ApiOperation (totale: ${newCount})`);
}

// Main
console.log('='.repeat(70));
console.log('AGGIUNTA @ApiOperation AGLI ENDPOINT');
console.log('='.repeat(70));

controllers.forEach(processController);

console.log('\n' + '='.repeat(70));
console.log('COMPLETATO!');
console.log('='.repeat(70));
console.log('\nProssimi step:');
console.log('1. Verifica i file aggiornati');
console.log('2. Aggiungi @ApiResponse per documentare risposte (200, 400, 401, 404)');
console.log('3. Aggiungi @ApiParam per path parameters');
console.log('4. Aggiungi @ApiQuery per query parameters');
console.log('5. Crea DTO con @ApiProperty per request body');
console.log('6. Testa Swagger UI: http://localhost:3011/api/docs\n');
