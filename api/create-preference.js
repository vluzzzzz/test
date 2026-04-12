// api/create-preference.js
// Vercel Serverless Function — crea preferencia de pago en Mercado Pago

export default async function handler(req, res) {
  // Solo POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { items, payer } = req.body;

  if (!items || !items.length) {
    return res.status(400).json({ error: 'No hay items en el carrito' });
  }

  try {
    const preference = {
      items: items.map(item => ({
        title:       item.name,
        quantity:    item.qty,
        unit_price:  item.price,
        currency_id: 'CLP',
      })),
      payer: payer || {},
      back_urls: {
        success: `${process.env.SITE_URL}/success.html`,
        failure: `${process.env.SITE_URL}/`,
        pending: `${process.env.SITE_URL}/`,
      },
      auto_return:          'approved',
      notification_url:     `${process.env.SITE_URL}/api/webhook`,
      statement_descriptor: 'AirPods Store',
    };

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(preference),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('MP error:', data);
      return res.status(500).json({ error: 'Error al crear preferencia', detail: data });
    }

    // Devolver el link de pago
    return res.status(200).json({
      init_point:    data.init_point,      // producción
      sandbox_init_point: data.sandbox_init_point, // pruebas
    });

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
