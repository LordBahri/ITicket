import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { HttpError } from "../middleware/errorHandler";

type MulterMiddleware = (req: Request, res: Response, callback: (err: unknown) => void) => void;

export function handleMulterUpload(uploadMiddleware: MulterMiddleware, sizeErrorMessage: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    uploadMiddleware(req, res, (err: unknown) => {
      if (err) {
        const message =
          err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE"
            ? sizeErrorMessage
            : err instanceof Error
              ? err.message
              : "Impossible de traiter le fichier";
        return next(new HttpError(400, message));
      }
      next();
    });
  };
}
