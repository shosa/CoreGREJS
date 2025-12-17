/**
 * Script per rimuovere import Swagger duplicati e metterli al posto giusto
 */

const fs = require('fs');
const path = require('path');

const controllers = [
  'src/modules/export/export.controller.ts',
  'src/modules/quality/quality.controller.ts',
  'src/modules/riparazioni/riparazioni.controller.ts',
  'src/modules/jobs/jobs.controller.ts',
  'src/modules/tracking/tracking.controller.ts',
  'src/modules/scm/scm.controller.ts',
  'src/modules/file-manager/file-manager.controller.ts',
  'src/modules/activity-log/activity-log.controller.ts',
  'src/modules/settings/settings.controller.ts',
  'src/modules/inwork/inwork.controller.ts',
];

const swaggerImport = "import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiConsumes, ApiBody } from '@nestjs/swagger';";

controllers.forEach(controllerPath => {
  const filePath = path.join(__dirname, '..', controllerPath);

  console.log(`\nProcessing: ${controllerPath}`);

  if (!fs.existsSync(filePath)) {
    console.log('  ✗ File not found');
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // Rimuovi tutti gli import swagger (anche quelli alla fine del file)
  content = content.replace(/^import \{ ApiTags[^;]+from '@nestjs\/swagger';?\s*$/gm, '');

  // Trova la posizione dopo FileInterceptor import o dopo l'ultimo import
  const lines = content.split('\n');
  let insertIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.includes("from '@nestjs/platform-express'") || line.includes("from '@nestjs/common'")) {
      insertIndex = i + 1;
    }
  }

  if (insertIndex !== -1) {
    lines.splice(insertIndex, 0, swaggerImport);
    content = lines.join('\n');
    console.log('  ✓ Added Swagger import');
  } else {
    console.log('  ✗ Could not find insertion point');
    return;
  }

  // Scrivi file
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('  ✓ File updated');
});

console.log('\n✅ Done!');
