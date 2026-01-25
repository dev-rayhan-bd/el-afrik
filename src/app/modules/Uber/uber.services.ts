import axios from 'axios';
import config from '../../config';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';

const UBER_TOKEN_URL = 'https://login.uber.com/oauth/v2/token';
const UBER_API_BASE = 'https://api.uber.com/v1/customers';

/**
 * ১. উবার এক্সেস টোকেন জেনারেট করা
 * এটি উবারের এপিআই ব্যবহারের জন্য 'delivery' স্কোপসহ টোকেন নিবে
 */
const getUberToken = async () => {
  const params = new URLSearchParams({
    client_id: config.uber_client_id as string,
    client_secret: config.uber_client_secret as string,
    grant_type: 'client_credentials',
    // scope: 'delivery',
  });

  try {
    const response = await axios.post(UBER_TOKEN_URL, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return response.data.access_token;
  } catch (error: any) {
    console.error('--- UBER AUTH ERROR ---');
    console.error(error.response?.data || error.message);
    
    // যদি স্কোপ এরর দেয়, তবে বুঝতে হবে ক্লায়েন্টের এগ্রিমেন্ট উবার থেকে এখনো পুরোপুরি একটিভ হয়নি
    throw new AppError(
      httpStatus.UNAUTHORIZED, 
      `Uber Auth Failed: ${error.response?.data?.error_description || "Invalid Credentials or Scope"}`
    );
  }
};

/**
 * ২. ডেলিভারি ফি জানার জন্য (Get Delivery Quote)
 * @param pickupAddress রেস্টুরেন্টের ঠিকানা (ডিফল্ট এডমন্টন, কানাডা)
 * @param dropoffAddress কাস্টমারের ঠিকানা
 */
export const getUberDeliveryQuote = async (pickupAddress: string, dropoffAddress: string) => {
  const token = await getUberToken();
  const customerId = config.uber_customer_id;
  const url = `${UBER_API_BASE}/${customerId}/delivery_quotes`;

  // আপনার ড্যাশবোর্ড অনুযায়ী রেস্টুরেন্টের অ্যাড্রেস
  const defaultPickup = "8882 170 St NW, Edmonton, AB T5T 3J7, Canada";

  try {
    const response = await axios.post(
      url,
      {
        pickup_address: pickupAddress || defaultPickup,
        dropoff_address: dropoffAddress,
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    // উবার ফি সেন্টে পাঠায় (যেমন: ১২৫০), আমরা ডলারে কনভার্ট করছি (১২.৫০)
    return {
      quoteId: response.data.id,
      fee: parseFloat((response.data.fee / 100).toFixed(2)),
      currency: response.data.currency_type,
      duration: Math.ceil((response.data.estimated_pickup_eta_seconds + response.data.estimated_dropoff_eta_seconds) / 60), // মিনিটে কনভার্ট
      pickup_eta: Math.ceil(response.data.estimated_pickup_eta_seconds / 60)
    };
  } catch (error: any) {
    console.error('--- UBER QUOTE ERROR ---');
    console.error(error.response?.data || error.message);
    throw new AppError(
      httpStatus.BAD_REQUEST, 
      "Uber Quote Error: " + (error.response?.data?.message || "Could not calculate delivery fee. Please check addresses.")
    );
  }
};

/**
 * ৩. ডেলিভারি অর্ডার ক্রিয়েট করা (Create Delivery / Dispatch Rider)
 * @param order অর্ডারের অবজেক্ট (নাম, ফোন, আইটেমসহ)
 * @param quoteId আগে প্রাপ্ত কোট আইডি
 */
export const createUberDeliveryOrder = async (order: any, quoteId: string) => {
  const token = await getUberToken();
  const customerId = config.uber_customer_id;
  const url = `${UBER_API_BASE}/${customerId}/deliveries`;

  try {
    const response = await axios.post(
      url,
      {
        quote_id: quoteId,
        pickup_name: "El Afrik Lounge",
        pickup_address: "8882 170 St NW, Edmonton, AB T5T 3J7, Canada",
        pickup_phone_number: "+17804444444", // এখানে ক্লায়েন্টের সঠিক ফোন নম্বর দিন
        dropoff_name: order.customerName,
        dropoff_address: order.shippingAddress.line1 + ", " + order.shippingAddress.city + ", " + (order.shippingAddress.state || ""),
        dropoff_phone_number: order.customerPhone,
        manifest_items: order.items.map((item: any) => ({
          name: item.name,
          quantity: item.quantity,
        })),
        // নিচের লাইনটি কমেন্ট আউট করা আছে, যদি উবার ড্যাশবোর্ডে সেট না করেন তবে এখানে দিতে পারেন
        // webhook_url: `${config.server_url}/api/v1/order/uber-webhook`
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    return {
      deliveryId: response.data.id,
      status: response.data.status,
      tracking_url: response.data.tracking_url, // এটিই ফ্লুটারে ম্যাপ দেখাবে
      courier_name: response.data.courier?.name || "Assigning...",
      fee: parseFloat((response.data.fee / 100).toFixed(2))
    };
  } catch (error: any) {
    console.error('--- UBER DISPATCH ERROR ---');
    console.error(error.response?.data || error.message);
    // রাইডার ডাকতে ফেইল করলে আমরা নাল (null) দিচ্ছি যাতে অর্ডার প্রসেস না থামে, এডমিন ম্যানুয়ালি চেক করতে পারে
    return null;
  }
};

export const UberService = { getUberDeliveryQuote, createUberDeliveryOrder };