const express = require("express");
const cors = require("cors");
const app = express();
const PORT = 60001;

app.use(cors());
app.use(express.json());

let latestPrompt = "";
let isProcessing = false;
let lastResponse = "";

app.post("/ask", (req, res) => {
  const prompt = req.body.prompt;
  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "Valid prompt is required" });
  }
  if (isProcessing) {
    return res.status(429).json({ error: "Currently processing a prompt. Please wait." });
  }
  latestPrompt = prompt;
  isProcessing = true;
  console.clear();
  console.log(`${prompt}`);
  res.json({ message: "Prompt received", prompt });
});

app.get("/latest-prompt", (req, res) => {
  res.json({ prompt: latestPrompt });
});

app.post("/log-response", (req, res) => {
  const response = req.body.response;
  if (!response || typeof response !== "string") {
    return res.status(400).json({ error: "Valid response is required" });
  }
  isProcessing = false;
  lastResponse = response;
  latestPrompt = "";
  console.clear();
  console.log(`${response}`);
  res.json({ message: "Response logged", response });
});

app.get("/last-response", (req, res) => {
  res.json({ response: lastResponse });
});

app.post("/log-error", (req, res) => {
  const { message } = req.body;
  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "Valid error message is required" });
  }
  isProcessing = false;
  console.error(`Error occurred: ${message}`);
  res.json({ message: "Error logged" });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});