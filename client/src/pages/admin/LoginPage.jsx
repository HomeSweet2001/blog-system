import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { KeyRound, Lock, LogIn, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { Alert, Spinner } from '../../components/ui/Feedback.jsx';
import { setPageTitle } from '../../lib/theme.js';

export default function LoginPage() {
  const { login, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setPageTitle('Entrar no painel');
  }, []);

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate(location.state?.from || '/admin', { replace: true });
    }
  }, [isAuthenticated, loading, navigate, location.state]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(username.trim(), password);
      navigate(location.state?.from || '/admin', { replace: true });
    } catch (err) {
      setError(err.message || 'Nao foi possivel entrar.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(140deg, var(--c-primary), var(--c-secondary))' }}
      />
      <div className="absolute inset-0 opacity-20" style={{ background: 'radial-gradient(circle at 20% 20%, #fff, transparent 45%)' }} />

      <div className="relative w-full max-w-md">
        <div className="mb-6 text-center text-white">
          <h1 className="font-heading text-2xl font-black">Blog Platform</h1>
          <p className="mt-1 text-sm opacity-80">Painel administrativo</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="card space-y-4 p-6 shadow-2xl sm:p-8"
          style={{ background: 'var(--c-bg)' }}
        >
          <div className="flex items-center gap-2 text-sm font-bold">
            <KeyRound className="h-4 w-4" style={{ color: 'var(--c-primary)' }} />
            Acesso restrito
          </div>

          <div>
            <label className="label" htmlFor="username">
              Usuario
            </label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-40" />
              <input
                id="username"
                className="input pl-9"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                required
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="password">
              Senha
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-40" />
              <input
                id="password"
                type="password"
                className="input pl-9"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {error && <Alert variant="error">{error}</Alert>}

          <button type="submit" className="btn btn-primary w-full" disabled={busy}>
            {busy ? <Spinner className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
            {busy ? 'Entrando...' : 'Entrar'}
          </button>

          <p className="text-center text-xs opacity-60">
            Credenciais definidas nas variaveis ADMIN_USERNAME e ADMIN_PASSWORD do servidor.
          </p>
        </form>
      </div>
    </div>
  );
}
