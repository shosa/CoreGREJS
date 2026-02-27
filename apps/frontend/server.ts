import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';

const port = parseInt(process.env.PORT || '3010', 10);
const hostname = process.env.HOSTNAME || '0.0.0.0';
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev, port, hostname });
const handle = app.getRequestHandler();

// ─── Colori ANSI ──────────────────────────────────────────────────────────────
const C = {
  reset:  '\x1b[0m',
  cyan:   '\x1b[36m',
  green:  '\x1b[32m',
};

function ts(): string {
  return new Date().toLocaleString('it-IT', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

const info    = (msg: string) => console.log(`${C.cyan}[${ts()}] [CoreGRE] [INFO] ${msg}${C.reset}`);
const success = (msg: string) => console.log(`${C.green}[${ts()}] [CoreGRE] [OK]   ${msg}${C.reset}`);

function printBanner() {
  const b = C.cyan;
  const r = C.reset;
  console.log(b + ' $$$$$$\\   $$$$$$\\  $$$$$$$\\  $$$$$$$$\\  $$$$$$\\  $$$$$$$\\  $$$$$$$$\\ ' + r);
  console.log(b + '$$  __$$\\ $$  __$$\\ $$  __$$\\ $$  _____|$$  __$$\\ $$  __$$\\ $$  _____|' + r);
  console.log(b + '$$ /  \\__|$$ /  $$ |$$ |  $$ |$$ |      $$ /  \\__|$$ |  $$ |$$ |      ' + r);
  console.log(b + '$$ |      $$ |  $$ |$$$$$$$  |$$$$$\\    $$ |$$$$\\ $$$$$$$  |$$$$$\\    ' + r);
  console.log(b + '$$ |      $$ |  $$ |$$  __$$< $$  __|   $$ |\\_$$ |$$  __$$< $$  __|   ' + r);
  console.log(b + '$$ |  $$\\ $$ |  $$ |$$ |  $$ |$$ |      $$ |  $$ |$$ |  $$ |$$ |      ' + r);
  console.log(b + '\\$$$$$$  | $$$$$$  |$$ |  $$ |$$$$$$$$\\ \\$$$$$$  |$$ |  $$ |$$$$$$$$\\ ' + r);
  console.log(b + ' \\______/  \\______/ \\__|  \\__|\\________| \\______/ \\__|  \\__|\\________| ' + r);
  console.log('');
}

app.prepare().then(() => {
  createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  }).listen(port, hostname, () => {
    printBanner();
    console.log(C.green + '='.repeat(72) + C.reset);
    success(`Frontend avviato`);
    info(`URL:      http://localhost:${port}`);
    info(`Network:  http://${hostname}:${port}`);
    info(`Ambiente: ${process.env.NODE_ENV || 'development'}`);
    info(`Modalità: ${dev ? 'sviluppo' : 'produzione (standalone)'}`);
    console.log(C.green + '='.repeat(72) + C.reset + '\n');
  });
});
