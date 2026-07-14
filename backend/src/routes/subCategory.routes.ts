import { Router } from "express";
import { listSubCategories, createSubCategory, updateSubCategory } from "../controllers/subCategory.controller";
import { authenticate, authorize } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

export const subCategoryRouter = Router();

subCategoryRouter.use(authenticate);

subCategoryRouter.get("/", asyncHandler(listSubCategories));
subCategoryRouter.post("/", authorize("ADMIN"), asyncHandler(createSubCategory));
subCategoryRouter.patch("/:id", authorize("ADMIN"), asyncHandler(updateSubCategory));
