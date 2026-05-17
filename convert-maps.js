// Kör en gång lokalt: node convert-maps.js
const https   = require('https');
const fs      = require('fs');
const path    = require('path');
const AdmZip  = require('adm-zip');
const UTIF    = require('utif');
const { PNG } = require('pngjs');

const LAKES = [
  { id: 'dagarn',    smhiId: '664197-149337' },
  { id: 'trekanten', smhiId: '657902-162594' },
];

const TARGET_W = 1600; // Max bredd i px

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

// Enkel nearest-neighbor nedskalning
function scaleDown(rgba, sw, sh, tw, th) {
  const out = new Uint8Array(tw * th * 4);
  for (let y = 0; y < th; y++) {
    const sy = Math.floor(y * sh / th);
    for (let x = 0; x < tw; x++) {
      const sx  = Math.floor(x * sw / tw);
      const si  = (sy * sw + sx) * 4;
      const di  = (y  * tw + x)  * 4;
      out[di]   = rgba[si];
      out[di+1] = rgba[si+1];
      out[di+2] = rgba[si+2];
      out[di+3] = rgba[si+3];
    }
  }
  return out;
}

(async () => {
  const outDir = path.join(__dirname, 'maps');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

  for (const lake of LAKES) {
    console.log(`Hämtar ${lake.id}...`);
    const url    = `https://vattenwebb.smhi.se/svarwebb/rest/downloadmap/${lake.smhiId}`;
    const zipBuf = await fetchBuffer(url);

    const zip   = new AdmZip(zipBuf);
    const entry = zip.getEntries().find(e => e.entryName.toLowerCase().endsWith('.tif'));
    if (!entry) { console.error('  Ingen TIFF hittad'); continue; }

    const tiffBuf = entry.getData();
    const ifds    = UTIF.decode(tiffBuf);
    UTIF.decodeImage(tiffBuf, ifds[0]);
    const img     = ifds[0];
    const sw      = img.width  || (img.t256?.[0]);
    const sh      = img.height || (img.t257?.[0]);
    console.log(`  Original: ${sw}×${sh}`);

    let rgba = UTIF.toRGBA8(img);
    let w = sw, h = sh;

    if (sw > TARGET_W) {
      w = TARGET_W;
      h = Math.round(sh * TARGET_W / sw);
      console.log(`  Skalas till: ${w}×${h}`);
      rgba = scaleDown(rgba, sw, sh, w, h);
    }

    const png    = new PNG({ width: w, height: h });
    png.data     = Buffer.from(rgba);
    const pngBuf = PNG.sync.write(png);

    const outPath = path.join(outDir, `${lake.id}.png`);
    fs.writeFileSync(outPath, pngBuf);
    console.log(`  ✓ Sparad: maps/${lake.id}.png (${Math.round(pngBuf.length/1024)} KB)`);
  }
  console.log('Klart!');
})();
