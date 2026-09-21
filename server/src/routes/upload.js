import { Router } from 'express';
import multer from 'multer';
import { saveFile, storageInfo, blogFolder, FOLDER_TYPES, FOLDER_TYPES as TYPES } from '../storage.js';
import { explainCloudinaryError } from '../cloudinary.js';

const router = Router();

const MAX_MB = 8;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(png|jpe?g|gif|webp|svg\+xml|avif)$/.test(file.mimetype)) {
      return cb(null, true);
    }
    return cb(new Error('Formato invalido. Envie PNG, JPG, GIF, WEBP, AVIF ou SVG.'));
  },
});

/** Normaliza o tipo de pasta enviado pelo cliente. */
function resolveType(value) {
  const type = String(value || 'uploads')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '');
  return TYPES.includes(type) ? type : 'uploads';
}

/**
 * GET /api/admin/blogs/:blogId/upload/status
 * Informa ONDE as imagens deste blog estao sendo guardadas.
 */
router.get('/status', (req, res) => {
  const info = storageInfo(req.blog.storage_folder);

  res.json({
    ...info,
    maxSizeMb: MAX_MB,
    folders: Object.fromEntries(
      FOLDER_TYPES.map((type) => [type, blogFolder(req.blog.storage_folder, type)])
    ),
  });
});

/**
 * POST /api/admin/blogs/:blogId/upload
 * multipart/form-data, campo "file".
 * Campo opcional "folder": logo | favicon | banner | posts | uploads
 */
router.post('/', (req, res, next) => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      const message =
        err.code === 'LIMIT_FILE_SIZE'
          ? `Arquivo maior que o limite de ${MAX_MB}MB.`
          : err.message;
      return res.status(400).json({ error: message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado (campo "file").' });
    }

    try {
      const type = resolveType(req.body?.folder);
      const result = await saveFile(req.file.buffer, {
        storageFolder: req.blog.storage_folder,
        type,
        mimeType: req.file.mimetype,
      });

      return res.status(201).json({ ...result, type, storageFolder: req.blog.storage_folder });
    } catch (uploadError) {
      console.error('[upload] falha ao salvar a imagem:', uploadError.message);

      const hint = explainCloudinaryError(uploadError.message);
      return res.status(502).json({
        error: hint
          ? `Falha ao enviar a imagem: ${hint}`
          : `Falha ao enviar a imagem: ${uploadError.message}`,
      });
    }
  });
});

export default router;
