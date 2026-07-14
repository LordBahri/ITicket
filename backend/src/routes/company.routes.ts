import { Router } from "express";
import { listCompanies, createCompany, updateCompany } from "../controllers/company.controller";
import { authenticate, authorize } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

export const companyRouter = Router();

// Liste publique : nécessaire pour peupler le sélecteur de société à l'inscription
companyRouter.get("/", asyncHandler(listCompanies));

companyRouter.post("/", authenticate, authorize("ADMIN"), asyncHandler(createCompany));
companyRouter.patch("/:id", authenticate, authorize("ADMIN"), asyncHandler(updateCompany));
