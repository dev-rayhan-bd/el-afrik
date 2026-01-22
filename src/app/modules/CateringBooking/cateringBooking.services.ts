import Stripe from 'stripe';
import config from '../../config';
import { CateringBookingModel, CateringPackageModel } from './cateringBooking.model';
import { ICateringPackage, CateringPaymentStatus, BookingStatus } from './cateringBooking.interface';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import sendEmail from '../../utils/sendEmail';


const stripe = new Stripe(config.stripe_secret_key as string);

const addPackageIntoDB = async (payload: ICateringPackage) => {
  return await CateringPackageModel.create(payload);
};

const getAllPackagesFromDB = async () => {
  return await CateringPackageModel.find();
};

const createCheckoutSession = async (userId: string, payload: any) => {
  const { packageId, guestCount, eventDate, venueAddress, contactNumber, customerEmail } = payload;

  const pkg = await CateringPackageModel.findById(packageId);
  if (!pkg) throw new AppError(httpStatus.NOT_FOUND, 'Package not found');
  if (guestCount < pkg.minGuests) throw new AppError(httpStatus.BAD_REQUEST, `Max guests: ${pkg.minGuests}`);

  const totalPrice = pkg.pricePerPerson * guestCount;

  const booking = await CateringBookingModel.create({
    user: userId,
    package: packageId,
    eventDate,
    guestCount,
    totalPrice,
    venueAddress,
    contactNumber,
  });

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    customer_email: customerEmail,
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: { name: `Catering: ${pkg.name}` },
        unit_amount: Math.round(totalPrice * 100),
      },
      quantity: 1,
    }],
    metadata: { bookingId: booking._id.toString() },
    success_url: `${config.frontend_url}/catering/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${config.frontend_url}/catering/cancel`,
  });

  booking.stripeSessionId = session.id;
  await booking.save();
  return session.url;
};

const confirmPaymentInDB = async (sessionId: string) => {
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const bookingId = session.metadata?.bookingId;

  const booking = await CateringBookingModel.findById(bookingId).populate('user package');
  if (!booking || booking.paymentStatus === CateringPaymentStatus.PAID) return booking;

  booking.paymentStatus = CateringPaymentStatus.PAID;
  booking.status = BookingStatus.CONFIRMED;
  await booking.save();

  // ইমেইলে মেনু আইটেমগুলো দেখানোর জন্য HTML লিস্ট তৈরি
  const packageInfo = booking.package as any;
  const menuListHtml = packageInfo.menu.map((item: string) => `<li>${item}</li>`).join('');

  // Send Invoice Email
  await sendEmail({
    to: (booking.user as any).email,
    subject: `🎁 Catering Reservation Confirmed - ${booking._id}`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd;">
        <h2 style="color: #2d8a2d;">Reservation Confirmed!</h2>
        <p><strong>Booking ID:</strong> ${booking._id}</p>
        <p><strong>Package Name:</strong> ${packageInfo.name}</p>
        <hr/>
        <h4>Selected Menu:</h4>
        <ul>${menuListHtml}</ul>
        <hr/>
        <p><strong>Event Date:</strong> ${new Date(booking.eventDate).toLocaleDateString()}</p>
        <p><strong>Guest Count:</strong> ${booking.guestCount}</p>
        <p><strong>Total Amount Paid:</strong> $${booking.totalPrice.toFixed(2)}</p>
        <p><strong>Venue Address:</strong> ${booking.venueAddress}</p>
        <p>Thank you for choosing El-afrik Catering Service!</p>
      </div>
    `
  });

  return booking;
};

export const CateringService = {
  addPackageIntoDB,
  getAllPackagesFromDB,
  createCheckoutSession,
  confirmPaymentInDB,
  getAllBookings: async () => await CateringBookingModel.find().populate('user package').sort('-createdAt')
};