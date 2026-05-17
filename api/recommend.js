import https from 'https';

function callClaude(body) {
  return new Promise((resolve, reject) => {
    const data = Buffer.from(JSON.stringify(body));
    const req = https.request({
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length': data.length,
      },
    }, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch { reject(new Error('JSON-parse fel')); }
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

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY saknas i Vercel environment variables' });
  }

  const { lakeName, fishName, rods = [], lures = [] } = req.body ?? {};

  const rodsJson  = rods.map(r  => ({ id: r.id, name: r.name, description: r.description, tags: r.tags }));
  const luresJson = lures.map(l => ({ id: l.id, name: l.name, type: l.type, color: l.color, size: l.size, tags: l.tags }));

  if (!rodsJson.length && !luresJson.length) {
    return res.json({
      rods: [], lures: [],
      general_tip: 'Du har inget utrustningsbibliotek ännu. Lägg till spön och beten under Utrustning!',
    });
  }

  const prompt = `Jag ska fiska ${fishName} i ${lakeName}. Det är ${getSeason()}.

Mitt spöbibliotek: ${JSON.stringify(rodsJson)}
Mitt betebibliotek: ${JSON.stringify(luresJson)}

Välj max 3 spön och max 5 beten från mitt bibliotek (använd exakta id:n).
Svara ENBART med JSON:
{
  "rods":  [{"id":"...","name":"...","reason":"...","rank":1}],
  "lures": [{"id":"...","name":"...","reason":"...","rank":1}],
  "general_tip": "..."
}`;

  try {
    const response = await callClaude({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      system: 'Du är en expert på sportfiske i Sverige. Ge konkreta rekommendationer på svenska. Svara ENBART med giltig JSON.',
      messages: [{ role: 'user', content: prompt }],
    });

    if (response.error) {
      return res.status(500).json({ error: `Anthropic: ${response.error.message}` });
    }

    const text = response.content?.[0]?.text ?? '';
    const json = JSON.parse(text.match(/\{[\s\S]*\}/)[0]);

    json.rods  = (json.rods  ?? []).map(r => ({ ...r, image_url: rods.find(x => x.id === r.id)?.image_url }));
    json.lures = (json.lures ?? []).map(l => ({ ...l, image_url: lures.find(x => x.id === l.id)?.image_url }));

    res.json(json);
  } catch (e) {
    console.error('recommend error:', e.message);
    res.status(500).json({ error: e.message });
  }
}
