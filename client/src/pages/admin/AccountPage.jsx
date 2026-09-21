import { useEffect, useState } from 'react';
import { KeyRound, Save, ShieldCheck, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { setPageTitle } from '../../lib/theme.js';
import { Alert, Spinner } from '../../components/ui/Feedback.jsx';

export default function AccountPage() {
  const { user, updateCredentials } = useAuth();

  const [username, setUsername] = useState(user?.username || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    setPageTitle('Minha conta');
  }, []);

  useEffect(() => {
    setUsername(user?.username || '');
  }, [user]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword && newPassword !== confirmPassword) {
      setError('A confirmacao da nova senha nao confere.');
      return;
    }
    if (newPassword && newPassword.length < 6) {
      setError('A nova senha deve ter ao menos 6 caracteres.');
      return;
    }
    if (!currentPassword) {
      setError('Informe a senha atual para confirmar as alteracoes.');
      return;
    }

    setSaving(true);
    try {
      await updateCredentials({
        username: username.trim(),
        currentPassword,
        newPassword: newPassword || undefined,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess('Credenciais atualizadas com sucesso!');
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="font-heading text-2xl font-black">Minha conta</h1>
        <p className="mt-1 text-sm opacity-70">
          Este blog possui um unico usuario administrador. Altere aqui o nome de usuario e a senha.
        </p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <form onSubmit={handleSubmit} className="card space-y-5 p-5 sm:p-6">
        <div className="flex items-center gap-3 border-b pb-4" style={{ borderColor: 'var(--c-border)' }}>
          <span
            className="flex h-11 w-11 items-center justify-center rounded-full text-lg font-black text-white"
            style={{ background: 'var(--c-primary)' }}
          >
            {(user?.username || 'A').charAt(0).toUpperCase()}
          </span>
          <div>
            <p className="font-bold">{user?.username}</p>
            <p className="inline-flex items-center gap-1.5 text-xs opacity-65">
              <ShieldCheck className="h-3.5 w-3.5" /> Administrador
            </p>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="username">
            <span className="inline-flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" /> Nome de usuario
            </span>
          </label>
          <input
            id="username"
            className="input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            minLength={3}
            required
          />
        </div>

        <div className="border-t pt-5" style={{ borderColor: 'var(--c-border)' }}>
          <h2 className="mb-4 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide opacity-70">
            <KeyRound className="h-4 w-4" /> Alterar senha
          </h2>

          <div className="space-y-4">
            <div>
              <label className="label" htmlFor="currentPassword">
                Senha atual (obrigatoria)
              </label>
              <input
                id="currentPassword"
                type="password"
                className="input"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="newPassword">
                  Nova senha
                </label>
                <input
                  id="newPassword"
                  type="password"
                  className="input"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Deixe vazio para manter"
                />
              </div>
              <div>
                <label className="label" htmlFor="confirmPassword">
                  Confirmar nova senha
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  className="input"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end border-t pt-5" style={{ borderColor: 'var(--c-border)' }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            Salvar alteracoes
          </button>
        </div>
      </form>

      <div className="card p-5 text-sm opacity-75">
        <p className="font-semibold">Dica de seguranca</p>
        <p className="mt-1">
          A senha inicial e definida pela variavel de ambiente <code>ADMIN_PASSWORD</code> no Render.
          Alteracoes feitas aqui sao preservadas nos reinicios do servidor. Para forcar o servidor a
          reaplicar a senha do ambiente, defina <code>ADMIN_PASSWORD_SYNC=true</code>.
        </p>
      </div>
    </div>
  );
}
