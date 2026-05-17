const https = require('https');

function callClaude(body, apiKey) {
  return new Promise((resolve, reject) => {
    const data = Buffer.from(JSON.stringify(body));
    const req = https.request({
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Length':    data.length,
      },
    }, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch (e) { reject(new Error('JSON-parse: ' + raw.slice(0, 300))); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST')    { res.status(405).end(); return; }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY saknas i Vercel' });
  }

  const body = req.body ?? {};
  const imageBase64 = body.imageBase64;
  const mediaType   = body.mediaType || 'image/jpeg';

  if (!imageBase64) {
    return res.status(400).json({ error: 'Ingen bild skickades' });
  }

  try {
    const response = await callClaude({
      model:      'claude-opus-4-5',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: [
          {
            type:   'image',
            source: { type: 'base64', media_type: mediaType, data: imageBase64 },
          },
          {
            type: 'text',
            text: `Du är expert på sportfiske i Sverige. Analysera bilden.
Svara ENBART med JSON:
{"name":"...","type":"wobler/jig/spinnare/fluga/dropshot/softbait/spo/annat","color":"...","size":"...","fish_tags":["..."],"description":"..."}`,
          },
        ],
      }],
    }, apiKey);

    if (response.error) {
      return res.status(500).json({ error: 'Anthropic: ' + response.error.message });
    }

    const text  = (response.content?.[0]?.text) ?? '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return res.status(500).json({ error: 'Inget JSON i svaret', raw: text.slice(0, 200) });

    res.status(200).json(JSON.parse(match[0]));
  } catch (e) {
    console.error('analyze-image:', e.message);
    res.status(500).json({ error: e.message });
  }
};
