const { Resend } = require('resend');

function formatCLP(n) {
  return '$' + Number(n).toLocaleString('es-CL');
}

function buildEmailHtml({ customer, items, total, paymentId, status }) {
  const itemsRows = items
    .map(i => `<tr><td style="padding:6px 0">${i.qty}x ${i.name}</td><td style="padding:6px 0;text-align:right">${formatCLP(i.price)}</td><td style="padding:6px 0;text-align:right">${formatCLP(i.price * i.qty)}</td></tr>`)
    .join('');

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f5f5f7">
  <div style="background:#fff;border-radius:16px;padding:32px;box-shadow:0 2px 12px rgba(0,0,0,.08)">
    <h1 style="font-size:22px;margin:0 0 8px">🛒 Nuevo Pedido</h1>
    <p style="color:#6e6e73;margin:0 0 24px">Pagado vía Mercado Pago ${new Date().toLocaleString('es-CL')}</p>

    <div style="background:#f5f5f7;border-radius:12px;padding:16px;margin-bottom:24px">
      <p style="margin:0 0 4px;font-weight:600">${customer.name}</p>
      <p style="margin:0;color:#6e6e73;font-size:13px">${customer.rut ? 'RUT: ' + customer.rut + '<br>' : ''}Email: ${customer.email}<br>Tel: ${customer.phone}</p>
      ${customer.city ? `<p style="margin:4px 0 0;color:#6e6e73;font-size:13px">${customer.city}${customer.address ? ' - ' + customer.address : ''}</p>` : ''}
    </div>

    <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
      <thead><tr style="border-bottom:1px solid #e5e5e5;font-size:12px;color:#6e6e73;text-transform:uppercase">
        <th style="text-align:left;padding:6px 0">Producto</th>
        <th style="text-align:right;padding:6px 0">Precio</th>
        <th style="text-align:right;padding:6px 0">Subtotal</th>
      </tr></thead>
      <tbody>${itemsRows}</tbody>
    </table>

    <div style="border-top:2px solid #000;padding-top:12px;text-align:right;font-size:18px;font-weight:700">
      Total: ${formatCLP(total)}
    </div>

    <div style="margin-top:24px;padding:12px;background:#e8f5e9;border-radius:8px;font-size:13px">
      <strong>Pago ID:</strong> ${paymentId}<br>
      <strong>Estado:</strong> ${status}
    </div>
  </div>
</body>
</html>`;
}

module.exports = async (req, res) => {
  try {
    const { type, data, external_reference, payment_id, status } = req.body;

    const paymentData = external_reference ? JSON.parse(external_reference) : null;
    const paymentId = payment_id || data?.id || '—';
    const paymentStatus = status || 'approved';

    if (!paymentData) {
      console.log('webhook received — no external_reference, skipping email');
      return res.status(200).end();
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: 'Pedidos <onboarding@resend.dev>',
      to: process.env.NOTIFICATION_EMAIL,
      subject: `🛒 Nuevo Pedido - $${Number(paymentData.total).toLocaleString('es-CL')}`,
      html: buildEmailHtml({
        customer: paymentData.customer,
        items: paymentData.items,
        total: paymentData.total,
        paymentId,
        status: paymentStatus,
      }),
    });

    console.log('email sent for payment', paymentId);
    res.status(200).end();
  } catch (err) {
    console.error('webhook error:', err);
    res.status(200).end();
  }
};
