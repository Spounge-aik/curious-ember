export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST')    { res.status(405).end(); return; }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY saknas' });

  const { imageBase64, mediaType = 'image/jpeg' } = req.body ?? {};
  if (!imageBase64) return res.status(400).json({ error: 'Ingen bild' });

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-6',
        max_tokens: 512,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
            { type: 'text',  text: `Du är expert på sportfiske i Sverige. Analysera bilden.
Svara ENBART med JSON:
{"name":"...","type":"wobler/jig/spinnare/fluga/dropshot/softbait/spo/annat","color":"...","size":"...","fish_tags":["..."],"description":"..."}` },
          ],
        }],
      }),
    });

    const d = await r.json();
    if (d.error) return res.status(500).json({ error: d.error.message });

    const text  = d.content?.[0]?.text ?? '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return res.status(500).json({ error: 'Inget JSON i svar', raw: text.slice(0,200) });

    res.status(200).json(JSON.parse(match[0]));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
