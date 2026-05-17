const https = require('https');

function post(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    req.setTimeout(25000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.write(body);
    req.end();
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { fishName, fishData, lakeName, weather, season, mapBase64 } = req.body;

  const weatherText = weather
    ? `Aktuellt väder: ${weather.temp ?? '?'}°C, vind ${weather.wind ?? '?'} m/s, nederbörd ${weather.precip ?? 0} mm.`
    : '';

  const prompt = `Du är en erfaren fiskeguide i Sverige. Analysera djupkartan för sjön ${lakeName} och rekommendera exakt 3 bra fiskeplatser för ${fishName}.

Fiskens preferenser: ${fishData}
Årstid: ${season}
${weatherText}

Titta på djupkartan och identifiera strukturer som djupkanter, grunda vikar, vegetation, stenkast och liknande. Basera rekommendationerna på dessa strukturer kombinerat med fiskens beteende.

Svara ENDAST med ett JSON-objekt i detta format (ingen annan text):
{
  "spots": [
    { "name": "Kortnamn på platsen", "description": "2-3 meningar om varför just här, vad som syns på kartan och hur man fiskar." },
    { "name": "...", "description": "..." },
    { "name": "...", "description": "..." }
  ]
}`;

  const payload = JSON.stringify({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: mapBase64 ? [
        { type: 'image', source: { type: 'base64', media_type: 'image/png', data: mapBase64 } },
        { type: 'text', text: prompt }
      ] : [
        { type: 'text', text: prompt }
      ]
    }]
  });

  try {
    const result = await post({
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, payload);

    if (result.status !== 200) {
      return res.status(result.status).json({ error: result.body?.error?.message ?? 'API-fel' });
    }

    const text = result.body.content?.[0]?.text ?? '';
    const json = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? '{}');
    res.json(json);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
