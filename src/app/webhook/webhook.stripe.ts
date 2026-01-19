// c:\STA\El-afrik\src\app\webhook\webhook.stripe.ts
import { Request, Response } from 'express';
import Stripe from 'stripe';
import config from '../config';
import { OrderService } from '../modules/Orders/orders.services';

const stripe = new Stripe(config.stripe_secret_key as string);
const webhookSecret = config.stripe_webhook_secret_key as string;

export const stripeWebhookHandler = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;

  if (!sig) {
    console.error('❌ No Stripe signature found');
    return res.status(400).send('No signature');
  }

  if (!webhookSecret) {
    console.error('❌ Webhook secret not configured');
    return res.status(500).send('Webhook secret not configured');
  }

  let event: Stripe.Event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    console.log(`✅ Webhook verified: ${event.type}`);
  } catch (err: any) {
    console.error(`❌ Webhook signature verification failed:`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle specific events
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log(`💳 Checkout completed: ${session.id}`);
        
        if (session.payment_status === 'paid') {
          await OrderService.handlePaymentSuccess(session);
          console.log(`✅ Order processed for session: ${session.id}`);
        }
        break;
      }

      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log(`💳 Async payment succeeded: ${session.id}`);
        await OrderService.handlePaymentSuccess(session);
        break;
      }

      case 'checkout.session.async_payment_failed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.orderId || session.client_reference_id;
        console.log(`❌ Async payment failed: ${session.id}`);
        
        if (orderId) {
          await OrderService.handlePaymentFailure(orderId);
        }
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.orderId || session.client_reference_id;
        console.log(`⏰ Session expired: ${session.id}`);
        
        if (orderId) {
          await OrderService.handlePaymentFailure(orderId);
        }
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`💰 Payment intent succeeded: ${paymentIntent.id}`);
        // Already handled by checkout.session.completed
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`❌ Payment intent failed: ${paymentIntent.id}`);
        break;
      }

      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }

    // Always return 200 to acknowledge receipt
    res.status(200).json({ received: true });
  } catch (error: any) {
    console.error(`❌ Error processing webhook:`, error);
    // Still return 200 to prevent Stripe retries for processing errors
    res.status(200).json({ received: true, error: error.message });
  }
};