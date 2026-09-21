/**
 * Camada de armazenamento de imagens.
 *
 * Existem dois destinos possiveis:
 *
 *   cloudinary -> nuvem (necessario em producao, porque o Render nao tem disco)
 *   local      -> pasta no proprio servidor (server/uploads) — ideal para testes
 *
 * O destino e escolhido automaticamente:
 *   - se as chaves CLOUDINARY_* estiverem preenchidas -> cloudinary
 *   - senao                                          -> local
 *
 * Isso permite testar tudo localmente sem criar conta em nenhum servico, e
 * migrar para a nuvem depois apenas preenchendo o .env.
 *
 * Para forcar um destino, use STORAGE_DRIVER=local ou STORAGE_DRIVER=cloudinary.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

import {
  isCloudinaryReady,
  cloudinaryIssue,
  uploadBuffer as cloudinaryUpload,
  destroyFolder as cloudinaryDestroyFolder,
} from './cloudinary.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_UPLOADS_DIR = path.resolve(here, '../uploads');

/** Subpastas que cada blog possui. */
export const FOLDER_TYPES = ['logo', 'favicon', 'banner', 'posts', 'uploads'];

/** Extensao derivada do mimetype VALIDADO (nunca do nome enviado pelo usuario). */
const EXTENSION_BY_MIME = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/avif': '.avif',
  'image/svg+xml': '.svg',
};

/** Remove qualquer coisa que possa escapar da pasta (barras, .., etc). */
function sanitizeFolderName(value, fallback = 'geral') {
  const clean = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '');
  return clean || fallback;
}

export function localUploadsDir() {
  return process.env.UPLOADS_DIR ? path.resolve(process.env.UPLOADS_DIR) : DEFAULT_UPLOADS_DIR;
}

export function cloudinaryBaseFolder() {
  return (
    String(process.env.CLOUDINARY_FOLDER || 'blog-platform')
      .trim()
      .replace(/[^a-z0-9-_]/gi, '') || 'blog-platform'
  );
}

/** Destino ativo: 'cloudinary' ou 'local'. */
export function storageDriver() {
  const mode = String(process.env.STORAGE_DRIVER || 'auto').toLowerCase();
  if (mode === 'local') return 'local';
  if (mode === 'cloudinary') return 'cloudinary';
  return isCloudinaryReady() ? 'cloudinary' : 'local';
}

/** Caminho da pasta de um blog no destino ativo (para exibir no painel). */
export function blogFolder(storageFolder, type = 'uploads') {
  const blog = sanitizeFolderName(storageFolder, 'sem-pasta');
  const kind = FOLDER_TYPES.includes(type) ? type : 'uploads';

  if (storageDriver() === 'cloudinary') {
    return `${cloudinaryBaseFolder()}/${blog}/${kind}`;
  }

  // Caminho relativo amigavel dentro de server/uploads
  return `uploads/${blog}/${kind}`;
}

/** Pasta raiz de um blog no destino ativo (sem o tipo). Ex.: uploads/meu-blog */
export function blogRootFolder(storageFolder) {
  const blog = sanitizeFolderName(storageFolder, 'sem-pasta');
  return storageDriver() === 'cloudinary'
    ? `${cloudinaryBaseFolder()}/${blog}`
    : `uploads/${blog}`;
}

/** Caminho absoluto da pasta local de um blog/tipo. */
export function localFolderPath(storageFolder, type = 'uploads') {
  const blog = sanitizeFolderName(storageFolder, 'sem-pasta');
  const kind = FOLDER_TYPES.includes(type) ? type : 'uploads';
  return path.join(localUploadsDir(), blog, kind);
}

/** Resumo do destino ativo — usado pelo painel e pelo `npm run doctor`. */
export function storageInfo(storageFolder = '') {
  const driver = storageDriver();
  const safeBlog = sanitizeFolderName(storageFolder, 'sem-pasta');

  // Mostra um caminho curto e legivel (ex.: "server/uploads") em vez do absoluto.
  const projectRoot = path.resolve(here, '../..');
  const displayRoot =
    driver === 'cloudinary'
      ? cloudinaryBaseFolder()
      : path.relative(projectRoot, localUploadsDir()) || localUploadsDir();

  const issue = cloudinaryIssue();

  return {
    driver,
    ready: driver === 'local' ? true : isCloudinaryReady(),
    label: driver === 'cloudinary' ? 'Cloudinary (nuvem)' : 'Pasta local do servidor',
    // Aviso sobre credenciais do Cloudinary (ex.: valores de exemplo colados)
    warning: issue,
    baseFolder: displayRoot,
    blogFolder: storageFolder ? blogRootFolder(storageFolder) : displayRoot,
    storageFolder: safeBlog,
    persistent: driver === 'cloudinary',
    folders: Object.fromEntries(
      FOLDER_TYPES.map((type) => [type, blogFolder(storageFolder, type)])
    ),
  };
}

/**
 * Salva uma imagem no destino ativo.
 *
 * @param {Buffer} buffer
 * @param {{storageFolder: string, type: string, mimeType: string}} options
 * @returns {Promise<{url:string, driver:string, folder:string, publicId:string|null, bytes:number}>}
 */
export async function saveFile(buffer, { storageFolder, type, mimeType }) {
  const kind = FOLDER_TYPES.includes(type) ? type : 'uploads';
  const driver = storageDriver();

  if (driver === 'cloudinary') {
    const folder = `${cloudinaryBaseFolder()}/${sanitizeFolderName(storageFolder, 'sem-pasta')}/${kind}`;
    const result = await cloudinaryUpload(buffer, folder);

    return {
      url: result.url,
      driver: 'cloudinary',
      folder: result.folder || folder,
      publicId: result.publicId,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
    };
  }

  // -------- local --------
  const dir = localFolderPath(storageFolder, kind);
  await fs.mkdir(dir, { recursive: true });

  const extension = EXTENSION_BY_MIME[String(mimeType || '').toLowerCase()] || '.bin';
  const filename = `${Date.now().toString(36)}-${crypto.randomBytes(8).toString('hex')}${extension}`;
  const fullPath = path.join(dir, filename);

  await fs.writeFile(fullPath, buffer);

  const blog = sanitizeFolderName(storageFolder, 'sem-pasta');

  return {
    url: `/uploads/${blog}/${kind}/${filename}`,
    driver: 'local',
    folder: `uploads/${blog}/${kind}`,
    publicId: null,
    bytes: buffer.length,
  };
}

/** Remove TODAS as imagens de um blog (usado ao excluir o blog). */
export async function deleteBlogStorage(storageFolder) {
  const blog = sanitizeFolderName(storageFolder, 'sem-pasta');

  if (storageDriver() === 'cloudinary') {
    return cloudinaryDestroyFolder(`${cloudinaryBaseFolder()}/${blog}`);
  }

  const dir = path.join(localUploadsDir(), blog);
  try {
    await fs.rm(dir, { recursive: true, force: true });
    return { deleted: 0, errors: [], folderRemoved: dir };
  } catch (err) {
    return { deleted: 0, errors: [`${dir}: ${err.message}`] };
  }
}
