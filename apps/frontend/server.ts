import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';

const port = parseInt(process.env.PORT || '3010', 10);
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev, port });
const handle = app.getRequestHandler();

// ─── Colori ANSI ──────────────────────────────────────────────────────────────
const C = {
  reset:   '\x1b[0m',
  cyan:    '\x1b[36m',
  green:   '\x1b[32m',
  yellow:  '\x1b[33m',
  red:     '\x1b[31m',
};

function ts(): string {
  return new Date().toLocaleString('it-IT', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

const info    = (msg: string, ctx = 'CoreGRE') => console.log(`${C.cyan}[${ts()}] [${ctx}] [INFO] ${msg}${C.reset}`);
const success = (msg: string, ctx = 'CoreGRE') => console.log(`${C.green}[${ts()}] [${ctx}] [OK] ${msg}${C.reset}`);

function printBanner() {
  console.log(C.cyan);
  console.log(' $$$$$$\\   $$$$$$\\  $$$$$$$\\  $$$$$$$$\\  $$$$$$\\  $$$$$$$\\  $$$$$$$$\\ ');
  console.log('$$  __$$\\ $$  __$$\\ $$  __$$\\ $$  _____|$$  __$$\\ $$  __$$\\ $$  _____|');
  console.log('$$ /  \\__|$$ /  $$ |$$ |  $$ |$$ |      $$ /  \\__|$$ |  $$ |$$ |      ');
  console.log('$$ |      $$ |  $$ |$$$$$$$  |$$$$$\\    $$ |$$$$\\ $$$$$$$  |$$$$$\\    ');
  console.log('$$ |      $$ |  $$ |$$  __$$< $$  __|   $$ |\\_$$ |$$  __$$< $$  __|   ');
  console.log('$$ |  $$\\ $$ |  $$ |$$ |  $$ |$$ |      $$ |  $$ |$$ |  $$ |$$ |      ');
  console.log('\\$$$$$$  | $$$$$$  |$$ |  $$ |$$$$$$$$\\ \\$$$$$$  |$$ |  $$ |$$$$$$$$\\ ');
  console.log(' \\______/  \\______/ \\__|  \\__|\\________| \\______/ \\__|  \\__|\\________|');
  console.log(C.reset + '');
}

app.prepare().then(() => {
  createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  }).listen(port, () => {
    printBanner();
    console.log(C.green + '='.repeat(70) + C.reset);
    success(`Frontend avviato sulla porta ${port}`);
    info(`URL:      http://localhost:${port}`);
    info(`Ambiente: ${process.env.NODE_ENV || 'development'}`);
    info(`Modalità: ${dev ? 'sviluppo (hot reload attivo)' : 'produzione (ottimizzato)'}`);
    console.log(C.green + '='.repeat(70) + C.reset + '\n');
  });
});
