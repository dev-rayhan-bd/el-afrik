import Stripe from 'stripe';
import config from '../../config';
import PDFDocument from 'pdfkit';
import { CateringBookingModel, CateringPackageModel } from './cateringBooking.model';
import { ICateringPackage, CateringPaymentStatus, BookingStatus } from './cateringBooking.interface';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import sendEmail from '../../utils/sendEmail';
import QueryBuilder from '../../builder/QueryBuilder';
import { sendNotification, sendNotificationToAdmins } from '../../utils/sendNotification';
import { UserModel } from '../User/user.model';
import { UberService } from '../Uber/uber.services';

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
  const { packageId, guestCount, eventDate, venueAddress, contactNumber, customerEmail, notes,  uberQuoteId,
    uberFee   } = payload;

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
       uberQuoteId, 
    uberFee 
  });
const user = await UserModel.findById(userId);
if (!user) throw new AppError(httpStatus.NOT_FOUND, 'User not found');

const fullName = user.fullName || `${user.firstName} ${user.lastName}`;
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
    // metadata: { bookingId: booking._id.toString(),   customerName: fullName ,type: 'catering' },
      metadata: { bookingId: booking._id.toString(), type: 'catering', uberQuoteId: uberQuoteId },
    success_url: `${config.server_url}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${config.server_url}/payment-cancel`,
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
   // dispatch uber rider
  if (booking.uberQuoteId) {
    const user = booking.user as any;
    const uberPayload = {
      customerName: user.fullName || user.firstName,
      customerPhone: booking.contactNumber,
      fullAddress: booking.venueAddress,
      items: [{ name: (booking.package as any).name, quantity: 1 }]
    };
    const uberRes = await UberService.createUberDeliveryOrder(uberPayload, booking.uberQuoteId);
    if (uberRes) {
      booking.uberDeliveryId = uberRes.deliveryId;
      booking.uberTrackingUrl = uberRes.tracking_url;
      booking.uberStatus = uberRes.status;
    }
  }
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

 await sendNotification(
    (booking.user as any)._id.toString(),
    'Catering Reservation Confirmed! 🍱',
    `Your reservation for ${packageInfo.name} on ${new Date(booking.eventDate).toLocaleDateString()} is successful. Reference: #${booking._id.toString().slice(-6)}`,
    'catering'
  );

  await sendNotificationToAdmins(
  'New Catering Booking! 🍱',
  `A new catering request has been received for ${new Date(booking.eventDate).toLocaleDateString()}.`,
  'catering'
);
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
const getMyBookingsFromDB = async (userId: string, query: Record<string, unknown>) => {
  const bookingQuery = new QueryBuilder(
    CateringBookingModel.find({ user: userId }).populate('package'), 
    query
  )
    .filter()
    .sort()
    .paginate();

  const result = await bookingQuery.modelQuery;
  const meta = await bookingQuery.countTotal();
  return { meta, result };
};
const generateInvoicePDF = async (bookingId: string) => {
  const booking = await CateringBookingModel.findById(bookingId).populate('user package');
  
  if (!booking) {
    throw new AppError(httpStatus.NOT_FOUND, 'Booking not found');
  }

  const doc = new PDFDocument({ margin: 50 });

  // PDF Header
  doc.fillColor('#444444').fontSize(20).text('EL-AFRIK RESTAURANT', 110, 57);
  doc.fontSize(10).text('Catering Service Invoice', 110, 80);
  doc.moveDown();

  // Booking Info
  doc.fontSize(12).text(`Invoice No: INV-${booking._id.toString().slice(-6)}`, 50, 120);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 50, 135);
  doc.text(`Status: ${booking.paymentStatus.toUpperCase()}`, 50, 150);

  // Customer Details
  doc.fontSize(14).text('Customer Details', 50, 180);
  doc.fontSize(10).text(`Name: ${(booking.user as any).fullName || (booking.user as any).firstName}`, 50, 200);
  doc.text(`Email: ${(booking.user as any).email}`, 50, 215);
  doc.text(`Contact: ${booking.contactNumber}`, 50, 230);
  doc.text(`Venue: ${booking.venueAddress}`, 50, 245);

  // Event Details
  doc.fontSize(14).text('Event Details', 300, 180);
  doc.fontSize(10).text(`Package: ${(booking.package as any).name}`, 300, 200);
  doc.text(`Event Date: ${new Date(booking.eventDate).toLocaleDateString()}`, 300, 215);
  doc.text(`Total Guests: ${booking.guestCount}`, 300, 230);

  // Table Header
  const tableTop = 300;
  doc.fontSize(12).text('Description', 50, tableTop);
  doc.text('Qty', 350, tableTop);
  doc.text('Price/Person', 400, tableTop);
  doc.text('Total', 500, tableTop);
  doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

  // Table Content
  const itemRowTop = tableTop + 30;
  doc.fontSize(10).text((booking.package as any).name, 50, itemRowTop);
  doc.text(booking.guestCount.toString(), 350, itemRowTop);
  doc.text(`$${(booking.package as any).pricePerPerson}`, 400, itemRowTop);
  doc.text(`$${booking.totalPrice}`, 500, itemRowTop);

  // Total
  doc.moveTo(50, itemRowTop + 20).lineTo(550, itemRowTop + 20).stroke();
  doc.fontSize(14).text(`Grand Total: $${booking.totalPrice}`, 400, itemRowTop + 40);

  // Footer
  doc.fontSize(10).text('Thank you for choosing El-Afrik Catering Service!', 50, 650, { align: 'center' });

  doc.end();
  return doc;
};





export const CateringService = {
  addPackageIntoDB,
  updatePackageInDB,
  deletePackageFromDB,
  getAllPackagesFromDB,
  createCheckoutSession,
  handlePaymentSuccess,
  getAllBookings,
  generateInvoicePDF,
  getMyBookingsFromDB
};