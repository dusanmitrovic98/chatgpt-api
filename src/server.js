const express = require("express");
const cors = require("cors");

const CONFIG = {
  PORT: 60001,
  TIMEOUT: 30000
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

app.listen(CONFIG.PORT, () => {
  console.log(`Server is running on http://localhost:${CONFIG.PORT}`);
});