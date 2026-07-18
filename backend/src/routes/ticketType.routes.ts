import { Router } from "express";
import { listTicketTypes, getTicketType, createTicketType, updateTicketType } from "../controllers/ticketType.controller";
import { authenticate, authorize } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

export const ticketTypeRouter = Router();

ticketTypeRouter.use(authenticate);

ticketTypeRouter.get("/", asyncHandler(listTicketTypes));
ticketTypeRouter.get("/:id", asyncHandler(getTicketType));
ticketTypeRouter.post("/", authorize("ADMIN"), asyncHandler(createTicketType));
ticketTypeRouter.patch("/:id", authorize("ADMIN"), asyncHandler(updateTicketType));
