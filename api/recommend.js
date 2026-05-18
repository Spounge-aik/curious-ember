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

function season() {
  const m = new Date().getMonth() + 1;
  return m <= 2 || m === 12 ? 'vinter' : m <= 5 ? 'vår' : m <= 8 ? 'sommar' : 'höst';
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).json({ error: 'API-nyckel saknas' });

  const body       = req.body || {};
  const lakeName   = body.lakeName;
  const fishName   = body.fishName;
  const rods       = body.rods       || [];
  const lures      = body.lures      || [];
  const conditions = body.conditions || '';

  if (!rods.length && !lures.length) {
    return res.status(200).json({
      rods: [],
      lures: [],
      general_tip: 'Lägg till spön och beten under Utrustning för att få rekommendationer!',
    });
  }

  try {
    const result = await post({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: 'Du är expert på sportfiske i Sverige. Svara ENBART med giltig JSON.',
      messages: [
        {
          role: 'user',
          content:
            'Fiska ' + fishName + ' i ' + lakeName + '. Säsong: ' + season() + '.\n' +
            (conditions ? 'Aktuella förhållanden: ' + conditions + '.\n' : '') +
            'Spön: ' + JSON.stringify(rods.map((r) => ({ id: r.id, name: r.name, tags: r.tags }))) + '\n' +
            'Beten: ' + JSON.stringify(lures.map((l) => ({ id: l.id, name: l.name, type: l.type, color: l.color, size: l.size, tags: l.tags }))) + '\n' +
            'Anpassa rekommendationerna efter förhållandena. Välj max 3 spön och max 5 beten. Svar: {"rods":[{"id":"","name":"","reason":"","rank":1}],"lures":[{"id":"","name":"","reason":"","rank":1}],"general_tip":""}',
        },
      ],
    });

    if (result.error) return res.status(500).json({ error: result.error.message });

    const text = (result.content && result.content[0] && result.content[0].text) || '';
    const json = JSON.parse(text.match(/\{[\s\S]*\}/)[0]);

    json.rods  = (json.rods  || []).map((r) => ({ ...r, image_url: (rods.find((x) => x.id === r.id) || {}).image_url }));
    json.lures = (json.lures || []).map((l) => ({ ...l, image_url: (lures.find((x) => x.id === l.id) || {}).image_url }));

    res.status(200).json(json);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
