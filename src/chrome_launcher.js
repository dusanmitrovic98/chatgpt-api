const { exec } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

const CONFIG = {
  CHROME_PATH: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  CHROME_USER_DATA_DIR: path.join(process.env.LOCALAPPDATA, 'Google\\Chrome\\User Data'),
};

const launchChromeIncognito = async () => {
  const args = [
    '--incognito',
    `--user-data-dir="${CONFIG.CHROME_USER_DATA_DIR}"`,
    '--no-first-run',
    '--no-default-browser-check',
    'https://chat.openai.com'
  ];
  
  console.log(`Launching Chrome with command: "${CONFIG.CHROME_PATH}" ${args.join(' ')}`);
  const chrome = exec(`"${CONFIG.CHROME_PATH}" ${args.join(' ')}`);
  
  console.log(`Chrome launched with PID: ${chrome.pid}`);
  
  // Write the PID to a file so the server can read it later
  await fs.writeFile('chrome_pid.txt', chrome.pid.toString());
};

launchChromeIncognito().catch(console.error);