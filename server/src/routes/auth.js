import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { one, query } from '../db.js';
import { signToken, requireAuth } from '../auth.js';

const router = Router();

const USERNAME_MIN = 3;
const PASSWORD_MIN = 6;

/** POST /api/auth/login */
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({ error: 'Informe usuario e senha.' });
    }

    const user = await one('SELECT * FROM users WHERE username = $1', [String(username).trim()]);

    if (!user) {
      return res.status(401).json({ error: 'Usuario ou senha invalidos.' });
    }

    const ok = await bcrypt.compare(String(password), user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Usuario ou senha invalidos.' });
    }

    const token = signToken(user);
    return res.json({
      token,
      user: { id: user.id, username: user.username },
    });
  } catch (err) {
    return next(err);
  }
});

/** GET /api/auth/me */
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await one('SELECT id, username, created_at FROM users WHERE id = $1', [req.user.sub]);
    if (!user) return res.status(401).json({ error: 'Usuario nao encontrado.' });
    return res.json({ user });
  } catch (err) {
    return next(err);
  }
});

/** PUT /api/auth/credentials  -> troca usuario e/ou senha do administrador */
router.put('/credentials', requireAuth, async (req, res, next) => {
  try {
    const { username, currentPassword, newPassword } = req.body || {};

    const user = await one('SELECT * FROM users WHERE id = $1', [req.user.sub]);
    if (!user) return res.status(404).json({ error: 'Usuario nao encontrado.' });

    const ok = await bcrypt.compare(String(currentPassword || ''), user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Senha atual incorreta.' });

    const nextUsername = (username || user.username).trim();
    if (nextUsername.length < USERNAME_MIN) {
      return res.status(400).json({ error: `O usuario deve ter ao menos ${USERNAME_MIN} caracteres.` });
    }

    let hash = user.password_hash;
    if (newPassword) {
      if (String(newPassword).length < PASSWORD_MIN) {
        return res.status(400).json({ error: `A senha deve ter ao menos ${PASSWORD_MIN} caracteres.` });
      }
      hash = await bcrypt.hash(String(newPassword), 10);
    }

    await query('UPDATE users SET username = $1, password_hash = $2 WHERE id = $3', [
      nextUsername,
      hash,
      user.id,
    ]);

    const updated = { id: user.id, username: nextUsername };
    return res.json({ user: updated, token: signToken(updated) });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Este usuario ja esta em uso.' });
    }
    return next(err);
  }
});

export default router;
