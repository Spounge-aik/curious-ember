const https = require('https');

function post(body) {
  return new Promise((resolve, reject) => {
    const payload = Buffer.from(JSON.stringify(body));
    const req = https.request(
      {
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'Content-Length': payload.length,
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try { resolve(JSON.parse(data)); }
          catch (e) { reject(new Error('Parse error: ' + data.slice(0, 200))); }
        });
      }
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).json({ error: 'API-nyckel saknas' });

  const { imageBase64, mediaType = 'image/jpeg' } = req.body || {};
  if (!imageBase64) return res.status(400).json({ error: 'Ingen bild' });

  try {
    const result = await post({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
            {
              type: 'text',
              text: `Du är expert på sportfiske i Sverige. Analysera bilden och identifiera betet eller spöet.
Svara ENBART med giltig JSON, inga förklaringar:
{
  "name": "kortnamn på produkten (max 4 ord)",
  "type": "en av: wobler, jig, spinnare, fluga, dropshot, softbait, spö, annat",
  "color": "huvudfärgen på betet eller spöet",
  "size": "uppskattad längd eller storlek, t.ex. 7cm eller Medium",
  "fish_tags": ["lista på 1-3 svenska fiskarter detta passar för, t.ex. gädda, abborre, gösen"],
  "description": "en mening på svenska om betetets användning och karaktär"
}`,
            },
          ],
        },
      ],
    });

    if (result.error) return res.status(500).json({ error: result.error.message });

    const text = (result.content && result.content[0] && result.content[0].text) || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return res.status(500).json({ error: 'Inget JSON i svar' });

    res.status(200).json(JSON.parse(match[0]));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
