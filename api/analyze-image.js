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
        catch { reject(new Error('JSON-parse fel: ' + raw.slice(0, 200))); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { imageBase64, mediaType = 'image/jpeg' } = req.body ?? {};
  if (!imageBase64) return res.status(400).json({ error: 'Ingen bild skickades' });

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY saknas i Vercel environment variables' });
  }

  try {
    const response = await callClaude({
      model: 'claude-sonnet-4-5',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: imageBase64 },
          },
          {
            type: 'text',
            text: `Du är expert på sportfiske i Sverige. Analysera denna bild på ett fiskebete eller fiskespö.

Svara ENBART med JSON i exakt detta format:
{
  "name": "Produktnamn eller kort beskrivande namn (max 4 ord)",
  "type": "Betetyp: wobler / jig / spinnare / fluga / jigg / dropshot / softbait / spö / annat",
  "color": "Huvudfärg på betet/spöet",
  "size": "Uppskattad storlek t.ex. '9 cm' eller 'Medium' eller 'H: 2.7m'",
  "fish_tags": ["max 3 svenska fiskarter som betet/spöet passar för, t.ex. gädda, abborre"],
  "description": "En mening på svenska om betetets/spöets karaktär och användning"
}

Om du inte kan identifiera vad det är, gör ditt bästa utifrån vad som syns.`,
          },
        ],
      }],
    });

    if (response.error) {
      return res.status(500).json({ error: `Anthropic: ${response.error.message}` });
    }

    const text  = response.content?.[0]?.text ?? '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return res.status(500).json({ error: 'Inget JSON i svaret: ' + text.slice(0, 100) });

    res.json(JSON.parse(match[0]));
  } catch (e) {
    console.error('analyze-image error:', e.message);
    res.status(500).json({ error: e.message });
  }
}
