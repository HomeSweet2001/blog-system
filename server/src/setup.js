/**
 * Cria o arquivo server/.env a partir do .env.example, gerando um JWT_SECRET
 * aleatorio. Cross-platform (funciona igual no Windows, macOS e Linux).
 *
 * Uso: npm run setup
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import { ENV_PATH, ENV_EXAMPLE_PATH } from './env.js';

function main() {
  if (fs.existsSync(ENV_PATH)) {
    console.log('');
    console.log('  O arquivo server/.env ja existe — nada foi alterado.');
    console.log('  Para recriar do zero, apague o arquivo e rode `npm run setup` novamente.');
    console.log('');
    return;
  }

  if (!fs.existsSync(ENV_EXAMPLE_PATH)) {
    console.error('  Nao encontrei server/.env.example. Baixe o projeto novamente.');
    process.exit(1);
  }

  const secret = crypto.randomBytes(48).toString('hex');
  let content = fs.readFileSync(ENV_EXAMPLE_PATH, 'utf8');

  // Substitui a linha do JWT_SECRET por uma chave aleatoria real.
  content = content.replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${secret}`);

  fs.writeFileSync(ENV_PATH, content, { mode: 0o600 });

  console.log('');
  console.log('  ✔ server/.env criado com um JWT_SECRET aleatorio.');
  console.log('');
  console.log('  Agora confira a linha DATABASE_URL dentro de server/.env:');
  console.log('    - Docker          -> postgresql://blog:blog@localhost:5432/blog  (ja vem assim)');
  console.log('    - Postgres local  -> ajuste usuario/senha/porta');
  console.log('    - Neon/Supabase   -> cole a connection string completa');
  console.log('');
  console.log('  Depois rode:  npm run doctor');
  console.log('');
}

main();
