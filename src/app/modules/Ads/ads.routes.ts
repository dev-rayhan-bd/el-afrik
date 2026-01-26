import express, { NextFunction, Request, Response } from 'express';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../Auth/auth.constant';
import { upload } from '../../middleware/multer';
import { AdsControllers } from './ads.controller';
import AppError from '../../errors/AppError';

const router = express.Router();

router.post(
  '/create-ads',
  upload.single('image'),
  (req: Request, res: Response, next: NextFunction) => {
    try {
   
      if (req.body && req.body.body) {
        req.body = JSON.parse(req.body.body);
      }
      next();
    } catch (err) {
      next(new AppError(400, "Invalid JSON format in body field"));
    }
  },
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  AdsControllers.createAds
);

router.get('/all-ads', AdsControllers.getAllAds);

router.delete(
  '/delete-ads/:id',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  AdsControllers.deleteAds
);

export const AdsRoutes = router;