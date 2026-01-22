import Stripe from 'stripe';
import config from '../../config';
import { CateringBookingModel, CateringPackageModel } from './cateringBooking.model';
import { ICateringPackage, CateringPaymentStatus, BookingStatus } from './cateringBooking.interface';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import sendEmail from '../../utils/sendEmail';
import QueryBuilder from '../../builder/QueryBuilder';

const stripe = new Stripe(config.stripe_secret_key as string);

// --- Admin: Package Management ---
const addPackageIntoDB = async (payload: ICateringPackage) => {
  return await CateringPackageModel.create(payload);
};

const updatePackageInDB = async (id: string, payload: Partial<ICateringPackage>) => {
  const result = await CateringPackageModel.findByIdAndUpdate(id, payload, { new: true });
  if (!result) throw new AppError(httpStatus.NOT_FOUND, 'Package not found');
  return result;
};

const deletePackageFromDB = async (id: string) => {
  const result = await CateringPackageModel.findByIdAndDelete(id);
  if (!result) throw new AppError(httpStatus.NOT_FOUND, 'Package not found');
  return result;
};

const getAllPackagesFromDB = async (query: Record<string, unknown>) => {
  const packageQuery = new QueryBuilder(CateringPackageModel.find(), query)
    .search(['name', 'description'])
    .filter()
    .sort()
    .paginate();

  const result = await packageQuery.modelQuery;
  const meta = await packageQuery.countTotal();
  return { meta, result };
};

// --- User: Reservation Logic ---
const createCheckoutSession = async (userId: string, payload: any) => {
  const { packageId, guestCount, eventDate, venueAddress, contactNumber, customerEmail, notes } = payload;

  const pkg = await CateringPackageModel.findById(packageId);
  if (!pkg) throw new AppError(httpStatus.NOT_FOUND, 'Package not found');
  if (guestCount < pkg.minGuests) throw new AppError(httpStatus.BAD_REQUEST, `Minimum guests: ${pkg.minGuests}`);

  const totalPrice = pkg.pricePerPerson * guestCount;

  const booking = await CateringBookingModel.create({
    user: userId,
    package: packageId,
    eventDate,
    guestCount,
    totalPrice,
    venueAddress,
    contactNumber,
    notes,
  });

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    customer_email: customerEmail,
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: { name: `Catering Package: ${pkg.name}` },
        unit_amount: Math.round(totalPrice * 100),
      },
      quantity: 1,
    }],
    metadata: { bookingId: booking._id.toString(), type: 'catering' },
    success_url: `${config.frontend_url}/catering/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${config.frontend_url}/catering/cancel`,
  });

  booking.stripeSessionId = session.id;
  await booking.save();
  return session.url;
};

// --- Webhook Call: Auto Confirm & Email Invoice ---
const handlePaymentSuccess = async (bookingId: string) => {
  const booking = await CateringBookingModel.findById(bookingId).populate('user package');
  if (!booking || booking.paymentStatus === CateringPaymentStatus.PAID) return;

  booking.paymentStatus = CateringPaymentStatus.PAID;
  booking.status = BookingStatus.CONFIRMED;
  await booking.save();

  const packageInfo = booking.package as any;
  const menuItems = packageInfo.menu.map((item: string) => `<li>${item}</li>`).join('');

  await sendEmail({
    to: (booking.user as any).email,
    subject: ` Catering Confirmed - Invoice #${booking._id.toString().slice(-6)}`,
    html: `
      <div style="font-family: sans-serif; border: 1px solid #eee; padding: 20px;">
        <h2 style="color: #4CAF50;">Booking Confirmed!</h2>
        <p>Your catering reservation for <b>${packageInfo.name}</b> is successful.</p>
        <hr/>
        <h4>Menu Details:</h4>
        <ul>${menuItems}</ul>
        <hr/>
        <p><b>Event Date:</b> ${new Date(booking.eventDate).toLocaleDateString()}</p>
        <p><b>Guests:</b> ${booking.guestCount}</p>
        <p><b>Total Price:</b> $${booking.totalPrice}</p>
        <p><b>Venue:</b> ${booking.venueAddress}</p>
        <p>Thank you for choosing El-afrik!</p>
      </div>
    `
  });
};
const getAllBookings = async (query: Record<string, unknown>) => {
  const bookingQuery = new QueryBuilder(
    CateringBookingModel.find().populate('user package'), 
    query
  )
    .filter()
    .sort()
    .paginate();

  const result = await bookingQuery.modelQuery;
  const meta = await bookingQuery.countTotal();
  return { meta, result };
};
export const CateringService = {
  addPackageIntoDB,
  updatePackageInDB,
  deletePackageFromDB,
  getAllPackagesFromDB,
  createCheckoutSession,
  handlePaymentSuccess,
  getAllBookings
};