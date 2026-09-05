// Downloads a Windows x64 Java 21 JRE from Eclipse Temurin (Adoptium) and
// unpacks it into build/jre so electron-builder can bundle it as a resource -
// nobody installing Camel Launcher needs to install Java separately.
// Not committed to git (see .gitignore) - this runs automatically before
// every `npm run dist` via the "predist" script.
const fs = require('fs');
const path = require('path');
const https = require('https');
const yauzl = require('yauzl');

const JRE_API_URL = 'https://api.adoptium.net/v3/binary/latest/21/ga/windows/x64/jre/hotspot/normal/eclipse?project=jdk';
const OUT_DIR = path.join(__dirname, '..', 'build', 'jre');
const TMP_ZIP = path.join(__dirname, '..', 'build', 'jre-download.zip');
const TMP_EXTRACT = path.join(__dirname, '..', 'build', 'jre-extract-tmp');

function download(url, destPath, redirectsLeft = 5) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        if (redirectsLeft <= 0) return reject(new Error('Too many redirects'));
        return resolve(download(res.headers.location, destPath, redirectsLeft - 1));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`Download failed with status ${res.statusCode}`));
      }
      const file = fs.createWriteStream(destPath);
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
      file.on('error', reject);
    }).on('error', reject);
  });
}

function extractZip(zipPath, destDir) {
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (err, zip) => {
      if (err) return reject(err);
      zip.readEntry();
      zip.on('entry', (entry) => {
        const outPath = path.join(destDir, entry.fileName);
        if (entry.fileName.endsWith('/')) {
          fs.mkdirSync(outPath, { recursive: true });
          zip.readEntry();
          return;
        }
        fs.mkdirSync(path.dirname(outPath), { recursive: true });
        zip.openReadStream(entry, (err2, readStream) => {
          if (err2) return reject(err2);
          const writeStream = fs.createWriteStream(outPath);
          readStream.pipe(writeStream);
          writeStream.on('finish', () => zip.readEntry());
          writeStream.on('error', reject);
        });
      });
      zip.on('end', resolve);
      zip.on('error', reject);
    });
  });
}

async function main() {
  if (fs.existsSync(path.join(OUT_DIR, 'bin', 'javaw.exe'))) {
    console.log('[fetch-jre] build/jre already present, skipping download.');
    return;
  }

  fs.mkdirSync(path.dirname(TMP_ZIP), { recursive: true });
  console.log('[fetch-jre] Downloading Java 21 JRE from Adoptium...');
  await download(JRE_API_URL, TMP_ZIP);

  console.log('[fetch-jre] Extracting...');
  fs.rmSync(TMP_EXTRACT, { recursive: true, force: true });
  fs.mkdirSync(TMP_EXTRACT, { recursive: true });
  await extractZip(TMP_ZIP, TMP_EXTRACT);

  // The zip's single top-level entry is a version-named folder (e.g.
  // "jdk-21.0.12.1+1-jre") - flatten that away so the bundled path is stable.
  const entries = fs.readdirSync(TMP_EXTRACT);
  const versionDir = entries.find((e) => fs.statSync(path.join(TMP_EXTRACT, e)).isDirectory());
  if (!versionDir) throw new Error('Unexpected JRE archive layout - no top-level folder found.');

  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.renameSync(path.join(TMP_EXTRACT, versionDir), OUT_DIR);

  fs.rmSync(TMP_EXTRACT, { recursive: true, force: true });
  fs.rmSync(TMP_ZIP, { force: true });

  if (!fs.existsSync(path.join(OUT_DIR, 'bin', 'javaw.exe'))) {
    throw new Error('javaw.exe not found after extracting - JRE archive layout may have changed.');
  }
  console.log('[fetch-jre] Done: build/jre is ready.');
}

main().catch((err) => {
  console.error('[fetch-jre] Failed:', err.message);
  process.exit(1);
});
