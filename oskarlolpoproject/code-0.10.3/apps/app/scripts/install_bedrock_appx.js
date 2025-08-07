const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { exec } = require('child_process');

const DOWNLOADS_DIR = path.join(__dirname, '../downloads');

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans); }));
}

function getLatestAppx() {
  if (!fs.existsSync(DOWNLOADS_DIR)) return null;
  const files = fs.readdirSync(DOWNLOADS_DIR)
    .filter(f => f.endsWith('.Appx'))
    .map(f => ({
      name: f,
      time: fs.statSync(path.join(DOWNLOADS_DIR, f)).mtime.getTime()
    }))
    .sort((a, b) => b.time - a.time);
  return files.length ? path.join(DOWNLOADS_DIR, files[0].name) : null;
}

async function main() {
  let appxPath = (await ask('Введите путь к .Appx файлу (Enter для последнего скачанного): ')).trim();
  if (!appxPath) {
    appxPath = getLatestAppx();
    if (!appxPath) {
      console.error('В папке downloads не найдено .Appx файлов!');
      process.exit(1);
    }
    console.log('Используется файл:', appxPath);
  }
  if (!fs.existsSync(appxPath)) {
    console.error('Файл не найден:', appxPath);
    process.exit(1);
  }
  console.log('Установка .Appx через PowerShell...');
  const cmd = `powershell -NoProfile -ExecutionPolicy Bypass -Command "Add-AppxPackage -ForceApplicationShutdown -Path \"${appxPath}\""`;
  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      console.error('Ошибка установки:', error.message);
      if (stderr) console.error(stderr);
      process.exit(1);
    }
    console.log('Установка завершена успешно!');
    if (stdout) console.log(stdout);
  });
}

main(); 