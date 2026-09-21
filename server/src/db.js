import pg from 'pg';

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || '';

function resolveSsl() {
  if (process.env.DATABASE_SSL === 'false') return false;
  if (!connectionString) return false;
  const isLocal = /@(localhost|127\.0\.0\.1)/.test(connectionString);
  if (isLocal) return false;
  // Render (e a maioria dos bancos gerenciados) exige SSL na conexao externa.
  return { rejectUnauthorized: false };
}

export const pool = new Pool({
  connectionString,
  ssl: resolveSsl(),
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 15_000,
});

pool.on('error', (err) => {
  console.error('[db] erro inesperado no pool de conexoes:', err.message);
});

export function query(text, params) {
  return pool.query(text, params);
}

/** Retorna a unica linha (ou null). */
export async function one(text, params) {
  const { rows } = await pool.query(text, params);
  return rows[0] ?? null;
}

/** Retorna todas as linhas. */
export async function many(text, params) {
  const { rows } = await pool.query(text, params);
  return rows;
}

export async function closePool() {
  await pool.end();
}
