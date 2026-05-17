const https = require('https');

module.exports = async function handler(req, res) {
  const { id } = req.query;

  // Validera ID-format (siffror och bindestreck)
  if (!id || !/^\d{6}-\d{6}$/.test(id)) {
    return res.status(400).json({ error: 'Ogiltigt sjö-ID' });
  }

  const url = `https://vattenwebb.smhi.se/svarwebb/rest/downloadmap/${id}`;

  return new Promise((resolve) => {
    https.get(url, (smhiRes) => {
      if (smhiRes.statusCode !== 200) {
        res.status(404).json({ error: 'Djupkarta saknas för denna sjö' });
        return resolve();
      }

      res.setHeader('Content-Type', 'image/tiff');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.setHeader('Access-Control-Allow-Origin', '*');
      smhiRes.pipe(res);
      smhiRes.on('end', resolve);
      smhiRes.on('error', (e) => {
        console.error('SMHI stream error:', e);
        resolve();
      });
    }).on('error', (e) => {
      res.status(502).json({ error: 'Kunde inte nå SMHI: ' + e.message });
      resolve();
    });
  });
};
