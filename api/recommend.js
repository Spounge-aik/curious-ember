function getSeason() {
  const m = new Date().getMonth() + 1;
  return m <= 2 || m === 12 ? 'vinter' : m <= 5 ? 'vår' : m <= 8 ? 'sommar' : 'höst';
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST')    { res.status(405).end(); return; }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY saknas' });

  const { lakeName, fishName, rods = [], lures = [] } = req.body ?? {};

  if (!rods.length && !lures.length) {
    return res.status(200).json({
      rods: [], lures: [],
      general_tip: 'Du har inget utrustningsbibliotek ännu. Lägg till spön och beten under Utrustning!',
    });
  }

  const rodsJson  = rods.map(r  => ({ id: r.id, name: r.name, description: r.description, tags: r.tags }));
  const luresJson = lures.map(l => ({ id: l.id, name: l.name, type: l.type, color: l.color, size: l.size, tags: l.tags }));

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
        max_tokens: 1024,
        system:     'Du är expert på sportfiske i Sverige. Svara ENBART med giltig JSON.',
        messages: [{
          role: 'user',
          content: `Jag ska fiska ${fishName} i ${lakeName}. Det är ${getSeason()}.
Spöbibliotek: ${JSON.stringify(rodsJson)}
Betebibliotek: ${JSON.stringify(luresJson)}
Välj max 3 spön och max 5 beten (använd exakta id:n).
Svar: {"rods":[{"id":"...","name":"...","reason":"...","rank":1}],"lures":[{"id":"...","name":"...","reason":"...","rank":1}],"general_tip":"..."}`,
        }],
      }),
    });

    const d = await r.json();
    if (d.error) return res.status(500).json({ error: d.error.message });

    const text = d.content?.[0]?.text ?? '';
    const json = JSON.parse(text.match(/\{[\s\S]*\}/)[0]);

    json.rods  = (json.rods  ?? []).map(x => ({ ...x, image_url: rods.find(o => o.id === x.id)?.image_url }));
    json.lures = (json.lures ?? []).map(x => ({ ...x, image_url: lures.find(o => o.id === x.id)?.image_url }));

    res.status(200).json(json);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
