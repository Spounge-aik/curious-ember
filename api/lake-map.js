const https  = require('https');
const UTIF   = require('utif');
const { PNG } = require('pngjs');

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error('SMHI svarade ' + res.statusCode));
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('Timeout mot SMHI')); });
  });
}

module.exports = async function handler(req, res) {
  const { id } = req.query;

  if (!id || !/^\d{6}-\d{6}$/.test(id)) {
    return res.status(400).json({ error: 'Ogiltigt sjö-ID' });
  }

  try {
    const url     = `https://vattenwebb.smhi.se/svarwebb/rest/downloadmap/${id}`;
    const tiffBuf = await fetchBuffer(url);

    // Avkoda TIFF
    const ifds = UTIF.decode(tiffBuf);
    UTIF.decodeImage(tiffBuf, ifds[0]);
    const img  = ifds[0];
    const w    = img.width  || (img.t256 && img.t256[0]);
    const h    = img.height || (img.t257 && img.t257[0]);
    if (!w || !h) throw new Error(`Ogiltiga dimensioner (${w}x${h})`);

    const rgba = UTIF.toRGBA8(img);

    // Koda som PNG
    const png  = new PNG({ width: w, height: h });
    png.data   = Buffer.from(rgba);
    const pngBuf = PNG.sync.write(png);

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(pngBuf);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
