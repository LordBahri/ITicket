import { Router } from "express";
import {
  createTicket,
  listTickets,
  getTicket,
  updateTicket,
  approveTicketProcess,
  rejectTicketProcess,
  toggleProcessStep,
  archiveTicketForm,
} from "../controllers/ticket.controller";
import { addComment } from "../controllers/comment.controller";
import { uploadAttachments, listAttachments, downloadAttachment } from "../controllers/attachment.controller";
import { authenticate, authorize } from "../middleware/auth";
import { upload } from "../middleware/upload";
import { asyncHandler } from "../utils/asyncHandler";

export const ticketRouter = Router();

ticketRouter.use(authenticate);

ticketRouter.post("/", asyncHandler(createTicket));
ticketRouter.get("/", asyncHandler(listTickets));
ticketRouter.get("/:id", asyncHandler(getTicket));
ticketRouter.patch("/:id", authorize("AGENT", "ADMIN"), asyncHandler(updateTicket));
ticketRouter.post("/:id/comments", asyncHandler(addComment));
ticketRouter.get("/:id/attachments", asyncHandler(listAttachments));
ticketRouter.post("/:id/attachments", upload.array("files", 5), asyncHandler(uploadAttachments));
ticketRouter.get("/:id/attachments/:attachmentId/download", asyncHandler(downloadAttachment));
// Le valideur d'une demande de processus peut ne pas être AGENT/ADMIN (ex : un directeur de service) :
// le contrôle d'accès se fait dans le controller, pas via authorize().
ticketRouter.post("/:id/approve", asyncHandler(approveTicketProcess));
ticketRouter.post("/:id/reject", asyncHandler(rejectTicketProcess));
ticketRouter.patch("/:id/steps/:completionId", authorize("AGENT", "ADMIN"), asyncHandler(toggleProcessStep));
ticketRouter.post("/:id/archive-form", authorize("AGENT", "ADMIN"), asyncHandler(archiveTicketForm));
