/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import express, { NextFunction, Request, Response } from 'express';



import { UserControllers } from './user.controller';

import { editProfileSchema } from '../Auth/authValidation';

import { USER_ROLE } from '../Auth/auth.constant';
import { upload } from '../../middleware/multer';
import auth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';


const router = express.Router();

router.patch(
  '/edit-profile',
  upload.single('image'),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.body.data) {
        const parsedData = JSON.parse(req.body.data);

        // Merge parsed JSON fields into req.body (preserve file info)
        req.body = {
          ...req.body,
          ...parsedData,
        };
      }


      next();
    } catch (error) {
   
      return res.status(400).json({ message: 'Invalid data format' });
    }
  },
  auth(USER_ROLE.owner,USER_ROLE.member,USER_ROLE.superAdmin,USER_ROLE.admin),
  validateRequest(editProfileSchema),
  UserControllers.updateProfile,
);

router.get(
  '/profile',
 
  auth(USER_ROLE.superAdmin,USER_ROLE.admin),
  UserControllers.getMyProfile,
);
router.get(
  '/my-profile',
 
  auth(USER_ROLE.owner,USER_ROLE.member),
  UserControllers.getMyProfile,
);

router.patch(
  '/update-screentime-data',
 
  auth(USER_ROLE.owner,USER_ROLE.member),
  UserControllers.updateScreenTimeData,
);
router.patch(
  '/update-movement-data',
 
  auth(USER_ROLE.owner,USER_ROLE.member),
  UserControllers.updateMovementData,
);



router.get('/dashboard/stats/:year', UserControllers.getDashboardStats);

export const UserRoutes = router;
