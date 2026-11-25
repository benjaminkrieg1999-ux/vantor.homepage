// VANTOR · Auftragsbestätigung automatisch versenden (Vercel Serverless Function)
// Benötigt in Vercel → Settings → Environment Variables:
//   RESEND_API_KEY   = API-Key von resend.com (Domain vantor-marketing.com dort verifizieren)
//   ORDER_FROM       = optional, z. B. "VANTOR <auftrag@vantor-marketing.com>"
//   ORDER_RECIPIENTS = optional, Standard: ben@, falk@, marko@vantor-marketing.com
const DEF_TO = 'ben@vantor-marketing.com,falk@vantor-marketing.com,marko@vantor-marketing.com';
const clean = (v, n = 300) => String(v || '').replace(/[\r\n]+/g, ' ').trim().slice(0, n);

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ ok: false }); }
  const key = process.env.RESEND_API_KEY;
  if (!key) return res.status(500).json({ ok: false, error: 'missing_key' });
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } }
  b = b || {};
  if (b.website) return res.status(200).json({ ok: true }); // Honeypot gegen Bots
  const type = b.type === 'kickoff' ? 'kickoff' : 'auftrag';
  const firma = clean(b.firma, 120), name = clean(b.name, 120), mail = clean(b.mail, 160);
  const text = String(b.text || '').slice(0, 20000);
  if (!firma || !text) return res.status(400).json({ ok: false, error: 'missing_fields' });
  const pdf = typeof b.pdf === 'string' && b.pdf.length < 6_000_000 ? b.pdf : null;
  const slug = (firma.replace(/[^A-Za-z0-9]+/g, '-') || 'Kunde').slice(0, 60);
  const to = (process.env.ORDER_RECIPIENTS || DEF_TO).split(',').map(s => s.trim()).filter(Boolean);
  const from = process.env.ORDER_FROM || 'VANTOR <auftrag@vantor-marketing.com>';
  const attachments = pdf ? [{ filename: `Auftragsbestaetigung-VANTOR-${slug}.pdf`, content: pdf }] : [];
  const send = payload => fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const validMail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail);
  // 1) an das Team
  const team = await send({
    from, to, reply_to: validMail ? mail : undefined,
    subject: type === 'kickoff' ? `Kick-off gebucht: ${firma}` : `Neuer Auftrag: ${firma}`,
    text: (type === 'kickoff' ? 'Kick-off-Termin gewählt.\n\n' : 'Neuer Auftrag über das Closing-Tool.\n\n') + text,
    attachments
  });
  // 2) Kopie an den Kunden
  if (validMail) {
    const hi = name ? `Guten Tag ${name},` : 'Guten Tag,';
    await send({
      from, to: [mail], reply_to: 'ben@vantor-marketing.com',
      subject: type === 'kickoff' ? 'Ihr Kick-off mit VANTOR' : 'Ihre Auftragsbestätigung · VANTOR',
      text: type === 'kickoff'
        ? `${hi}\n\nIhr Kick-off-Termin ist bei uns angekommen. Den Video-Link schicken wir Ihnen vorab.\n\n${text}\n\nBeste Grüße\nBenjamin Krieg, Falk Oberender und Marko Katura\nVANTOR · +49 176 6103 9764`
        : `${hi}\n\nvielen Dank für Ihr Vertrauen. Im Anhang finden Sie Ihre Auftragsbestätigung als PDF.\n\n${text}\n\nBei Fragen antworten Sie einfach auf diese Mail.\n\nBeste Grüße\nBenjamin Krieg, Falk Oberender und Marko Katura\nVANTOR · +49 176 6103 9764`,
      attachments: type === 'kickoff' ? [] : attachments
    });
  }
  if (!team.ok) return res.status(502).json({ ok: false, error: 'send_failed' });
  return res.status(200).json({ ok: true });
};
