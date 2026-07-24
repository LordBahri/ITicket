import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { io, type Socket } from "socket.io-client";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { apiClient } from "../api/client";
import { useAuth } from "./AuthContext";
import type { AppNotification } from "../types";

const SOCKET_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:4000/api").replace(/\/api\/?$/, "");

interface NotificationContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  markRead: (id: string) => void;
  markAllRead: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const [liveUnread, setLiveUnread] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () =>
      (await apiClient.get<{ notifications: AppNotification[]; unreadCount: number }>("/notifications")).data,
    enabled: Boolean(user),
  });

  useEffect(() => {
    if (!user) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      return;
    }

    const token = localStorage.getItem("iticket_token");
    if (!token) return;

    const instance = io(SOCKET_URL, { auth: { token }, transports: ["websocket", "polling"] });
    socketRef.current = instance;

    function onNewNotification() {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }

    instance.on("notification:new", onNewNotification);

    return () => {
      instance.off("notification:new", onNewNotification);
      instance.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    setLiveUnread(data?.unreadCount ?? 0);
  }, [data?.unreadCount]);

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => apiClient.post(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => apiClient.post("/notifications/read-all"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  return (
    <NotificationContext.Provider
      value={{
        notifications: data?.notifications ?? [],
        unreadCount: liveUnread,
        isLoading,
        markRead: (id: string) => markReadMutation.mutate(id),
        markAllRead: () => markAllReadMutation.mutate(),
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications doit être utilisé dans un NotificationProvider");
  return ctx;
}
