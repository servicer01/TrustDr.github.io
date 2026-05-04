const Stripe = require('stripe');

let _client = null;

function getStripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY not configured.');
  if (!_client) _client = new Stripe(key);
  return _client;
}

module.exports = { getStripeClient };
