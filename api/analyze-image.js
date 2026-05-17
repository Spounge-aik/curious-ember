import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { imageBase64, mediaType = 'image/jpeg' } = req.body;
  if (!imageBase64) return res.status(400).json({ error: 'Ingen bild' });

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
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

    const text = response.content[0].text;
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return res.status(500).json({ error: 'Kunde inte tolka svar' });

    res.json(JSON.parse(match[0]));
  } catch (e) {
    // Logga nyckelstatus för felsökning (nyckelns första/sista tecken)
    const key = process.env.ANTHROPIC_API_KEY ?? '';
    const keyInfo = key ? `key=${key.slice(0,8)}…${key.slice(-4)}` : 'key=MISSING';
    console.error(`analyze-image error [${keyInfo}]:`, e.message);
    res.status(500).json({ error: e.message, hint: key ? null : 'ANTHROPIC_API_KEY saknas i Vercel' });
  }
}
