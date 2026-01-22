import { NextFunction, Request, Response, Router } from 'express';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../Auth/auth.constant';
import { CateringController } from './cateringBooking.controller';
import { upload } from '../../middleware/multer';

const router = Router();

router.post('/add-package',
     upload.single('image'),
      (req: Request, res: Response, next: NextFunction) => {
        // console.log("req data--->",req.body.body);
        if (req.body) {
          req.body = JSON.parse(req.body.body);
        }
        next();
      },
    auth(USER_ROLE.superAdmin), CateringController.addPackage);
router.get('/packages', CateringController.getPackages);
router.post('/reserve', auth(USER_ROLE.user), CateringController.createReservation);
router.post('/confirm-payment', CateringController.confirmPayment);
router.get('/admin/bookings', auth(USER_ROLE.superAdmin, USER_ROLE.admin), CateringController.getAllBookings);

export const CateringRoutes = router;
