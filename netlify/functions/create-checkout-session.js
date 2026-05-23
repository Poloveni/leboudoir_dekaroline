// ═══════════════════════════════════════════════════════════════
//  STRIPE CHECKOUT — Fonction Netlify
//  Le Boudoir de Karoline
// ═══════════════════════════════════════════════════════════════
//
//  Variables d'environnement à configurer dans Netlify :
//    STRIPE_SECRET_KEY  → votre clé secrète Stripe (sk_live_...)
//
// ═══════════════════════════════════════════════════════════════

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  // Autoriser seulement les requêtes POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { cart, customer } = JSON.parse(event.body);

    if (!cart || cart.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Panier vide.' }) };
    }

    // ── Construire les lignes du panier pour Stripe ──
    const line_items = cart.map((item) => ({
      price_data: {
        currency: 'eur',
        product_data: {
          name: item.name,
          description: 'Création artisanale faite main — Le Boudoir de Karoline',
          // images: [`${process.env.URL}/${item.img}`], // décommentez si images hébergées
        },
        unit_amount: Math.round(item.price * 100), // Stripe travaille en centimes
      },
      quantity: item.qty,
    }));

    // ── Frais de livraison ──
    line_items.push({
      price_data: {
        currency: 'eur',
        product_data: {
          name: 'Livraison — Colissimo France',
          description: 'Suivi inclus. Délai : 2 à 3 semaines (création sur commande).',
        },
        unit_amount: 800, // 8,00 € — modifiez selon vos tarifs
      },
      quantity: 1,
    });

    // ── Créer la session Stripe Checkout ──
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',

      // Pages de retour (Netlify injecte process.env.URL automatiquement)
      success_url: `${process.env.URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${process.env.URL}/boutique.html?cancelled=1`,

      // Email pré-rempli si fourni
      ...(customer?.email && { customer_email: customer.email }),

      // Collecte l'adresse de livraison directement sur la page Stripe
      shipping_address_collection: {
        allowed_countries: ['FR', 'BE', 'CH', 'LU', 'MC'],
      },

      // Métadonnées transmises à votre tableau de bord Stripe
      metadata: {
        client_nom:     customer?.name    || '',
        client_email:   customer?.email   || '',
        client_tel:     customer?.phone   || '',
        notes:          customer?.notes   || '',
        articles:       cart.map(i => `${i.name} x${i.qty}`).join(', '),
      },

      // Paramètres d'affichage
      locale: 'fr',
      payment_intent_data: {
        description: `Commande Le Boudoir de Karoline — ${cart.map(i => i.name).join(', ')}`,
      },
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: session.url }),
    };

  } catch (err) {
    console.error('Stripe error:', err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
