import { useState, type ChangeEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, apiErrorMessage } from "../api/client";
import type { Attachment } from "../types";

export function AttachmentsPanel({ ticketId, attachments }: { ticketId: string; attachments: Attachment[] }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const uploadMutation = useMutation({
    mutationFn: async (files: FileList) => {
      const formData = new FormData();
      Array.from(files).forEach((file) => formData.append("files", file));
      return apiClient.post(`/tickets/${ticketId}/attachments`, formData);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] }),
    onError: (err) => setError(apiErrorMessage(err, "Impossible d'ajouter la pièce jointe")),
  });

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    setError(null);
    if (e.target.files && e.target.files.length > 0) {
      uploadMutation.mutate(e.target.files);
    }
    e.target.value = "";
  }

  async function handleDownload(attachment: Attachment) {
    const res = await apiClient.get(`/tickets/${ticketId}/attachments/${attachment.id}/download`, {
      responseType: "blob",
    });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement("a");
    link.href = url;
    link.download = attachment.filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  return (
    <div className="mb-4 rounded-lg border border-slate-200 bg-white p-6">
      <h2 className="mb-3 text-sm font-semibold text-slate-900">Pièces jointes</h2>
      {error && <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {attachments.length === 0 && <p className="mb-3 text-sm text-slate-400">Aucune pièce jointe</p>}
      <ul className="mb-3 space-y-1">
        {attachments.map((a) => (
          <li key={a.id}>
            <button onClick={() => handleDownload(a)} className="text-sm text-slate-700 underline hover:text-slate-900">
              📎 {a.filename}
            </button>
          </li>
        ))}
      </ul>

      <input type="file" multiple onChange={handleFileChange} className="text-sm" />
      {uploadMutation.isPending && <p className="mt-2 text-xs text-slate-400">Envoi…</p>}
    </div>
  );
}
