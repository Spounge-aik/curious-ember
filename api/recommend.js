const https = require('https');

function callClaude(body, apiKey) {
  return new Promise((resolve, reject) => {
    const data = Buffer.from(JSON.stringify(body));
    const req = https.request({
      hostname: 'api.anthropic.com',
      path:     '/v1/messages',
      method:   'POST',
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

function getSeason() {
  const m = new Date().getMonth() + 1;
  return m <= 2 || m === 12 ? 'vinter' : m <= 5 ? 'vår' : m <= 8 ? 'sommar' : 'höst';
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST')    { res.status(405).end(); return; }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY saknas i Vercel' });
  }

  const { lakeName, fishName, rods = [], lures = [] } = req.body ?? {};

  const rodsJson  = rods.map(r  => ({ id: r.id, name: r.name, description: r.description, tags: r.tags }));
  const luresJson = lures.map(l => ({ id: l.id, name: l.name, type: l.type, color: l.color, size: l.size, tags: l.tags }));

  if (!rodsJson.length && !luresJson.length) {
    return res.status(200).json({
      rods: [], lures: [],
      general_tip: 'Du har inget utrustningsbibliotek ännu. Lägg till spön och beten under Utrustning!',
    });
  }

  try {
    const response = await callClaude({
      model:      'claude-opus-4-5',
      max_tokens: 1024,
      system:     'Du är expert på sportfiske i Sverige. Svara ENBART med giltig JSON.',
      messages: [{
        role: 'user',
        content: `Jag ska fiska ${fishName} i ${lakeName}. Det är ${getSeason()}.
Spöbibliotek: ${JSON.stringify(rodsJson)}
Betebibliotek: ${JSON.stringify(luresJson)}
Välj max 3 spön och max 5 beten (använd exakta id:n).
Svara med JSON: {"rods":[{"id":"...","name":"...","reason":"...","rank":1}],"lures":[{"id":"...","name":"...","reason":"...","rank":1}],"general_tip":"..."}`,
      }],
    }, apiKey);

    if (response.error) {
      return res.status(500).json({ error: 'Anthropic: ' + response.error.message });
    }

    const text = response.content?.[0]?.text ?? '';
    const json = JSON.parse(text.match(/\{[\s\S]*\}/)[0]);

    json.rods  = (json.rods  ?? []).map(r => ({ ...r, image_url: rods.find(x => x.id === r.id)?.image_url }));
    json.lures = (json.lures ?? []).map(l => ({ ...l, image_url: lures.find(x => x.id === l.id)?.image_url }));

    res.status(200).json(json);
  } catch (e) {
    console.error('recommend:', e.message);
    res.status(500).json({ error: e.message });
  }
};
