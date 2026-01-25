// c:\STA\El-afrik\src\app\modules\Orders\uber.services.ts (নতুন বা বিদ্যমান ফাইল)

import axios from 'axios';
import config from '../../config';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import { IOrder } from '../Orders/orders.interface';


const UBER_TOKEN_URL = 'https://login.uber.com/oauth/v2/token';
const UBER_API_BASE = config.uber_env === 'production' 
  ? 'https://api.uber.com/v1/customers' 
  : 'https://api.uber.com/v1/customers'; // sandbox and production base URL are often the same for direct.

// ১. উবার এক্সেস টোকেন জেনারেট করা
const getUberToken = async () => {
  const params = new URLSearchParams({
    client_id: config.uber_client_id as string,
    client_secret: config.uber_client_secret as string,
    grant_type: 'client_credentials',
    scope: 'delivery',
  });

  try {
    const response = await axios.post(UBER_TOKEN_URL, params);
    return response.data.access_token;
  } catch (error: any) {
    console.error('Uber Auth Error:', error.response?.data || error.message);
    throw new AppError(httpStatus.UNAUTHORIZED, 'Uber Authentication Failed: ' + (error.response?.data?.error_description || error.message));
  }
};

// ২. ডেলিভারি ফি জানার জন্য (Checkout এর সময় লাগবে)
export const getUberDeliveryQuote = async (pickupAddress: string, dropoffAddress: string) => {
  const token = await getUberToken();
  try {
    const response = await axios.post(
      `${UBER_API_BASE}/${config.uber_customer_id}/delivery_quotes`,
      {
        pickup_address: pickupAddress, 
        dropoff_address: dropoffAddress,
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    // Uber fee is in cents, convert to dollars
    return {
      quoteId: response.data.id,
      fee: parseFloat((response.data.fee / 100).toFixed(2)),
      currency: response.data.currency_type,
      duration: response.data.estimated_pickup_eta_seconds + response.data.estimated_dropoff_eta_seconds // Total estimated time
    }; 
  } catch (error: any) {
    console.error("Uber Quote Error", error.response?.data);
    throw new AppError(httpStatus.BAD_REQUEST, "Uber Delivery Quote Failed: " + (error.response?.data?.message || error.message));
  }
};

// ৩. রাইডার কনফার্ম করার জন্য (Payment Success এর পর)
export const createUberDeliveryOrder = async (order: IOrder, quoteId: string) => { // IOrder টাইপ ব্যবহার করা হয়েছে
  const token = await getUberToken();
  try {
    const response = await axios.post(
      `${UBER_API_BASE}/${config.uber_customer_id}/deliveries`,
      {
        quote_id: quoteId,
        pickup_name: "El Afrik Lounge", // আপনার রেস্টুরেন্টের নাম
        pickup_address: "Restaurant Full Address, City, State, Zip", // আপনার রেস্টুরেন্টের পূর্ণাঙ্গ ঠিকানা
        pickup_phone_number: "+1234567890", // আপনার রেস্টুরেন্টের কন্টাক্ট নম্বর
        dropoff_name: order.customerName,
        dropoff_address: order.shippingAddress?.line1 + ", " + order.shippingAddress?.city + (order.shippingAddress?.state ? ", " + order.shippingAddress.state : "") + (order.shippingAddress?.postalCode ? ", " + order.shippingAddress.postalCode : ""), // ইউজারের ডেলিভারি ঠিকানা
        dropoff_phone_number: order.customerPhone,
        manifest_items: order.items.map((item: any) => ({
          name: item.name,
          quantity: item.quantity,
          size: "small", // আপনি চাইলে প্রোডাক্ট মডেল থেকে সাইজ নিতে পারেন
          // আরও ডিটেইলস যোগ করা যেতে পারে যেমন: `description`, `price`
        })),
        // webhook_url: `${config.server_url}/api/v1/order/uber-webhook` // যদি আলাদা webhook থাকে, তবে এখানে দিতে পারেন
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error: any) {
    console.error("Uber Dispatch Error", error.response?.data);
    throw new AppError(httpStatus.BAD_REQUEST, "Uber Delivery Dispatch Failed: " + (error.response?.data?.message || error.message));
  }
};

export const UberService = { getUberDeliveryQuote, createUberDeliveryOrder };