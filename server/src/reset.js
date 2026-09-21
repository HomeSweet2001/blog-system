/**
 * Recria o banco do zero (APAGA todos os dados e roda as migracoes de novo).
 * Util para testar o fluxo de instalacao ou comecar limpo.
 *
 * Uso:        npm run db:reset-hard
 * Automatico: npm run db:reset-hard -- --yes
 *
 * Nunca executa com NODE_ENV=production.
 */
import './env.js';
import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { pool } from './db.js';
import { runMigrations } from './migrate.js';

async function confirm() {
  if (process.argv.includes('--yes')) return true;

  const rl = readline.createInterface({ input: stdin, output: stdout });
  const answer = await rl.question(
    '\n  Isto vai APAGAR todos os posts, categorias e configuracoes do banco.\n' +
      '  Digite APAGAR para confirmar: '
  );
  rl.close();

  return answer.trim() === 'APAGAR';
}

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('\n  Bloqueado: este comando nao roda com NODE_ENV=production.\n');
    process.exit(1);
  }

  if (!process.env.DATABASE_URL) {
    console.error('\n  DATABASE_URL nao definida em server/.env. Rode: npm run setup\n');
    process.exit(1);
  }

  if (!(await confirm())) {
    console.log('\n  Cancelado. Nada foi alterado.\n');
    return;
  }

  console.log('\n  Removendo tabelas...');
  await pool.query(`
    DROP TABLE IF EXISTS posts CASCADE;
    DROP TABLE IF EXISTS categories CASCADE;
    DROP TABLE IF EXISTS settings CASCADE;
    DROP TABLE IF EXISTS blogs CASCADE;
    DROP TABLE IF EXISTS users CASCADE;
    DROP TABLE IF EXISTS schema_migrations CASCADE;
    DROP SEQUENCE IF EXISTS settings_id_seq CASCADE;
  `);

  console.log('  Recriando schema e dados iniciais...\n');
  // Reutiliza o MESMO pool (importar ./db.js de novo devolveria o modulo em cache).
  await runMigrations();

  console.log('\n  ✔ Banco recriado. Rode `npm run doctor` para conferir.\n');
}

main()
  .catch((err) => {
    console.error('\n  Falhou:', err.message, '\n');
    process.exitCode = 1;
  })
  .finally(() => pool.end());
