import { v2 as cloudinary } from 'cloudinary';

/**
 * Implementacao do destino "cloudinary".
 * A escolha entre nuvem e pasta local fica em storage.js.
 */

/**
 * Valores de exemplo que costumam ser colados por engano no .env.
 * Se algum deles aparecer, tratamos o Cloudinary como NAO configurado
 * (em vez de deixar o servico falhar com "Unknown API key").
 */
const PLACEHOLDER_RE =
  /^(seu_|sua_|your_|my_|meu_|minha_|xxx+$|changeme|troque|todo|placeholder|example|exemplo|insira|coloque|<.+>)/i;

function readCredentials() {
  return {
    cloud: String(process.env.CLOUDINARY_CLOUD_NAME || '').trim(),
    key: String(process.env.CLOUDINARY_API_KEY || '').trim(),
    secret: String(process.env.CLOUDINARY_API_SECRET || '').trim(),
  };
}

/**
 * Explica o que esta errado nas credenciais (ou null quando esta tudo certo
 * ou quando simplesmente nao foram preenchidas).
 *
 * @returns {string|null}
 */
export function cloudinaryIssue() {
  const { cloud, key, secret } = readCredentials();
  const filled = [cloud, key, secret].filter(Boolean);

  if (filled.length === 0) return null; // nao preenchido -> usa pasta local, tudo certo

  if (filled.length < 3) {
    return 'configuracao incompleta: preencha as 3 variaveis (CLOUDINARY_CLOUD_NAME, API_KEY e API_SECRET) ou deixe todas vazias para usar a pasta local';
  }

  const placeholders = [cloud, key, secret].filter((v) => PLACEHOLDER_RE.test(v));
  if (placeholders.length) {
    return `as credenciais ainda sao os valores de exemplo do .env.example (${placeholders.join(', ')}). Preencha com os dados reais ou deixe as 3 linhas VAZIAS para salvar localmente`;
  }

  return null;
}

/** Cloudinary utilizavel? (preenchido, completo e sem valores de exemplo) */
export function isCloudinaryReady() {
  const { cloud, key, secret } = readCredentials();

  if (!cloud || !key || !secret) return false;
  if ([cloud, key, secret].some((v) => PLACEHOLDER_RE.test(v))) return false;

  return true;
}

const configured = isCloudinaryReady();

if (configured) {
  const { cloud, key, secret } = readCredentials();
  cloudinary.config({ cloud_name: cloud, api_key: key, api_secret: secret, secure: true });
} else {
  const issue = cloudinaryIssue();
  if (issue) {
    console.warn(`[cloudinary] ${issue}`);
    console.warn('[cloudinary] as imagens serao salvas na pasta local do servidor.');
  }
}

/** Traduz erros comuns do Cloudinary em algo acionavel. */
export function explainCloudinaryError(message) {
  const text = String(message || '');

  if (/unknown api key/i.test(text)) {
    return 'a API Key informada nao existe. Confira em Console > Settings > API Keys (ou deixe as 3 linhas CLOUDINARY_* vazias para salvar localmente).';
  }
  if (/invalid signature/i.test(text)) {
    return 'a API Secret nao confere com a API Key. Copie os dois valores novamente do Console.';
  }
  if (/unknown cloud|cloud_name/i.test(text) && /invalid|unknown/i.test(text)) {
    return 'o Cloud Name nao existe. Copie novamente do Console (Dashboard > Product Environment).';
  }
  if (/invalid credentials|401|403/i.test(text)) {
    return 'credenciais recusadas pelo Cloudinary. Revise as 3 variaveis CLOUDINARY_*.';
  }

  return null;
}

/**
 * Envia um Buffer (vindo do multer.memoryStorage) para o Cloudinary.
 *
 * @param {Buffer} buffer
 * @param {string} folder caminho completo da pasta (ex.: blog-platform/meu-blog/posts)
 */
export function uploadBuffer(buffer, folder) {
  if (!configured) {
    return Promise.reject(
      new Error('Cloudinary nao configurado. Defina as variaveis CLOUDINARY_* no ambiente.')
    );
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        transformation: [{ quality: 'auto', fetch_format: 'auto' }],
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          folder: result.folder || folder,
          width: result.width,
          height: result.height,
          format: result.format,
          bytes: result.bytes,
        });
      }
    );
    stream.end(buffer);
  });
}

export async function destroyAsset(publicId) {
  if (!configured || !publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.warn('[cloudinary] falha ao remover asset:', err.message);
  }
}

/**
 * Remove uma pasta inteira (com subpastas e imagens) do Cloudinary.
 * Operacao destrutiva: so deve rodar quando o administrador pedir explicitamente.
 *
 * @param {string} root caminho da pasta (ex.: blog-platform/meu-blog)
 */
export async function destroyFolder(root) {
  if (!configured) return { deleted: 0, errors: ['Cloudinary nao configurado.'] };

  let deleted = 0;
  const errors = [];

  const collect = async (prefix) => {
    const folders = [];
    try {
      const res = await cloudinary.api.sub_folders(prefix);
      for (const f of res.folders || []) folders.push(f.path);
    } catch (err) {
      errors.push(`${prefix}: ${err.message}`);
    }
    return folders;
  };

  const direct = await collect(root);
  const allFolders = [...direct];

  for (const sub of direct) {
    allFolders.push(...(await collect(sub)));
  }

  // Do mais profundo para o mais raso
  for (const folder of [...allFolders].reverse()) {
    try {
      const res = await cloudinary.api.delete_resources_by_prefix(folder);
      deleted += Object.keys(res.deleted || {}).length;
    } catch (err) {
      errors.push(`${folder}: ${err.message}`);
    }
    try {
      await cloudinary.api.delete_folder(folder);
    } catch (err) {
      errors.push(`${folder}: ${err.message}`);
    }
  }

  try {
    const res = await cloudinary.api.delete_resources_by_prefix(root);
    deleted += Object.keys(res.deleted || {}).length;
  } catch (err) {
    errors.push(`${root}: ${err.message}`);
  }

  try {
    await cloudinary.api.delete_folder(root);
  } catch {
    // Normal quando a pasta ja esta vazia ou nao existe
  }

  return { deleted, errors };
}
