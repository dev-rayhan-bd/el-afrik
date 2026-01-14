/* eslint-disable @typescript-eslint/no-explicit-any */
import express, { NextFunction, Request, Response } from "express";

import { USER_ROLE } from "../Auth/auth.constant";
import { upload } from "../../middleware/multer";
import auth from "../../middleware/auth";
import validateRequest from "../../middleware/validateRequest";
import { createProductSchema, updateProductSchema } from "./product.validation";
import { ProductControllers } from "./product.controller";

const router = express.Router();

router.post(
  "/create-product",
  upload.fields([{ name: "image", maxCount: 12 }]),
  (req: Request, res: Response, next: NextFunction) => {
    try {
 
      if (req.body) {

        req.body = JSON.parse(req.body.body);
      }
      next();
    } catch (err) {
      next(err);
    }
  },
  auth(USER_ROLE.superAdmin),
  validateRequest(createProductSchema),
  ProductControllers.createProduct
);

router.get("/allProduct", ProductControllers.getAllProduct);

router.get("/single-product/:id", ProductControllers.getSingleProduct);

router.delete(
  "/delete-product/:id",
  auth(USER_ROLE.superAdmin),
  ProductControllers.deleteProduct
);

router.patch(
  "/update-product/:id",
  upload.fields([{ name: "image", maxCount: 12 }]),
  (req: Request, res: Response, next: NextFunction) =>{
    // console.log("req data--->",req.body.data);;
    if (req.body) {
      req.body = JSON.parse(req.body.body);
    }
    next();
  },

  auth(USER_ROLE.superAdmin),
  validateRequest(updateProductSchema),
  ProductControllers.editProduct
);
router.post('/addReview',

  ProductControllers.createReview,

);
// router.post('/checkout',PackageControllers.initiateOrderPayment)

// router.get('/allReview/:id',PackageControllers.getAllReview)

export const ProductRoutes = router;
