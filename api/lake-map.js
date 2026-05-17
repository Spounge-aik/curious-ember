const https = require('https');
const sharp = require('sharp');

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error('SMHI svarade ' + res.statusCode));
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
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
    const pngBuf  = await sharp(tiffBuf).png().toBuffer();

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(pngBuf);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
