import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { apiClient, apiErrorMessage } from "../api/client";
import { Button } from "../components/ui/Button";
import { AuthBrandPanel } from "../components/AuthBrandPanel";
import type { Company } from "../types";

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [service, setService] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: companies } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => (await apiClient.get<{ companies: Company[] }>("/companies")).data.companies,
  });

  const holdings = companies?.filter((c) => c.isActive && c.type === "HOLDING") ?? [];
  const filiales = companies?.filter((c) => c.isActive && c.type === "FILIALE") ?? [];

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register(name, email, password, companyId, service);
      navigate("/");
    } catch (err) {
      setError(apiErrorMessage(err, "Impossible de créer le compte"));
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "mb-4 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <AuthBrandPanel />

      <div className="flex items-center justify-center bg-slate-50 p-6">
        <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-card">
          <h1 className="mb-1 text-xl font-bold text-slate-900">Créer un compte</h1>
          <p className="mb-6 text-sm text-slate-500">Portail support IT</p>

          {error && (
            <div className="mb-4 animate-fade-in rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <label className="mb-1 block text-sm font-medium text-slate-700">Nom complet</label>
          <input required autoFocus value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />

          <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />

          <label className="mb-1 block text-sm font-medium text-slate-700">Société</label>
          <select required value={companyId} onChange={(e) => setCompanyId(e.target.value)} className={inputClass}>
            <option value="">Sélectionner…</option>
            {holdings.length > 0 && (
              <optgroup label="Holding">
                {holdings.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </optgroup>
            )}
            {filiales.length > 0 && (
              <optgroup label="Filiales">
                {filiales.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>

          <label className="mb-1 block text-sm font-medium text-slate-700">Service</label>
          <input
            required
            value={service}
            onChange={(e) => setService(e.target.value)}
            placeholder="Ex : Comptabilité, Ventes, Production…"
            className={inputClass}
          />

          <label className="mb-1 block text-sm font-medium text-slate-700">Mot de passe (8 caractères min.)</label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mb-6 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />

          <Button type="submit" loading={submitting} className="w-full">
            Créer mon compte
          </Button>

          <p className="mt-4 text-center text-sm text-slate-500">
            Déjà un compte ?{" "}
            <Link to="/login" className="font-medium text-brand-600 hover:text-brand-700">
              Se connecter
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
