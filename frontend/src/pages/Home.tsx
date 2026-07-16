import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiClient, apiErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Skeleton } from "../components/ui/Skeleton";
import { IconPlus, IconBook, IconNewspaper, IconSparkle } from "../components/icons";
import type { ChangelogEntry, ChangelogType, NewsArticle } from "../types";

const TYPE_LABELS: Record<ChangelogType, string> = {
  FEATURE: "Nouveauté",
  IMPROVEMENT: "Amélioration",
  FIX: "Correction",
};

const TYPE_CLASSES: Record<ChangelogType, string> = {
  FEATURE: "bg-brand-100 text-brand-700",
  IMPROVEMENT: "bg-amber-100 text-amber-700",
  FIX: "bg-red-100 text-red-700",
};

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (days <= 0) return "Aujourd'hui";
  if (days === 1) return "Hier";
  if (days < 30) return `Il y a ${days} j`;
  const months = Math.floor(days / 30);
  if (months < 12) return `Il y a ${months} mois`;
  return new Date(dateStr).toLocaleDateString("fr-FR");
}

export function Home() {
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data: changelog, isLoading: loadingChangelog } = useQuery({
    queryKey: ["changelog"],
    queryFn: async () => (await apiClient.get<{ entries: ChangelogEntry[] }>("/changelog")).data.entries,
  });

  const { data: news, isLoading: loadingNews } = useQuery({
    queryKey: ["news"],
    queryFn: async () => (await apiClient.get<{ articles: NewsArticle[] }>("/news")).data.articles,
  });

  const refreshMutation = useMutation({
    mutationFn: async () => apiClient.post<{ ok: number; failed: number }>("/news/refresh"),
    onSuccess: (res) => {
      const { ok, failed } = res.data;
      if (ok > 0) toast.success(`Actualités synchronisées (${ok} flux)`);
      else toast.error("Aucun flux n'a pu être synchronisé — vérifiez la connectivité réseau du serveur");
      if (failed > 0 && ok > 0) toast.info(`${failed} flux en échec`);
      queryClient.invalidateQueries({ queryKey: ["news"] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Impossible de synchroniser les actualités")),
  });

  const isAdmin = user?.role === "ADMIN";

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Bonjour {user?.name?.split(" ")[0]}</h1>
          <p className="text-sm text-slate-500">Bienvenue sur le portail IT de Meninx Holding.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/tickets/new">
            <Button>
              <IconPlus className="h-4 w-4" /> Nouveau ticket
            </Button>
          </Link>
          <Link to="/knowledge">
            <Button variant="secondary">
              <IconBook className="h-4 w-4" /> Base de connaissances
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-slate-900">
            <IconSparkle className="h-4 w-4 text-brand-600" /> Quoi de neuf dans ITicket
          </h2>
          {loadingChangelog && (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          )}
          {!loadingChangelog && changelog?.length === 0 && <p className="text-sm text-slate-400">Aucune mise à jour publiée</p>}
          <ul className="space-y-4">
            {changelog?.map((entry) => (
              <li key={entry.id} className="border-l-2 border-slate-100 pl-3">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_CLASSES[entry.type]}`}>
                    {TYPE_LABELS[entry.type]}
                  </span>
                  <span className="text-xs text-slate-400">{timeAgo(entry.createdAt)}</span>
                </div>
                <p className="text-sm font-medium text-slate-800">{entry.title}</p>
                <p className="text-sm text-slate-500">{entry.description}</p>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-5 lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
              <IconNewspaper className="h-4 w-4 text-brand-600" /> Actualités IT
            </h2>
            {isAdmin && (
              <Button size="sm" variant="secondary" loading={refreshMutation.isPending} onClick={() => refreshMutation.mutate()}>
                Synchroniser
              </Button>
            )}
          </div>

          {loadingNews && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-40 w-full" />
              ))}
            </div>
          )}

          {!loadingNews && news?.length === 0 && (
            <p className="text-sm text-slate-400">
              Aucune actualité pour le moment — la prochaine synchronisation automatique aura lieu bientôt.
              {isAdmin && " Vous pouvez aussi la déclencher manuellement avec le bouton « Synchroniser »."}
            </p>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {news?.map((article) => (
              <a
                key={article.id}
                href={article.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="group overflow-hidden rounded-lg border border-slate-200 transition hover:border-brand-300 hover:shadow-sm"
              >
                {article.imageUrl ? (
                  <img
                    src={article.imageUrl}
                    alt=""
                    className="h-32 w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div className="flex h-32 w-full items-center justify-center bg-slate-50">
                    <IconNewspaper className="h-8 w-8 text-slate-300" />
                  </div>
                )}
                <div className="p-3">
                  <p className="mb-1 line-clamp-2 text-sm font-medium text-slate-800 group-hover:text-brand-700">
                    {article.title}
                  </p>
                  <p className="text-xs text-slate-400">
                    {article.sourceName}
                    {article.publishedAt && ` · ${timeAgo(article.publishedAt)}`}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
