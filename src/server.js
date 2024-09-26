const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 60001;

app.use(cors());
app.use(express.json());

let latestPrompt = "";
let isProcessing = false;

app.post("/ask", (req, res) => {
  const prompt = req.body.prompt;
  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required" });
  }
  if (isProcessing) {
    return res
      .status(429)
      .json({ error: "Currently processing a prompt. Please wait." });
  }
  latestPrompt = prompt;
  isProcessing = true;
  console.log(`Received prompt: ${prompt}`);
  res.json({ message: "Prompt received", prompt });
});

app.get("/latest-prompt", (req, res) => {
  const prompt = latestPrompt;
  latestPrompt = "";
  res.json({ prompt });
});

app.post("/log-response", (req, res) => {
  const response = req.body.response;
  isProcessing = false;
  console.clear()
  console.log(`Assistant's response: ${response}`);
  res.json({ message: "Response logged", response });
});

app.post("/log-timeout", (req, res) => {
  console.log(`Timeout occurred: ${req.body.message}`);
  res.json({ message: "Timeout logged" });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

