import { NextFunction, Request, Response, Router } from 'express';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../Auth/auth.constant';
import { CateringController } from './cateringBooking.controller';
import { upload } from '../../middleware/multer';

const router = Router();

// Helper to parse JSON from Form-Data
const parseBody = (req: Request, res: Response, next: NextFunction) => {
  if (req.body.body) {
    req.body = JSON.parse(req.body.body);
  }
  next();
};

// Admin Routes
router.post('/add-package', auth(USER_ROLE.superAdmin), upload.single('image'), parseBody, CateringController.addPackage);
router.patch('/edit-package/:id', auth(USER_ROLE.superAdmin), upload.single('image'), parseBody, CateringController.editPackage);
router.delete('/delete-package/:id', auth(USER_ROLE.superAdmin), CateringController.deletePackage);
router.get('/admin/bookings', auth(USER_ROLE.superAdmin, USER_ROLE.admin), CateringController.getAllBookings);
router.get(
  '/invoice/:id', 
  auth(USER_ROLE.superAdmin, USER_ROLE.admin), 
  CateringController.downloadInvoice
);
// User Routes
router.get('/packages', CateringController.getPackages);
router.post('/reserve', auth(USER_ROLE.user), CateringController.createReservation);

export const CateringRoutes = router;