import { prisma } from "../config/prisma";
import { emitNewNotification } from "../realtime/notificationBus";
import type { NotificationType } from "@prisma/client";

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  ticketId?: string | null;
}

export async function createNotification(params: CreateNotificationParams) {
  const notification = await prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      ticketId: params.ticketId ?? null,
    },
  });
  emitNewNotification({ userId: params.userId, notification });
  return notification;
}

export async function notifyMany(paramsList: CreateNotificationParams[]) {
  await Promise.all(paramsList.map((params) => createNotification(params)));
}
