import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../types/app-error';

export const errorHandler = (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }

  const message = error instanceof Error ? error.message : 'Internal server error.';
  res.status(500).json({ error: message });
};
