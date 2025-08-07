// Для работы скрипта установи got: npm install got
const fs = require('fs');
const path = require('path');
const got = require('got').default;
const readline = require('readline');

const VERSION_JSON = path.join(__dirname, '../version.json');
const DOWNLOADS_DIR = path.join(__dirname, '../downloads');
const PARTS = 4; // Количество параллельных потоков
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans); }));
}

function getVersionInfo(version) {
  if (!fs.existsSync(VERSION_JSON)) {
    console.error('version.json не найден!');
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(VERSION_JSON, 'utf-8'));
  return data.versions.find(v => v.id === version);
}

async function getFileSize(url) {
  const res = await got(url, {
    method: 'HEAD',
    http2: true,
    headers: { 'User-Agent': USER_AGENT }
  });
  return parseInt(res.headers['content-length'], 10);
}

async function supportsRange(url) {
  const res = await got(url, {
    method: 'HEAD',
    http2: true,
    headers: { 'User-Agent': USER_AGENT }
  });
  return res.headers['accept-ranges'] === 'bytes';
}

async function downloadPart(url, dest, start, end, partIdx) {
  const headers = {
    'User-Agent': USER_AGENT,
    'Range': `bytes=${start}-${end}`
  };
  const downloadStream = got(url, {
    http2: true,
    headers,
    retry: { limit: 5 },
    timeout: {
      request: 300000,
      connect: 60000,
      response: 300000,
      socket: 300000
    },
    isStream: true
  });
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    downloadStream.pipe(file);
    file.on('finish', resolve);
    file.on('error', reject);
    downloadStream.on('error', reject);
  });
}

async function concatParts(dest, partFiles) {
  const writeStream = fs.createWriteStream(dest);
  for (const part of partFiles) {
    await new Promise((resolve, reject) => {
      const readStream = fs.createReadStream(part);
      readStream.pipe(writeStream, { end: false });
      readStream.on('end', resolve);
      readStream.on('error', reject);
    });
    fs.unlinkSync(part);
  }
  writeStream.end();
}

async function multiPartDownload(url, dest, fileSize) {
  const partSize = Math.ceil(fileSize / PARTS);
  const partFiles = [];
  const tasks = [];
  for (let i = 0; i < PARTS; i++) {
    const start = i * partSize;
    const end = Math.min((i + 1) * partSize - 1, fileSize - 1);
    const partFile = `${dest}.part${i}`;
    partFiles.push(partFile);
    tasks.push(downloadPart(url, partFile, start, end, i));
  }
  let downloaded = Array(PARTS).fill(0);
  let total = fileSize;
  let interval = setInterval(() => {
    let sum = 0;
    for (let i = 0; i < PARTS; i++) {
      if (fs.existsSync(partFiles[i])) {
        downloaded[i] = fs.statSync(partFiles[i]).size;
      }
      sum += downloaded[i];
    }
    process.stdout.write(`\r${((sum/total)*100).toFixed(2)}% [${sum}/${total}]`);
  }, 500);
  await Promise.all(tasks);
  clearInterval(interval);
  process.stdout.write('\n');
  await concatParts(dest, partFiles);
}

async function downloadWithResume(url, dest) {
  // Проверяем поддержку Range
  let fileSize;
  let rangeSupported = false;
  try {
    fileSize = await getFileSize(url);
    rangeSupported = await supportsRange(url);
  } catch (e) {
    console.log('HEAD-запрос не удался, fallback на обычное скачивание');
  }
  if (fileSize && rangeSupported && fileSize > 10 * 1024 * 1024) { // multi-part только для больших файлов
    console.log('Сервер поддерживает Range, используем multi-part download');
    await multiPartDownload(url, dest, fileSize);
    return;
  }
  // Fallback: обычное скачивание с User-Agent и http2
  const downloadStream = got(url, {
    http2: true,
    headers: { 'User-Agent': USER_AGENT },
    retry: { limit: 5 },
    timeout: {
      request: 300000,
      connect: 60000,
      response: 300000,
      socket: 300000
    },
    isStream: true
  });
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    let downloaded = 0;
    let total = fileSize || 0;
    downloadStream.on('downloadProgress', progress => {
      downloaded = progress.transferred;
      total = progress.total || total;
      if (total) {
        process.stdout.write(`\r${((downloaded/total)*100).toFixed(2)}% [${downloaded}/${total}]`);
      } else {
        process.stdout.write(`\r${downloaded} bytes`);
      }
    });
    downloadStream.pipe(file);
    file.on('finish', () => {
      process.stdout.write('\n');
      resolve();
    });
    file.on('error', reject);
    downloadStream.on('error', reject);
  });
}

(async () => {
  if (!fs.existsSync(DOWNLOADS_DIR)) fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
  const version = (await ask('Введите версию для скачивания (например, 1.21.94): ')).trim();
  const info = getVersionInfo(version);
  if (!info) {
    console.error('Версия не найдена в version.json!');
    process.exit(1);
  }
  const fileName = `${version}.Appx`;
  const dest = path.join(DOWNLOADS_DIR, fileName);
  console.log('Скачивание', info.url);
  await downloadWithResume(info.url, dest);
  console.log(`Файл скачан: ${dest}`);
})(); 