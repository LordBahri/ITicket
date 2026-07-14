import { useRef, useState, type ChangeEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, apiErrorMessage } from "../api/client";
import { useToast } from "../context/ToastContext";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";
import { IconFile, IconPlus } from "./icons";
import type { Attachment } from "../types";

export function AttachmentsPanel({ ticketId, attachments }: { ticketId: string; attachments: Attachment[] }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const uploadMutation = useMutation({
    mutationFn: async (files: FileList) => {
      const formData = new FormData();
      Array.from(files).forEach((file) => formData.append("files", file));
      return apiClient.post(`/tickets/${ticketId}/attachments`, formData);
    },
    onSuccess: () => {
      toast.success("Pièce(s) jointe(s) ajoutée(s)");
      queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
    },
    onError: (err) => {
      const msg = apiErrorMessage(err, "Impossible d'ajouter la pièce jointe");
      setError(msg);
      toast.error(msg);
    },
  });

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    setError(null);
    if (e.target.files && e.target.files.length > 0) {
      uploadMutation.mutate(e.target.files);
    }
    e.target.value = "";
  }

  async function handleDownload(attachment: Attachment) {
    try {
      const res = await apiClient.get(`/tickets/${ticketId}/attachments/${attachment.id}/download`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = attachment.filename;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Impossible de télécharger le fichier"));
    }
  }

  return (
    <Card className="mb-4 p-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Pièces jointes</h2>
        <Button variant="secondary" size="sm" loading={uploadMutation.isPending} onClick={() => inputRef.current?.click()}>
          <IconPlus className="h-4 w-4" /> Ajouter
        </Button>
        <input ref={inputRef} type="file" multiple onChange={handleFileChange} className="hidden" />
      </div>

      {error && <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {attachments.length === 0 ? (
        <p className="text-sm text-slate-400">Aucune pièce jointe</p>
      ) : (
        <ul className="space-y-1.5">
          {attachments.map((a) => (
            <li key={a.id}>
              <button
                onClick={() => handleDownload(a)}
                className="inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm text-slate-700 hover:bg-slate-50 hover:text-brand-700"
              >
                <IconFile className="h-4 w-4 shrink-0 text-slate-400" />
                <span className="underline decoration-slate-300 underline-offset-2">{a.filename}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
