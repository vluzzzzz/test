const { MercadoPagoConfig, Payment } = require('mercadopago');
const { Resend } = require('resend');
const crypto = require('crypto');

function formatCLP(n) {
  return '$' + Number(n).toLocaleString('es-CL');
}

function escHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Valida la firma x-signature de Mercado Pago (protege el webhook de abuso).
//   → true  : firma válida
//   → false : firma inválida
//   → null  : no hay MERCADO_PAGO_WEBHOOK_SECRET configurado (no se valida)
function validSignature(req, dataId) {
  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
  if (!secret) return null;
  const sigHeader = req.headers['x-signature'] || '';
  const reqId = req.headers['x-request-id'] || '';
  const parts = {};
  sigHeader.split(',').forEach(kv => { const [k, v] = kv.split('='); if (k && v) parts[k.trim()] = v.trim(); });
  if (!parts.ts || !parts.v1) return false;
  const id = String(dataId == null ? '' : dataId).toLowerCase();
  const manifest = `id:${id};request-id:${reqId};ts:${parts.ts};`;
  const hmac = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
  try { return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(parts.v1)); }
  catch { return false; }
}

function buildEmailHtml({ customer, items, total, paymentId, status }) {
  const itemsRows = items
    .map(i => `<tr><td style="padding:6px 0">${Number(i.qty)}x ${escHtml(i.name)}</td><td style="padding:6px 0;text-align:right">${formatCLP(i.price)}</td><td style="padding:6px 0;text-align:right">${formatCLP(i.price * i.qty)}</td></tr>`)
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
      <p style="margin:0 0 4px;font-weight:600">${escHtml(customer.name)}</p>
      <p style="margin:0;color:#6e6e73;font-size:13px">${customer.rut ? 'RUT: ' + escHtml(customer.rut) + '<br>' : ''}Email: ${escHtml(customer.email)}<br>Tel: ${escHtml(customer.phone)}</p>
      ${customer.city ? `<p style="margin:4px 0 0;color:#6e6e73;font-size:13px">${escHtml(customer.city)}${customer.address ? ' - ' + escHtml(customer.address) : ''}</p>` : ''}
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
    const body = req.body || {};
    const query = req.query || {};

    // Tipo de notificación + id del recurso. MP los manda en body o en query.
    const type = body.type || query.type || query.topic;
    const dataId = body.data?.id || query['data.id'] || query.id;

    // Solo procesamos notificaciones de pago con id.
    if (!dataId || !(type === 'payment' || type === undefined)) {
      return res.status(200).end();
    }

    // Seguridad: validar la firma de Mercado Pago si hay secret configurado.
    // (Evita que cualquiera dispare correos golpeando este endpoint.)
    const sig = validSignature(req, dataId);
    if (sig === false) {
      console.warn('webhook: firma inválida — rechazado');
      return res.status(401).end();
    }
    if (sig === null) {
      console.warn('webhook: MERCADO_PAGO_WEBHOOK_SECRET no configurado — sin validar firma');
    }

    // Flujo real de Mercado Pago: consultar el pago por su id para obtener
    // external_reference (cliente + items + total) y el estado real.
    const client = new MercadoPagoConfig({
      accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN,
      options: { timeout: 8000 },
    });
    const info = await new Payment(client).get({ id: dataId });

    const paymentStatus = info?.status || 'unknown';
    const paymentId = String(info?.id || dataId);

    if (paymentStatus !== 'approved') {
      console.log('webhook: pago', paymentId, 'estado', paymentStatus, '— no se envía correo');
      return res.status(200).end();
    }

    let paymentData = null;
    if (info?.external_reference) {
      try { paymentData = JSON.parse(info.external_reference); } catch { paymentData = null; }
    }
    if (!paymentData) {
      console.log('webhook: pago aprobado sin external_reference, skipping email', { paymentId });
      return res.status(200).end();
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      // NOTA Resend: con onboarding@resend.dev solo se entrega al email dueño
      // de la cuenta Resend. Para enviar a otra casilla, verificar un dominio
      // y cambiar el "from" a uno de ese dominio.
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

    console.log('email enviado para pago', paymentId);
    res.status(200).end();
  } catch (err) {
    // Responder 200 igual para que MP no reintente indefinidamente.
    console.error('webhook error:', err);
    res.status(200).end();
  }
};
