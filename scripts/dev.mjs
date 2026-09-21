/**
 * Sobe o back-end e o front-end ao mesmo tempo, com a saida identificada por cor.
 * Sem dependencias externas — funciona igual em Windows, macOS e Linux.
 *
 * Os processos sao iniciados DIRETAMENTE (sem `npm` no meio), o que deixa a
 * arvore rasa e garante que Ctrl+C encerre tudo de verdade.
 *
 * Uso: npm run dev
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const serverDir = path.join(root, 'server');
const clientDir = path.join(root, 'client');

const isWindows = process.platform === 'win32';

const C = {
  server: '\x1b[36m', // ciano
  client: '\x1b[35m', // magenta
  reset: '\x1b[0m',
  dim: '\x1b[2m',
};

const children = [];
let shuttingDown = false;

/** Caminho do binario do Vite dentro do client. */
function resolveViteBin() {
  const candidates = [
    path.join(clientDir, 'node_modules', 'vite', 'bin', 'vite.js'),
    path.join(root, 'node_modules', 'vite', 'bin', 'vite.js'),
  ];
  return candidates.find((p) => fs.existsSync(p)) || null;
}

function prefixStream(stream, label, color, out) {
  let buffer = '';
  stream.on('data', (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      out.write(`${color}${label.padEnd(6)}${C.reset} ${C.dim}│${C.reset} ${line}\n`);
    }
  });
}

/** Encerra o processo e toda a sua arvore. */
function killTree(child) {
  if (!child || child.exitCode !== null) return;

  try {
    if (isWindows) {
      spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    } else {
      // Os filhos rodam em grupo proprio (detached), entao o sinal negativo
      // atinge o grupo inteiro — inclusive netos (esbuild, etc).
      process.kill(-child.pid, 'SIGTERM');
    }
  } catch {
    try {
      child.kill('SIGTERM');
    } catch {
      /* ignore */
    }
  }
}

function start({ name, color, command, args, cwd }) {
  const child = spawn(command, args, {
    cwd,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: !isWindows, // novo grupo de processos -> facilita matar a arvore
  });

  prefixStream(child.stdout, name, color, process.stdout);
  prefixStream(child.stderr, name, color, process.stderr);

  child.on('exit', (code) => {
    if (shuttingDown) return;
    console.log(
      `\n${color}${name}${C.reset} finalizou (codigo ${code}). Encerrando o outro processo...`
    );
    shutdown(code ?? 0);
  });

  child.on('error', (err) => {
    console.error(`${color}${name}${C.reset} nao pode ser iniciado: ${err.message}`);
  });

  children.push(child);
  return child;
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const child of children) killTree(child);

  // Se algo resistir, forca a saida depois de meio segundo.
  setTimeout(() => process.exit(code), 500);
}

process.on('SIGINT', () => {
  console.log('\n  Encerrando...');
  shutdown(0);
});
process.on('SIGTERM', () => shutdown(0));

console.log('');
console.log('  ╭──────────────────────────────────────────────────────╮');
console.log('  │   Blog Platform — ambiente de desenvolvimento        │');
console.log('  ╰──────────────────────────────────────────────────────╯');
console.log('');
console.log(`  ${C.server}server${C.reset}  API        http://localhost:4000/api`);
console.log(`  ${C.client}client${C.reset}  Blog       http://localhost:5173`);
console.log(`  ${C.client}client${C.reset}  Painel     http://localhost:5173/admin`);
console.log('');
console.log('  Ctrl+C encerra os dois processos.');
console.log('');

// ------------------------------- back-end ---------------------------------
start({
  name: 'server',
  color: C.server,
  command: process.execPath,
  args: ['--watch', 'src/index.js'],
  cwd: serverDir,
});

// ------------------------------- front-end --------------------------------
const viteBin = resolveViteBin();
if (viteBin) {
  start({
    name: 'client',
    color: C.client,
    command: process.execPath,
    args: [viteBin],
    cwd: clientDir,
  });
} else {
  console.log(
    `  ${C.client}client${C.reset}  Vite nao encontrado em client/node_modules — rode "npm run install:all".`
  );
}
