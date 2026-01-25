import express, { NextFunction, Request, Response } from 'express';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../Auth/auth.constant';
import { upload } from '../../middleware/multer';
import { AdsControllers } from './ads.controller';

const router = express.Router();

router.post(
  '/create-ads',

  upload.array('image', 12), 
  (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.body.body) {
        req.body = JSON.parse(req.body.body);
      }
      next();
    } catch (err) {
      next(err);
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