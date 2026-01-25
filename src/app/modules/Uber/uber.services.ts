import axios from 'axios';
import config from '../../config';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';

const UBER_TOKEN_URL = 'https://login.uber.com/oauth/v2/token';
const UBER_API_BASE = 'https://api.uber.com/v1/customers';

// --- এটি MOCK MODE সুইচ ---
// পারমিশন না পাওয়া পর্যন্ত এটি true রাখুন, পেলে false করে দিবেন।
const IS_MOCK_MODE = true; 

const getUberToken = async () => {
  if (IS_MOCK_MODE) return "mock_access_token";

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
    throw new AppError(httpStatus.UNAUTHORIZED, "Uber Auth Failed: Whitelisting pending");
  }
};

export const getUberDeliveryQuote = async (pickupAddress: string, dropoffAddress: string) => {
  if (IS_MOCK_MODE) {
    // ফেক রেসপন্স যাতে ফ্রন্টএন্ড কাজ করতে পারে
    return {
      quoteId: "quote_mock_" + Math.random().toString(36).substring(7),
      fee: 12.50,
      currency: "USD",
      duration: 25 
    };
  }

  const token = await getUberToken();
  try {
    const response = await axios.post(
      `${UBER_API_BASE}/${config.uber_customer_id}/delivery_quotes`,
      { pickup_address: pickupAddress, dropoff_address: dropoffAddress },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return {
      quoteId: response.data.id,
      fee: parseFloat((response.data.fee / 100).toFixed(2)),
      currency: response.data.currency_type,
      duration: Math.ceil((response.data.estimated_pickup_eta_seconds + response.data.estimated_dropoff_eta_seconds) / 60)
    };
  } catch (error: any) {
    throw new AppError(httpStatus.BAD_REQUEST, "Uber Quote Error");
  }
};

export const createUberDeliveryOrder = async (order: any, quoteId: string) => {
  if (IS_MOCK_MODE) {
    return {
      deliveryId: "del_mock_" + Math.random().toString(36).substring(7),
      status: "pickup",
      tracking_url: "https://www.uber.com/lookup/tracking-demo", // এই লিঙ্কটি ফ্লুটারে দেখাবেন
      courier_name: "John Rider (Demo)",
      fee: 12.50
    };
  }

  const token = await getUberToken();
  try {
    const response = await axios.post(
      `${UBER_API_BASE}/${config.uber_customer_id}/deliveries`,
      {
        quote_id: quoteId,
        pickup_name: "El Afrik Lounge",
        pickup_address: "8882 170 St NW, Edmonton, AB T5T 3J7, Canada",
        pickup_phone_number: "+17804444444",
        dropoff_name: order.customerName,
        dropoff_address: order.shippingAddress.line1 + ", " + order.shippingAddress.city,
        dropoff_phone_number: order.customerPhone,
        manifest_items: order.items.map((item: any) => ({ name: item.name, quantity: item.quantity })),
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return {
      deliveryId: response.data.id,
      status: response.data.status,
      tracking_url: response.data.tracking_url,
      courier_name: response.data.courier?.name || "Assigning...",
      fee: parseFloat((response.data.fee / 100).toFixed(2))
    };
  } catch (error: any) {
    return null;
  }
};

export const UberService = { getUberDeliveryQuote, createUberDeliveryOrder };