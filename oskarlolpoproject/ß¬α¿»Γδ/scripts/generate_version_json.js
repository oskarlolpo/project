// Скрипт для генерации version.json из GitHub Releases OnixClient/onix_compatible_appx
// Требует Node.js >=18
// Для запуска: node scripts/generate_version_json.js

const fs = require('fs');
const path = require('path');
const https = require('https');

const OWNER = 'OnixClient';
const REPO = 'onix_compatible_appx';
const API_URL = `https://api.github.com/repos/${OWNER}/${REPO}/releases?per_page=100&page=`;
const USER_AGENT = 'Mozilla/5.0 (compatible; OnixBedrockLauncher/1.0)';
const OUT_FILE = path.join(__dirname, '../version.json');
const OUT_FILE_OFFLINE = path.join(__dirname, '../version_offline.json');
const BEDROCK_OUT_FILE = path.join(__dirname, '../bedrock_versions.json');
const MIN_VERSION = '1.16.40';
const MAX_VERSION = '1.21.94';

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': USER_AGENT } }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    }).on('error', reject);
  });
}

async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fetchJson(url);
    } catch (error) {
      if (i === retries - 1) throw error;
      console.log(`Retry ${i + 1}/${retries} for ${url}`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}

function versionInRange(version) {
  // Сравниваем версии как строки по частям
  const parse = (v) => v.split('.').map(Number);
  const [min, max, cur] = [MIN_VERSION, MAX_VERSION, version].map(parse);
  for (let i = 0; i < 3; i++) {
    if (cur[i] < min[i]) return false;
    if (cur[i] > max[i]) return false;
  }
  return true;
}

async function fetchBedrockVersions() {
  console.log('Fetching Bedrock versions from Mojang API...');
  
  try {
    const response = await fetchWithRetry('https://piston-meta.mojang.com/mc/bedrock/all.json');
    
    if (!response || !response.versions) {
      throw new Error('Invalid response format from Mojang API');
    }
    
    const bedrockVersions = response.versions
      .filter(version => versionInRange(version.version))
      .map(version => ({
        id: version.version,
        type: 'bedrock',
        release_date: version.release_date,
        url: version.download_url,
        platform: 'windows',
        architecture: 'x64',
        sha256: version.sha256 || null
      }));
    
    // Сортируем по убыванию (новые сверху)
    bedrockVersions.sort((a, b) => b.id.localeCompare(a.id, undefined, { numeric: true }));
    
    const out = { 
      versions: bedrockVersions,
      fetched_at: new Date().toISOString()
    };
    
    fs.writeFileSync(BEDROCK_OUT_FILE, JSON.stringify(out, null, 2));
    console.log(`✔ Fetched ${bedrockVersions.length} Bedrock versions`);
    
    return out;
  } catch (error) {
    console.error('Error fetching Bedrock versions:', error.message);
    
    // Fallback to cached versions if available
    if (fs.existsSync(BEDROCK_OUT_FILE)) {
      console.log('Loading cached Bedrock versions...');
      return JSON.parse(fs.readFileSync(BEDROCK_OUT_FILE, 'utf-8'));
    }
    
    throw error;
  }
}

async function main() {
  let page = 1;
  let allVersions = [];
  let seen = new Set();
  let totalSkipped = 0;
  while (true) {
    const releases = await fetchJson(API_URL + page);
    if (!releases.length) break;
    for (const rel of releases) {
      const version = rel.tag_name || rel.name;
      if (!version) continue;
      if (seen.has(version)) { totalSkipped++; continue; }
      seen.add(version);
      // Только опубликованные релизы (не draft, не prerelease)
      if (rel.draft || rel.prerelease) continue;
      // Ищем .Appx ассет (без xdelta3)
      const appxAsset = (rel.assets || []).find(a => /\.Appx$/i.test(a.name) && !/xdelta/i.test(a.name));
      if (!appxAsset) continue;
      const id = version;
      const url = appxAsset.browser_download_url;
      allVersions.push({ id, url, sha256: null });
      console.log(`✔ ${id}`);
    }
    page++;
  }
  // Сортируем по убыванию (новые сверху)
  allVersions.sort((a, b) => b.id.localeCompare(a.id, undefined, { numeric: true }));
  const out = { versions: allVersions };
  fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 2));
  fs.writeFileSync(OUT_FILE_OFFLINE, JSON.stringify(out, null, 2));
  console.log(`\nГотово! Сохранено ${allVersions.length} версий. Пропущено дубликатов: ${totalSkipped}`);
  
  // Также получаем Bedrock версии
  await fetchBedrockVersions();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}); 