// ═══════════════════════════════════════════════════════════════
//  STRIPE CHECKOUT — Fonction Netlify (sans dépendance npm)
//  Utilise l'API Stripe directement via https
// ═══════════════════════════════════════════════════════════════

const https = require('https');

// Appel HTTP vers l'API Stripe
function stripeRequest(path, body) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const data = new URLSearchParams(body).toString();

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.stripe.com',
      path,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(data),
      },
    };

    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch (e) { reject(e); }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// En-têtes CORS — autorise GitHub Pages à appeler cette fonction
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://poloveni.github.io',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

exports.handler = async (event) => {
  // Réponse au preflight CORS (OPTIONS)
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS_HEADERS, body: 'Method Not Allowed' };
  }

  try {
    const { cart, customer } = JSON.parse(event.body);

    if (!cart || cart.length === 0) {
      return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Panier vide.' }) };
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Clé Stripe non configurée.' }) };
    }

    const siteUrl = process.env.URL || 'https://creative-entremet-399555.netlify.app';

    // Construire les paramètres de la session Stripe
    const params = {};

    // Méthode de paiement
    params['payment_method_types[0]'] = 'card';
    params['mode'] = 'payment';
    params['locale'] = 'fr';

    // Articles du panier
    cart.forEach((item, i) => {
      params[`line_items[${i}][price_data][currency]`] = 'eur';
      params[`line_items[${i}][price_data][product_data][name]`] = item.name;
      params[`line_items[${i}][price_data][product_data][description]`] = 'Création artisanale faite main — Le Boudoir de Karoline';
      params[`line_items[${i}][price_data][unit_amount]`] = Math.round(item.price * 100);
      params[`line_items[${i}][quantity]`] = item.qty;
    });

    // Frais de livraison
    const li = cart.length;
    params[`line_items[${li}][price_data][currency]`] = 'eur';
    params[`line_items[${li}][price_data][product_data][name]`] = 'Livraison Colissimo France';
    params[`line_items[${li}][price_data][product_data][description]`] = 'Suivi inclus — délai 2 à 3 semaines';
    params[`line_items[${li}][price_data][unit_amount]`] = 800;
    params[`line_items[${li}][quantity]`] = 1;

    // URLs de retour
    params['success_url'] = `${siteUrl}/success.html?session_id={CHECKOUT_SESSION_ID}`;
    params['cancel_url']  = `${siteUrl}/boutique.html?cancelled=1`;

    // Email client pré-rempli
    if (customer?.email) params['customer_email'] = customer.email;

    // Collecte adresse livraison sur Stripe
    params['shipping_address_collection[allowed_countries][0]'] = 'FR';
    params['shipping_address_collection[allowed_countries][1]'] = 'BE';
    params['shipping_address_collection[allowed_countries][2]'] = 'CH';
    params['shipping_address_collection[allowed_countries][3]'] = 'LU';

    // Métadonnées
    if (customer?.name)    params['metadata[client_nom]']     = customer.name;
    if (customer?.phone)   params['metadata[client_tel]']     = customer.phone;
    if (customer?.address) params['metadata[adresse]']        = customer.address;
    if (customer?.zip)     params['metadata[code_postal]']    = customer.zip;
    if (customer?.city)    params['metadata[ville]']          = customer.city;
    if (customer?.notes)   params['metadata[notes]']          = customer.notes;
    params['metadata[articles]'] = cart.map(i => `${i.name} x${i.qty}`).join(', ');

    params['payment_intent_data[description]'] = `Commande Le Boudoir de Karoline — ${cart.map(i => i.name).join(', ')}`;

    // Créer la session Stripe
    const result = await stripeRequest('/v1/checkout/sessions', params);

    if (result.status !== 200) {
      console.error('Stripe API error:', result.body);
      return {
        statusCode: result.status,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: result.body?.error?.message || 'Erreur Stripe' }),
      };
    }

    return {
      statusCode: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: result.body.url }),
    };

  } catch (err) {
    console.error('Function error:', err);
    return {
      statusCode: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
