import { EventEmitter } from "events";

interface NotificationEvent {
  userId: string;
  notification: unknown;
}

export const notificationBus = new EventEmitter();

export function emitNewNotification(payload: NotificationEvent) {
  notificationBus.emit("notification", payload);
}
