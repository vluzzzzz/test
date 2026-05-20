const { MercadoPagoConfig, Preference } = require('mercadopago');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { items, customer } = req.body;

    if (!items?.length) return res.status(400).json({ error: 'Carrito vacío' });
    if (!customer?.name || !customer?.email || !customer?.phone) {
      return res.status(400).json({ error: 'Datos del cliente incompletos' });
    }

    const total = items.reduce((s, i) => s + i.price * i.qty, 0);

    const client = new MercadoPagoConfig({
      accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN,
      options: { timeout: 10000 },
    });

    const preference = new Preference(client);

    const body = {
      items: items.map(i => ({
        title: i.name,
        quantity: Number(i.qty),
        unit_price: Number(i.price),
        currency_id: 'CLP',
      })),
      payer: {
        name: customer.name,
        email: customer.email,
        phone: { number: customer.phone },
      },
      back_urls: {
        success: `${process.env.FRONTEND_URL}/success`,
        failure: `${process.env.FRONTEND_URL}/cancel`,
        pending: `${process.env.FRONTEND_URL}/cancel`,
      },
      notification_url: `${process.env.FRONTEND_URL}/api/webhook`,
      external_reference: JSON.stringify({
        customer,
        items: items.map(i => ({ name: i.name, qty: i.qty, price: i.price })),
        total,
      }),
      auto_return: 'approved',
      purpose: 'wallet_purchase',
    };

    const result = await preference.create({ body });
    res.json({ init_point: result.init_point, id: result.id });
  } catch (err) {
    console.error('create-preference error:', err);
    res.status(500).json({ error: 'Error al crear preferencia' });
  }
};
