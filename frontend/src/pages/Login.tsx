import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiErrorMessage } from "../api/client";
import { Button } from "../components/ui/Button";
import { AuthBrandPanel } from "../components/AuthBrandPanel";

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(apiErrorMessage(err, "Impossible de se connecter"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <AuthBrandPanel />

      <div className="flex items-center justify-center bg-slate-50 p-6">
        <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-card">
          <h1 className="mb-1 text-xl font-bold text-slate-900">Connexion</h1>
          <p className="mb-6 text-sm text-slate-500">Accédez au portail support IT</p>

          {error && (
            <div className="mb-4 animate-fade-in rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
          <input
            type="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mb-4 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />

          <label className="mb-1 block text-sm font-medium text-slate-700">Mot de passe</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mb-6 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />

          <Button type="submit" loading={submitting} className="w-full">
            Se connecter
          </Button>

          <p className="mt-4 text-center text-xs text-slate-400">
            Pas encore de compte ? Contactez votre administrateur IT.
          </p>
        </form>
      </div>
    </div>
  );
}
