import express, { NextFunction, Request, Response } from 'express';


import { AuthControllers } from './auth.controller';


import { USER_ROLE } from './auth.constant';

import { AuthValidation } from './authValidation';
import validateRequest from '../../middleware/validateRequest';
import auth from '../../middleware/auth';

const router = express.Router();

router.post(
  '/register',
  validateRequest(AuthValidation.registerUserValidationSchema),

  AuthControllers.registerUser,
);
router.post('/login',
    validateRequest(AuthValidation.loginValidationSchema),
    AuthControllers.userLogin
);
router.post('/changePassword',
  
    validateRequest(AuthValidation.changePasswordValidationSchema),
    auth(USER_ROLE.member,USER_ROLE.admin,USER_ROLE.owner,USER_ROLE.superAdmin),
    AuthControllers.changePassword
)
router.post(
  '/refresh-token',
  validateRequest(AuthValidation.refreshTokenValidationSchema),
  AuthControllers.refreshToken,
);
router.post(
  '/forgotPass',
  validateRequest(AuthValidation.forgotPasswordSchema),
  AuthControllers.forgotPassword,
);
router.post(
  '/resetPass',
  validateRequest(AuthValidation.resetPasswordValidationSchema),
  AuthControllers.resetPassword,
);
router.post(
  '/verifyOtp',
  validateRequest(AuthValidation.verifyOtpSchema),
  AuthControllers.verifyYourOTP,
);


export const AuthRoutes = router;
