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
  
      if (req.body.body) {
        req.body = JSON.parse(req.body.body);
      }
      next();
    } catch (error) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid JSON format' 
      });
    }
  },
  auth(USER_ROLE.user, USER_ROLE.superAdmin, USER_ROLE.admin),
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
 
  auth(USER_ROLE.user),
  UserControllers.getMyProfile,
);
router.get(
  '/single/:id',
 

  UserControllers.getSingleProfile,
);
router.get(
  '/all',
 
  auth(USER_ROLE.admin,USER_ROLE.superAdmin),
  UserControllers.getAllUser,
);

router.delete('/delete-profile',auth(USER_ROLE.superAdmin,USER_ROLE.admin,USER_ROLE.user),UserControllers.deleteProfile);
router.delete('/delete-user/:id',auth(USER_ROLE.superAdmin,USER_ROLE.admin),UserControllers.deleteUser);


router.get('/dashboard/stats/:year',  auth(USER_ROLE.superAdmin,USER_ROLE.admin), UserControllers.getDashboardStats);

export const UserRoutes = router;
