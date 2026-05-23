// ═══════════════════════════════════════════════════════════════
//  STRIPE WEBHOOK — Notification email à Karoline
//  Déclenché par Stripe quand un paiement est confirmé
//  (checkout.session.completed)
//
//  CONFIG REQUISE dans Netlify > Environment Variables :
//    STRIPE_WEBHOOK_SECRET  → clé "whsec_..." depuis Stripe > Webhooks
//    STRIPE_SECRET_KEY      → déjà configuré
//    WEB3FORMS_KEY          → 42f01192-c5fc-4d5e-9591-55455b33d7c9
//    KAROLINE_EMAIL         → stephant.caroline@gmail.com
// ═══════════════════════════════════════════════════════════════

const https = require('https');
const crypto = require('crypto');

// ── Vérification signature Stripe ──────────────────
function verifyStripeSignature(payload, sigHeader, secret) {
  const parts = sigHeader.split(',').reduce((acc, part) => {
    const [k, v] = part.split('=');
    acc[k] = v;
    return acc;
  }, {});

  const timestamp = parts['t'];
  const signature = parts['v1'];
  if (!timestamp || !signature) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signature)
  );
}

// ── Envoi email via Web3Forms ───────────────────────
function sendEmail(subject, message) {
  const key   = process.env.WEB3FORMS_KEY || '42f01192-c5fc-4d5e-9591-55455b33d7c9';
  const email = process.env.KAROLINE_EMAIL || 'stephant.caroline@gmail.com';

  const body = JSON.stringify({
    access_key: key,
    to: email,
    subject,
    message,
    from_name: 'Le Boudoir de Karoline — Boutique',
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.web3forms.com',
      path: '/submit',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: raw }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── Handler principal ───────────────────────────────
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const sigHeader     = event.headers['stripe-signature'];

  // Vérification de la signature (sécurité)
  if (webhookSecret && sigHeader) {
    const valid = verifyStripeSignature(event.body, sigHeader, webhookSecret);
    if (!valid) {
      console.error('Signature Stripe invalide');
      return { statusCode: 400, body: 'Invalid signature' };
    }
  }

  let stripeEvent;
  try {
    stripeEvent = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  // On ne traite que les paiements confirmés
  if (stripeEvent.type !== 'checkout.session.completed') {
    return { statusCode: 200, body: 'Ignored' };
  }

  const session  = stripeEvent.data?.object || {};
  const meta     = session.metadata || {};
  const shipping = session.shipping_details || session.customer_details || {};
  const addr     = shipping.address || {};

  // ── Formatage de l'email ──────────────────────────
  const articles = meta.articles || '—';
  const nom      = meta.client_nom || session.customer_details?.name || '—';
  const email    = session.customer_email || session.customer_details?.email || '—';
  const tel      = meta.client_tel  || '—';
  const notes    = meta.notes       || '—';
  const adresse  = meta.adresse
    ? `${meta.adresse}, ${meta.code_postal} ${meta.ville}`
    : addr.line1
      ? `${addr.line1}, ${addr.postal_code} ${addr.city}`
      : '—';

  const total = session.amount_total ? (session.amount_total / 100).toFixed(2) + ' €' : '—';

  const subject = `✦ Nouvelle commande — ${nom} (${total})`;

  const message = `
Bonjour Karoline,

Tu as reçu une nouvelle commande ! 🎉

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 ARTICLES
${articles}

💰 TOTAL PAYÉ : ${total}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 CLIENT
Nom     : ${nom}
Email   : ${email}
Tél     : ${tel}

📍 ADRESSE DE LIVRAISON
${adresse}

✏️ NOTES / PERSONNALISATION
${notes}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Le paiement a été confirmé par Stripe.
Tu peux retrouver tous les détails sur : https://dashboard.stripe.com/payments

Bonne création ! ✦
`.trim();

  try {
    const result = await sendEmail(subject, message);
    console.log('Email envoyé:', result.status, result.body);
    return { statusCode: 200, body: 'OK' };
  } catch (err) {
    console.error('Erreur envoi email:', err);
    return { statusCode: 500, body: 'Email error' };
  }
};
