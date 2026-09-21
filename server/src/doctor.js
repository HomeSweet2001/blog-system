/**
 * Diagnostico do ambiente local. Diz exatamente o que esta faltando
 * antes de voce tentar rodar a aplicacao.
 *
 * Uso: npm run doctor
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ENV_PATH } from './env.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_DIST = path.resolve(here, '../../client/dist');

const MIN_NODE = [20, 19, 0];
const results = [];

function ok(label, detail = '') {
  results.push({ status: 'ok', label, detail });
}
function warn(label, detail = '') {
  results.push({ status: 'warn', label, detail });
}
function fail(label, detail = '') {
  results.push({ status: 'fail', label, detail });
}

function checkNode() {
  const current = process.versions.node.split('.').map(Number);
  const enough =
    current[0] > MIN_NODE[0] ||
    (current[0] === MIN_NODE[0] && current[1] >= MIN_NODE[1]);

  if (enough) ok('Node.js', `v${process.versions.node}`);
  else
    fail(
      'Node.js',
      `v${process.versions.node} — e necessario 20.19 ou superior (recomendado 22.12+). ` +
        'Baixe em https://nodejs.org'
    );
}

function checkEnvFile() {
  if (fs.existsSync(ENV_PATH)) ok('Arquivo server/.env', 'encontrado');
  else fail('Arquivo server/.env', 'nao existe — rode:  npm run setup');
}

function describeDatabaseUrl(url) {
  try {
    const parsed = new URL(url);
    const db = parsed.pathname.replace(/^\//, '') || '(sem nome)';
    return `${parsed.hostname}:${parsed.port || 5432}/${db}  (usuario: ${parsed.username || 'nao informado'})`;
  } catch {
    return 'formato invalido';
  }
}

async function checkDatabase() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    fail('DATABASE_URL', 'nao definida em server/.env');
    return;
  }

  ok('DATABASE_URL', describeDatabaseUrl(url));

  let pool;
  try {
    const { pool: p } = await import('./db.js');
    pool = p;

    const esperadas = ['users', 'settings', 'categories', 'posts', 'blogs'];
    const { rows } = await pool.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = ANY($1::text[])`,
      [esperadas]
    );

    const found = rows.map((r) => r.table_name);
    if (found.length === esperadas.length) {
      ok('Conexao com o PostgreSQL', `conectado, ${found.length} tabelas encontradas`);
    } else if (found.length === 0) {
      warn('Tabelas do banco', 'nenhuma tabela criada ainda — rode:  npm run migrate');
    } else {
      const faltando = esperadas.filter((t) => !found.includes(t));
      warn('Tabelas do banco', `faltando: ${faltando.join(', ')} — rode:  npm run migrate`);
    }

    if (found.includes('users')) {
      const admin = await pool.query(
        'SELECT username FROM users ORDER BY id ASC LIMIT 1'
      );
      if (admin.rows.length) {
        ok('Usuario administrador', `"${admin.rows[0].username}"`);
      } else {
        warn('Usuario administrador', 'nenhum usuario criado — rode:  npm run migrate');
      }
    }

    if (found.includes('blogs')) {
      const blogs = await pool.query('SELECT id, slug, storage_folder FROM blogs ORDER BY id ASC');
      if (blogs.rows.length === 0) {
        warn('Blogs', 'nenhum blog criado — rode:  npm run migrate');
      } else {
        const lista = blogs.rows.map((b) => `/b/${b.slug}`).join(', ');
        ok('Blogs', `${blogs.rows.length} blog(s): ${lista}`);
      }
    }

    if (found.includes('posts') && found.includes('blogs')) {
      const counts = await pool.query(`
        SELECT
          (SELECT COUNT(*)::int FROM posts) AS posts,
          (SELECT COUNT(*)::int FROM categories) AS categories
      `);
      const { posts, categories } = counts.rows[0];
      ok('Conteudo atual', `${posts} publicacao(oes) e ${categories} categoria(s)`);
    }
  } catch (err) {
    const message = String(err.message || err);
    let hint = '';

    if (/ECONNREFUSED/.test(message)) {
      hint =
        'Nenhum PostgreSQL ouvindo nesse endereco. Suba o banco com "docker compose up -d" ' +
        'ou confira se o servico do PostgreSQL esta rodando.';
    } else if (/password authentication failed|role .* does not exist/.test(message)) {
      hint = 'Usuario ou senha errados na DATABASE_URL.';
    } else if (/database .* does not exist/.test(message)) {
      hint = 'O banco informado nao existe. Crie com: createdb blog';
    } else if (/getaddrinfo|ENOTFOUND/.test(message)) {
      hint = 'Nao consegui resolver o endereco do banco. Verifique a DATABASE_URL.';
    } else if (/SSL|self.signed|ECONNRESET/.test(message)) {
      hint = 'Problema de SSL. Adicione DATABASE_SSL=false no server/.env para bancos locais.';
    }

    fail('Conexao com o PostgreSQL', hint ? `${message}\n     → ${hint}` : message);
  }
}

async function checkStorage() {
  const { storageInfo } = await import('./storage.js');
  const info = storageInfo();
  const parts = [
    process.env.CLOUDINARY_CLOUD_NAME,
    process.env.CLOUDINARY_API_KEY,
    process.env.CLOUDINARY_API_SECRET,
  ];

  if (info.driver === 'cloudinary') {
    ok('Armazenamento de imagens', `Cloudinary (nuvem) — pasta base: ${info.baseFolder}`);
    return;
  }

  // Estamos salvando local. O motivo pode ser proposital ou um erro de configuracao.
  if (info.warning) {
    warn(
      'Armazenamento de imagens',
      `usando a PASTA LOCAL do servidor (${info.baseFolder}), mas ha um problema nas ` +
        `credenciais do Cloudinary: ${info.warning}`
    );
    return;
  }

  if (parts.every(Boolean)) {
    warn(
      'Armazenamento de imagens',
      `usando a PASTA LOCAL do servidor (${info.baseFolder}) porque STORAGE_DRIVER=local`
    );
    return;
  }

  ok(
    'Armazenamento de imagens',
    `pasta local do servidor — ${info.baseFolder}. Perfeito para testar; ao publicar no ` +
      'Render, configure o Cloudinary para as imagens nao serem perdidas a cada deploy'
  );
}

function checkClientBuild() {
  if (fs.existsSync(path.join(CLIENT_DIST, 'index.html')))
    ok('Build do front-end', 'client/dist existe');
  else
    warn(
      'Build do front-end',
      'client/dist ainda nao existe — use "npm run dev:client" para desenvolver, ' +
        'ou "npm run build" para testar em modo producao'
    );
}

function checkAdminPassword() {
  const pwd = process.env.ADMIN_PASSWORD;
  if (!pwd) {
    warn(
      'ADMIN_PASSWORD',
      'nao definida — a senha padrao "admin123" sera usada. Nao faca isso em producao!'
    );
  } else if (pwd.length < 6) {
    warn('ADMIN_PASSWORD', 'muito curta (menos de 6 caracteres)');
  } else {
    ok('ADMIN_PASSWORD', 'definida');
  }
}

async function main() {
  console.log('');
  console.log('  ╭──────────────────────────────────────────────╮');
  console.log('  │   Diagnostico do ambiente — Blog Platform    │');
  console.log('  ╰──────────────────────────────────────────────╯');
  console.log('');

  checkNode();
  checkEnvFile();
  checkAdminPassword();
  await checkDatabase();
  await checkStorage();
  checkClientBuild();

  const icons = { ok: '✔', warn: '!', fail: '✖' };
  const labels = { ok: 'OK  ', warn: 'AVISO', fail: 'ERRO ' };

  for (const r of results) {
    const detail = r.detail ? `\n       ${r.detail}` : '';
    console.log(`  ${icons[r.status]} ${labels[r.status]}  ${r.label}${detail}`);
  }

  const failures = results.filter((r) => r.status === 'fail').length;
  const warnings = results.filter((r) => r.status === 'warn').length;

  console.log('');
  console.log('  ──────────────────────────────────────────────');

  if (failures === 0 && warnings === 0) {
    console.log('  Tudo pronto! Suba a aplicacao com:');
    console.log('    npm run dev:server     (terminal 1)');
    console.log('    npm run dev:client     (terminal 2)');
  } else if (failures === 0) {
    console.log('  Nenhum erro bloqueante (ha avisos acima). Voce pode seguir:');
    console.log('    npm run migrate        (se as tabelas ainda nao existem)');
    console.log('    npm run dev:server     (terminal 1)');
    console.log('    npm run dev:client     (terminal 2)');
  } else {
    console.log('  Corrija os ERROS acima antes de continuar.');
  }

  console.log('');

  // Encerra o pool para o processo poder terminar.
  try {
    const { pool } = await import('./db.js');
    await pool.end();
  } catch {
    /* ignore */
  }

  process.exit(failures > 0 ? 1 : 0);
}

main();
