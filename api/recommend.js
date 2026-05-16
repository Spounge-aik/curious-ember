import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `Du är en expert på sportfiske i Sverige. Ge konkreta, praktiska rekommendationer på svenska baserat på användarens eget utrustningsbibliotek. Svara alltid med giltig JSON.`;

function getSeason() {
  const m = new Date().getMonth() + 1;
  return m<=2||m===12?'vinter':m<=5?'vår':m<=8?'sommar':'höst';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { lakeName, fishName, rods = [], lures = [] } = req.body;

  const rodsJson  = rods.map(r => ({ id: r.id, name: r.name, description: r.description, tags: r.tags }));
  const luresJson = lures.map(l => ({ id: l.id, name: l.name, type: l.type, color: l.color, size: l.size, tags: l.tags }));

  if (!rodsJson.length && !luresJson.length) {
    return res.json({
      rods: [], lures: [],
      general_tip: 'Du har inget utrustningsbibliotek ännu. Lägg till spön och beten under Mitt bibliotek!',
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
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].text;
    const json = JSON.parse(text.match(/\{[\s\S]*\}/)[0]);

    // Koppla image_url från originaldatan
    json.rods  = (json.rods  ?? []).map(r => ({ ...r, image_url: rods.find(x=>x.id===r.id)?.image_url }));
    json.lures = (json.lures ?? []).map(l => ({ ...l, image_url: lures.find(x=>x.id===l.id)?.image_url }));

    res.json(json);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
