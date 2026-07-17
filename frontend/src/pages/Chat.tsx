import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, apiErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";
import { useToast } from "../context/ToastContext";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";
import { PageSpinner } from "../components/ui/Spinner";
import { EmptyState } from "../components/ui/EmptyState";
import { IconInbox, IconSparkle } from "../components/icons";
import type { ChatMessage, ChatThreadSummary, User } from "../types";

function formatChatTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

function ThreadRow({ thread, active, onClick }: { thread: ChatThreadSummary; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-left transition-colors ${
        active ? "bg-brand-50" : "hover:bg-slate-50"
      }`}
    >
      <Avatar name={thread.user.name} avatarUrl={thread.user.avatarUrl} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className={`truncate text-sm ${thread.unreadCount > 0 ? "font-semibold text-slate-900" : "font-medium text-slate-700"}`}>
            {thread.user.name}
          </p>
          {thread.lastMessage && (
            <span className="shrink-0 text-[11px] text-slate-400">{formatChatTime(thread.lastMessage.createdAt)}</span>
          )}
        </div>
        <p className={`truncate text-xs ${thread.unreadCount > 0 ? "font-medium text-slate-600" : "text-slate-400"}`}>
          {thread.lastMessage?.body ?? "Aucun message"}
        </p>
      </div>
      {thread.unreadCount > 0 && (
        <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-brand-600 px-1.5 text-[11px] font-semibold text-white">
          {thread.unreadCount}
        </span>
      )}
    </button>
  );
}

function MessageBubble({ message, isSupportSide }: { message: ChatMessage; isSupportSide: boolean }) {
  return (
    <div className={`flex items-end gap-2 ${isSupportSide ? "justify-end" : "justify-start"}`}>
      {!isSupportSide && <Avatar name={message.sender.name} avatarUrl={message.sender.avatarUrl} size="sm" />}
      <div className={`max-w-[70%] ${isSupportSide ? "items-end" : "items-start"} flex flex-col`}>
        <div
          className={`rounded-2xl px-3.5 py-2 text-sm ${
            isSupportSide ? "rounded-br-sm bg-brand-600 text-white" : "rounded-bl-sm bg-slate-100 text-slate-800"
          }`}
        >
          {isSupportSide && <p className="mb-0.5 text-[11px] font-medium text-brand-100">{message.sender.name}</p>}
          <p className="whitespace-pre-wrap break-words">{message.body}</p>
        </div>
        <span className="mt-1 px-1 text-[11px] text-slate-400">{formatChatTime(message.createdAt)}</span>
      </div>
      {isSupportSide && <Avatar name={message.sender.name} avatarUrl={message.sender.avatarUrl} size="sm" />}
    </div>
  );
}

function NewConversationPicker({ onCreated }: { onCreated: (threadId: string) => void }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: async () => (await apiClient.get<{ users: User[] }>("/users")).data.users,
    enabled: open,
  });

  const startMutation = useMutation({
    mutationFn: async (userId: string) => apiClient.post<{ thread: { id: string } }>(`/chat/threads/with/${userId}`),
    onSuccess: (res) => {
      onCreated(res.data.thread.id);
      setOpen(false);
      setQuery("");
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Impossible de démarrer la conversation")),
  });

  const candidates = (users ?? []).filter(
    (u) => u.role === "USER" && u.name.toLowerCase().includes(query.toLowerCase())
  );

  if (!open) {
    return (
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        + Conversation
      </Button>
    );
  }

  return (
    <div className="absolute right-4 top-14 z-10 w-72 rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
      <input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Rechercher un utilisateur…"
        className="mb-2 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm outline-none focus:border-brand-500"
      />
      <ul className="max-h-56 space-y-0.5 overflow-y-auto">
        {candidates.map((u) => (
          <li key={u.id}>
            <button
              onClick={() => startMutation.mutate(u.id)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-slate-50"
            >
              <Avatar name={u.name} avatarUrl={u.avatarUrl} size="sm" />
              <span className="truncate">{u.name}</span>
            </button>
          </li>
        ))}
        {candidates.length === 0 && <li className="px-2 py-2 text-xs text-slate-400">Aucun résultat</li>}
      </ul>
      <button onClick={() => setOpen(false)} className="mt-2 text-xs text-slate-400 hover:text-slate-600">
        Fermer
      </button>
    </div>
  );
}

export function Chat() {
  const { user } = useAuth();
  const { socket, threads, isLoading } = useChat();
  const queryClient = useQueryClient();
  const toast = useToast();
  const isStaff = user?.role === "AGENT" || user?.role === "ADMIN";

  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isStaff && threads.length > 0 && !selectedThreadId) {
      setSelectedThreadId(threads[0].id);
    }
  }, [isStaff, threads, selectedThreadId]);

  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ["chat-messages", selectedThreadId],
    queryFn: async () =>
      (await apiClient.get<{ messages: ChatMessage[] }>(`/chat/threads/${selectedThreadId}/messages`)).data.messages,
    enabled: Boolean(selectedThreadId),
  });

  useEffect(() => {
    if (!socket || !selectedThreadId) return;
    socket.emit("chat:join-thread", selectedThreadId);

    function handleMessage(payload: { threadId: string; message: ChatMessage }) {
      if (payload.threadId !== selectedThreadId) return;
      queryClient.setQueryData<ChatMessage[]>(["chat-messages", selectedThreadId], (old = []) => {
        if (old.some((m) => m.id === payload.message.id)) return old;
        return [...old, payload.message];
      });
    }
    socket.on("chat:message", handleMessage);

    return () => {
      socket.emit("chat:leave-thread", selectedThreadId);
      socket.off("chat:message", handleMessage);
    };
  }, [socket, selectedThreadId, queryClient]);

  useEffect(() => {
    if (!selectedThreadId) return;
    apiClient.post(`/chat/threads/${selectedThreadId}/read`).then(() => {
      queryClient.invalidateQueries({ queryKey: ["chat-threads"] });
    });
  }, [selectedThreadId, messages?.length, queryClient]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length]);

  const sendMutation = useMutation({
    mutationFn: async () => {
      const body = messageText;
      setMessageText("");
      return apiClient.post(`/chat/threads/${selectedThreadId}/messages`, { body });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["chat-threads"] }),
    onError: (err) => toast.error(apiErrorMessage(err, "Impossible d'envoyer le message")),
  });

  function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!messageText.trim() || !selectedThreadId) return;
    sendMutation.mutate();
  }

  const selectedThread = threads.find((t) => t.id === selectedThreadId);

  if (isLoading) return <PageSpinner label="Chargement du chat…" />;

  return (
    <div className="flex h-[calc(100vh-8.5rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
      {isStaff && (
        <div className="relative flex w-80 shrink-0 flex-col border-r border-slate-200">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">Conversations</h2>
            <NewConversationPicker onCreated={setSelectedThreadId} />
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {threads.length === 0 && (
              <EmptyState icon={IconInbox} title="Aucune conversation" description="Démarrez une conversation avec un utilisateur." />
            )}
            {threads.map((t) => (
              <ThreadRow key={t.id} thread={t} active={t.id === selectedThreadId} onClick={() => setSelectedThreadId(t.id)} />
            ))}
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {!selectedThreadId ? (
          <div className="flex flex-1 items-center justify-center">
            <EmptyState icon={IconSparkle} title="Sélectionnez une conversation" description="Choisissez un utilisateur dans la liste pour afficher les messages." />
          </div>
        ) : (
          <>
            <div className="flex shrink-0 items-center gap-2.5 border-b border-slate-100 px-4 py-3">
              <Avatar
                name={isStaff ? selectedThread?.user.name : "Équipe support IT"}
                avatarUrl={isStaff ? selectedThread?.user.avatarUrl : undefined}
                size="sm"
              />
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {isStaff ? selectedThread?.user.name : "Équipe support IT"}
                </p>
                {isStaff && <p className="text-xs text-slate-400">{selectedThread?.user.email}</p>}
              </div>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {messagesLoading && <p className="text-center text-sm text-slate-400">Chargement…</p>}
              {messages?.length === 0 && (
                <p className="text-center text-sm text-slate-400">Aucun message pour le moment. Dites bonjour !</p>
              )}
              {messages?.map((m) => (
                <MessageBubble key={m.id} message={m} isSupportSide={m.sender.role === "AGENT" || m.sender.role === "ADMIN"} />
              ))}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} className="flex shrink-0 items-center gap-2 border-t border-slate-100 p-3">
              <input
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Écrivez un message…"
                className="flex-1 rounded-full border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
              <Button type="submit" loading={sendMutation.isPending} disabled={!messageText.trim()}>
                Envoyer
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
