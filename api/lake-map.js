const https   = require('https');
const UTIF    = require('utif');
const AdmZip  = require('adm-zip');
const { PNG } = require('pngjs');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const BUCKET       = 'lake-maps';
const TARGET_W     = 1600;

function fetchBuffer(url, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, buffer: Buffer.concat(chunks) }));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function supabaseUpload(id, pngBuf) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return Promise.resolve();
  const url  = new URL(`/storage/v1/object/${BUCKET}/${id}.png`, SUPABASE_URL);
  const body = pngBuf;
  return new Promise((resolve) => {
    const req = https.request({
      hostname: url.hostname,
      path:     url.pathname,
      method:   'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type':  'image/png',
        'Content-Length': body.length,
        'x-upsert':      'true',
      },
    }, res => { res.resume(); res.on('end', resolve); });
    req.on('error', resolve); // tyst fel
    req.setTimeout(20000, () => { req.destroy(); resolve(); });
    req.write(body);
    req.end();
  });
}

function tiffToPng(zipBuffer) {
  const zip   = new AdmZip(zipBuffer);
  const entry = zip.getEntries().find(e => e.entryName.toLowerCase().endsWith('.tif'));
  if (!entry) throw new Error('Ingen TIFF i ZIP');

  const tiffBuf = entry.getData();
  const ifds    = UTIF.decode(tiffBuf);
  UTIF.decodeImage(tiffBuf, ifds[0]);
  const img = ifds[0];
  const sw  = img.width  || (img.t256?.[0]);
  const sh  = img.height || (img.t257?.[0]);
  if (!sw || !sh) throw new Error(`Ogiltiga dimensioner (${sw}×${sh})`);

  const rgba = UTIF.toRGBA8(img);

  // Skala ner till max TARGET_W bredd
  let w, h, data;
  if (sw > TARGET_W) {
    w = TARGET_W;
    h = Math.round(sh * TARGET_W / sw);
    const scaled = new Uint8Array(w * h * 4);
    for (let y = 0; y < h; y++) {
      const sy = Math.floor(y * sh / h);
      for (let x = 0; x < w; x++) {
        const sx = Math.floor(x * sw / w);
        const si = (sy * sw + sx) * 4;
        const di = (y  * w  + x)  * 4;
        scaled[di]   = rgba[si];
        scaled[di+1] = rgba[si+1];
        scaled[di+2] = rgba[si+2];
        scaled[di+3] = rgba[si+3];
      }
    }
    data = scaled;
  } else {
    w = sw; h = sh; data = rgba;
  }

  const png  = new PNG({ width: w, height: h });
  png.data   = Buffer.from(data);
  return PNG.sync.write(png);
}

module.exports = async function handler(req, res) {
  const { id } = req.query;
  if (!id || !/^\d{6}-\d{6}$/.test(id)) {
    return res.status(400).json({ error: 'Ogiltigt sjö-ID' });
  }

  const sendPng = (buf, cached) => {
    res.setHeader('Content-Type',  'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('X-Cache',       cached ? 'HIT' : 'MISS');
    res.send(buf);
  };

  // 1. Kolla Supabase-cache
  if (SUPABASE_URL) {
    const cacheUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${id}.png`;
    try {
      const cached = await fetchBuffer(cacheUrl, 5000);
      if (cached.status === 200) return sendPng(cached.buffer, true);
    } catch { /* cache miss – fortsätt */ }
  }

  // 2. Hämta ZIP från SMHI och konvertera
  try {
    const smhiUrl = `https://vattenwebb.smhi.se/svarwebb/rest/downloadmap/${id}`;
    const zip     = await fetchBuffer(smhiUrl, 12000);
    if (zip.status !== 200) return res.status(404).json({ error: 'Karta saknas i SMHI SVAR' });

    const pngBuf = tiffToPng(zip.buffer);

    // 3. Ladda upp till Supabase i bakgrunden (blockerar inte svaret)
    supabaseUpload(id, pngBuf);

    return sendPng(pngBuf, false);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
