import type { Request, Response } from "express";
import { prisma } from "../config/prisma";
import { HttpError } from "../middleware/errorHandler";

export async function listNotifications(req: Request, res: Response) {
  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { ticket: { select: { id: true, reference: true, title: true } } },
    }),
    prisma.notification.count({ where: { userId: req.user!.id, isRead: false } }),
  ]);
  res.json({ notifications, unreadCount });
}

export async function markNotificationRead(req: Request, res: Response) {
  const notification = await prisma.notification.findUnique({ where: { id: req.params.id } });
  if (!notification || notification.userId !== req.user!.id) throw new HttpError(404, "Notification introuvable");

  const updated = await prisma.notification.update({ where: { id: notification.id }, data: { isRead: true } });
  res.json({ notification: updated });
}

export async function markAllNotificationsRead(req: Request, res: Response) {
  await prisma.notification.updateMany({ where: { userId: req.user!.id, isRead: false }, data: { isRead: true } });
  res.status(204).send();
}
