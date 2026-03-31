import type { NextFunction, Request, Response } from 'express';
import { SysAdminService } from '../services/sys-admin.service';

const sysAdminService = new SysAdminService();

export const getOverview = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const overview = await sysAdminService.getOverview();
    res.json(overview);
  } catch (error) {
    next(error);
  }
};

export const createFacility = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facility = await sysAdminService.createFacility(req.body);
    res.status(201).json({ facility });
  } catch (error) {
    next(error);
  }
};

export const deleteFacility = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await sysAdminService.deleteFacility(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const assignAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await sysAdminService.assignAdmin(req.body);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
