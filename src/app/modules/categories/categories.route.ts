
/* eslint-disable @typescript-eslint/no-explicit-any */
import express, { NextFunction, Request, Response } from 'express';


import { USER_ROLE } from '../Auth/auth.constant';


import { upload } from '../../middleware/multer';
import auth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { CategoryCreateSchema } from './categories.validation';
import { categoriesControllers } from './categories.controller';





const router = express.Router();

router.post(
  '/create-category',
  upload.single('image'),
  (req: Request, res: Response, next: NextFunction) => {
    // console.log("req data--->",req.body.data);
    if (req.body) {
      req.body = JSON.parse(req.body.body);
    }
    next();
  },

  auth(
    USER_ROLE.superAdmin,
  
  ),
  validateRequest(CategoryCreateSchema),
  categoriesControllers.createCategories,
);

// router.get('/retrive/:userId',UserControllers.getSingleUser)

router.get('/allCategory', categoriesControllers.getAllCategories);

router.get('/single-category/:id',categoriesControllers.getSingleCategories);


router.delete('/delete-category/:id',categoriesControllers.deleteCategories,  auth(
    USER_ROLE.superAdmin,
  ),);

router.patch('/update-category/:id',
     upload.single('image'),
  (req: Request, res: Response, next: NextFunction) => {
    // console.log("req data--->",req.body.data);
    if (req.body) {
      req.body = JSON.parse(req.body.body);
    }
    next();
  },
    auth(
    USER_ROLE.superAdmin,
  
  ),
    categoriesControllers.editCategory);

export const CategoryRoutes = router;
