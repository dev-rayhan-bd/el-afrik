import { Router } from 'express';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../Auth/auth.constant';
import { QRCodeController } from './qrcode.controller';

const router = Router();

router.post('/generate', auth(USER_ROLE.superAdmin, USER_ROLE.admin), QRCodeController.generateQR);
router.get('/all', auth(USER_ROLE.superAdmin, USER_ROLE.admin), QRCodeController.getCodes);
router.post('/claim', auth(USER_ROLE.user), QRCodeController.claimQR);

export const QRCodeRoutes = router;