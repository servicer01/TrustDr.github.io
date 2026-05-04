const { getStripeClient } = require('./stripeClient');

class WebhookHandlers {
  static async processWebhook(rawBody, signature, onCheckoutComplete) {
    const stripe = getStripeClient();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;
    if (webhookSecret && signature) {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } else {
      event = JSON.parse(rawBody.toString());
    }

    if (event.type === 'checkout.session.completed') {
      await onCheckoutComplete(event.data.object);
    }
  }
}

module.exports = { WebhookHandlers };
