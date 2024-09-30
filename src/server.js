const express = require("express");
const cors = require("cors");
const { exec } = require('child_process');
const path = require('path');

const CONFIG = {
  PORT: 60001,
  TIMEOUT: 30000,
  CHROME_PATH: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  CHROME_USER_DATA_DIR: path.join(process.env.LOCALAPPDATA, 'Google\\Chrome\\User Data'),
};

const STATE = {
  latestPrompt: "",
  isProcessing: false,
  lastResponse: "",
  resolveResponse: null
};

const app = express();

app.use(cors());
app.use(express.json());

const isChromeRunning = () => {
  return new Promise((resolve) => {
    exec('tasklist /FI "IMAGENAME eq chrome.exe"', (error, stdout) => {
      if (error) {
        console.error('Error checking Chrome process:', error);
        resolve(false);
      } else {
        resolve(stdout.toLowerCase().includes('chrome.exe'));
      }
    });
  });
};

const launchChrome = async () => {
  const chromeRunning = await isChromeRunning();
  
  if (chromeRunning) {
    console.log('Chrome is already running. Skipping launch.');
    return;
  }

  const args = [
    '--incognito',
    `--user-data-dir="${CONFIG.CHROME_USER_DATA_DIR}"`,
    '--no-first-run',
    '--no-default-browser-check',
    'https://chat.openai.com'
  ];
  
  return new Promise((resolve, reject) => {
    console.log(`Launching Chrome with command: "${CONFIG.CHROME_PATH}" ${args.join(' ')}`);
    exec(`"${CONFIG.CHROME_PATH}" ${args.join(' ')}`, (error, stdout, stderr) => {
      if (error) {
        console.error('Error launching Chrome:', error);
        reject(error);
      } else {
        console.log('Chrome launched successfully');
        resolve();
      }
    });
  });
};

app.post("/ask", async (req, res) => {
  const prompt = req.body.prompt;
  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "Valid prompt is required" });
  }
  if (STATE.isProcessing) {
    return res.status(429).json({ error: "Currently processing a prompt. Please wait." });
  }

  STATE.latestPrompt = prompt;
  STATE.isProcessing = true;
  console.clear();
  console.log(`Prompt: ${prompt}`);

  try {
    const response = await Promise.race([
      new Promise((resolve) => {
        STATE.resolveResponse = resolve;
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), CONFIG.TIMEOUT))
    ]);

    res.json({ response });
  } catch (error) {
    STATE.isProcessing = false;
    if (error.message === "Timeout") {
      res.status(504).json({ error: `Request timed out after ${CONFIG.TIMEOUT / 1000} seconds` });
    } else {
      res.status(500).json({ error: "An error occurred while processing the prompt" });
    }
  } finally {
    if (STATE.resolveResponse) {
      STATE.resolveResponse = null;
    }
  }
});

app.get("/latest-prompt", (req, res) => {
  res.json({ prompt: STATE.latestPrompt });
});

app.post("/log-response", (req, res) => {
  const response = req.body.response;
  if (!response || typeof response !== "string") {
    return res.status(400).json({ error: "Valid response is required" });
  }
  
  STATE.isProcessing = false;
  STATE.lastResponse = response;
  STATE.latestPrompt = "";
  console.clear();
  console.log(`Response: ${response}`);
  
  if (STATE.resolveResponse) {
    STATE.resolveResponse(response);
    STATE.resolveResponse = null;
  }
  
  res.json({ response });
});

app.get("/last-response", (req, res) => {
  res.json({ response: STATE.lastResponse });
});

app.post("/log-error", (req, res) => {
  const { message } = req.body;
  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "Valid error message is required" });
  } 
  
  STATE.isProcessing = false;
  console.error(`Error occurred: ${message}`);
  
  if (STATE.resolveResponse) { 
    STATE.resolveResponse(null);
    STATE.resolveResponse = null;
  }
  
  res.json({ message: "Error logged" });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
}); 

// Check if Chrome is running and launch it if it's not
launchChrome();

const server = app.listen(CONFIG.PORT, () => {
  console.log(`Server is running on http://localhost:${CONFIG.PORT}`);
});