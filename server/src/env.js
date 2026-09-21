/**
 * Carrega as variaveis de ambiente SEMPRE de server/.env,
 * independentemente do diretorio de onde o comando foi executado.
 *
 * Isso resolve o caso de rodar `npm run migrate` / `npm start` a partir da
 * raiz do projeto (onde o cwd nao e o da pasta server/).
 *
 * Importante: por padrao o dotenv NAO sobrescreve variaveis que ja existem no
 * ambiente. No Render nao existe arquivo .env e as variaveis da plataforma
 * continuam tendo prioridade.
 */
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(here, '../.env') });

/** Caminho absoluto do arquivo .env esperado. */
export const ENV_PATH = path.resolve(here, '../.env');
export const ENV_EXAMPLE_PATH = path.resolve(here, '../.env.example');
