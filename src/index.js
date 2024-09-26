(function () {
  "use strict";

  console.log("Optimized script for full response capture initialized");

  const STATE = {
    PORT: 60001,
    LOG: false,
    poolingFrequency: 1000,
    checkFrequency: 250,
    waitingForResponse: false,
    lastPrompt: "",
    canAskQuestion: false,
    sendButtonActive: false,
    stopButtonPresent: false,
    stopButtonActive: false,
    logs: [],
  };

  const log = (message, color = null) => {
    if (!STATE.LOG) return;
    const timestamp = new Date().toISOString();
    const logEntry = `${timestamp}: ${message}`;
    STATE.logs.push(logEntry);
    const style = color ? `color: ${color}` : "";
    console.log(`%c${logEntry}`, style);
  };

  const updateState = () => {
    STATE.canAskQuestion = !STATE.sendButtonActive && !STATE.stopButtonPresent && !STATE.waitingForResponse;
    log(`Can ask question: ${STATE.canAskQuestion}`);
  };

  const checkButtons = () => {
    const sendButton = document.querySelector('[data-testid="send-button"]');
    const stopButton = document.querySelector('[data-testid="stop-button"]');
    
    STATE.sendButtonActive = sendButton && !sendButton.disabled;
    STATE.stopButtonPresent = !!stopButton;
    STATE.stopButtonActive = stopButton && !stopButton.disabled;

    log(`Send button: ${STATE.sendButtonActive ? "active" : "disabled"}`);
    log(`Stop button: ${STATE.stopButtonPresent ? (STATE.stopButtonActive ? "active" : "disabled") : "not present"}`);
    
    updateState();
  };

  function clickElement(element) {
    if (element && typeof element.click === 'function') {
      element.click();
    } else {
      throw new Error("Invalid element or click method not available");
    }
  }

  function pasteText(element, text) {
    if (element && (element.value !== undefined || element.textContent !== undefined)) {
      if (element.value !== undefined) {
        element.value = text;
      } else {
        element.textContent = text;
      }
      element.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      throw new Error("Invalid element for text input");
    }
  }

  function getLastAssistantMessage() {
    const assistantMessages = document.querySelectorAll('[data-message-author-role="assistant"]');
    return assistantMessages.length > 0 ? assistantMessages[assistantMessages.length - 1].textContent.trim() : null;
  }

  async function waitForFullResponse(timeout = 300000) { // 5 minutes timeout
    const startTime = Date.now();
    let lastResponse = null;

    while (Date.now() - startTime < timeout) {
      await new Promise(resolve => setTimeout(resolve, STATE.checkFrequency));
      checkButtons();
      
      const currentResponse = getLastAssistantMessage();
      
      if (currentResponse !== lastResponse) {
        lastResponse = currentResponse;
        log("Response updated:", "blue");
        log(currentResponse);
      }

      // Check if response generation is complete
      if (!STATE.stopButtonPresent && !STATE.sendButtonActive) {
        log("Response generation complete", "green");
        return currentResponse;
      }
    }

    throw new Error("Timeout waiting for full response");
  }

  async function simulateWebpageInteraction() {
    let retryCount = 0;
    const maxRetries = 5;

    while (retryCount < maxRetries) {
      try {
        while (!STATE.canAskQuestion) {
          await new Promise(resolve => setTimeout(resolve, STATE.checkFrequency));
          checkButtons();
        }

        const inputElement = document.querySelector('[contenteditable="true"]');
        const sendButton = document.querySelector('[data-testid="send-button"]');

        if (!inputElement || !sendButton) {
          throw new Error("Required elements not found. Retrying...");
        }

        clickElement(inputElement);
        pasteText(inputElement, STATE.lastPrompt);
        await new Promise(resolve => setTimeout(resolve, 100));

        while (!STATE.sendButtonActive) {
          await new Promise(resolve => setTimeout(resolve, STATE.checkFrequency));
          checkButtons();
        }

        clickElement(sendButton);
        STATE.waitingForResponse = true;

        const fullResponse = await waitForFullResponse();
        if (!fullResponse) {
          throw new Error("No response received from assistant");
        }
        log("Full Assistant's response:", "green");
        log(fullResponse);
        return fullResponse;
      } catch (error) {
        log(`Attempt ${retryCount + 1} failed: ${error.message}`, "yellow");
        retryCount++;
        if (retryCount >= maxRetries) {
          log(`Max retries reached. Error: ${error.message}`, "red");
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait before retrying
      } finally {
        STATE.waitingForResponse = false;
      }
    }
  }

  async function fetchLatestPrompt() {
    const url = `http://localhost:${STATE.PORT}/latest-prompt`;
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: "GET",
        url: url,
        onload: response => {
          try {
            const jsonResponse = JSON.parse(response.responseText);
            if (jsonResponse.prompt && jsonResponse.prompt !== STATE.lastPrompt) {
              log(`New prompt received: ${jsonResponse.prompt}`);
              STATE.lastPrompt = jsonResponse.prompt;
              resolve(jsonResponse.prompt);
            } else {
              resolve(null);
            }
          } catch (error) {
            log("Error parsing server response: " + error.message, "red");
            reject(error);
          }
        },
        onerror: error => {
          log("Error fetching latest prompt: " + error.message, "red");
          reject(error);
        },
      });
    });
  }

  async function logResponseToServer(response) {
    const url = `http://localhost:${STATE.PORT}/log-response`;
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: "POST",
        url: url,
        data: JSON.stringify({ response }),
        headers: { "Content-Type": "application/json" },
        onload: response => {
          log("Response logged to server: " + response.responseText);
          window.location.reload();
          resolve();
        },
        onerror: error => {
          log("Error logging response: " + error.message, "red");
          reject(error);
        },
      });
    });
  }

  async function logErrorToServer(message) {
    const url = `http://localhost:${STATE.PORT}/log-error`;
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: "POST",
        url: url,
        data: JSON.stringify({ message }),
        headers: { "Content-Type": "application/json" },
        onload: response => {
          log("Error logged to server: " + response.responseText);
          resolve();
        },
        onerror: error => {
          log("Error logging error to server: " + error.message, "red");
          reject(error);
        },
      });
    });
  }

  async function handlePrompt(prompt) {
    log(`Handling prompt: ${prompt}`);
    STATE.waitingForResponse = true;

    try {
      const response = await simulateWebpageInteraction();
      if (response) {
        await logResponseToServer(response);
      } else {
        throw new Error("Failed to get a response from the assistant");
      }
    } catch (error) {
      log("Error handling prompt: " + error.message, "red");
      await logErrorToServer(error.message);
    } finally {
      STATE.waitingForResponse = false;
    }
  }

  async function loop() {
    while (true) {
      if (!STATE.waitingForResponse) {
        try {
          const prompt = await fetchLatestPrompt();
          if (prompt) {
            await handlePrompt(prompt);
          }
        } catch (error) {
          log("Error in main loop: " + error.message, "red");
          await logErrorToServer(error.message);
        }
      }
      await new Promise(resolve => setTimeout(resolve, STATE.poolingFrequency));
    }
  }

  const observer = new MutationObserver(() => {
    checkButtons();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  checkButtons();
  setInterval(checkButtons, STATE.checkFrequency);

  window.INTERACTION_STATE = STATE;

  loop();
})();