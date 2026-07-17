import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { io, type Socket } from "socket.io-client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api/client";
import { useAuth } from "./AuthContext";
import type { ChatThreadSummary } from "../types";

const SOCKET_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:4000/api").replace(/\/api\/?$/, "");

interface ChatContextValue {
  socket: Socket | null;
  threads: ChatThreadSummary[];
  totalUnread: number;
  isLoading: boolean;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [socket, setSocket] = useState<Socket | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const { data: threads, isLoading } = useQuery({
    queryKey: ["chat-threads"],
    queryFn: async () => (await apiClient.get<{ threads: ChatThreadSummary[] }>("/chat/threads")).data.threads,
    enabled: Boolean(user),
  });

  useEffect(() => {
    if (!user) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setSocket(null);
      return;
    }

    const token = localStorage.getItem("iticket_token");
    if (!token) return;

    const instance = io(SOCKET_URL, { auth: { token }, transports: ["websocket", "polling"] });
    socketRef.current = instance;
    setSocket(instance);

    function refetchThreads() {
      queryClient.invalidateQueries({ queryKey: ["chat-threads"] });
    }

    instance.on("chat:message-summary", refetchThreads);
    instance.on("chat:thread-created", refetchThreads);

    return () => {
      instance.off("chat:message-summary", refetchThreads);
      instance.off("chat:thread-created", refetchThreads);
      instance.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const totalUnread = useMemo(() => (threads ?? []).reduce((sum, t) => sum + t.unreadCount, 0), [threads]);

  return (
    <ChatContext.Provider value={{ socket, threads: threads ?? [], totalUnread, isLoading }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat doit être utilisé dans un ChatProvider");
  return ctx;
}
