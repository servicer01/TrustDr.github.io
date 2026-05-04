/* Run once to create the Trust Doctor Full Download product in Stripe.
   Usage: node scripts/seed-products.js */

require('../stripeClient');
const { getUncachableStripeClient } = require('../stripeClient');

async function seed() {
  const stripe = await getUncachableStripeClient();

  /* Idempotency check */
  const existing = await stripe.prices.list({ active: true, limit: 100 });
  const already  = existing.data.find(p => p.metadata?.td_product === 'full_download');
  if (already) {
    console.log('Product already exists. Price ID:', already.id);
    return;
  }

  const product = await stripe.products.create({
    name: 'Trust Doctor — Full Document Download',
    description: 'Unlock the complete trust framework document as a downloadable file.',
    metadata: { td_product: 'full_download' },
  });

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: 1900,  /* $19.00 */
    currency: 'usd',
    metadata: { td_product: 'full_download' },
  });

  console.log('Created product:', product.id);
  console.log('Created price:  ', price.id, '($19.00 one-time)');
  console.log('Done! Webhook will sync to database.');
}

seed().catch(err => { console.error(err.message); process.exit(1); });
