(function () {
  "use strict";

  console.log("Hello, world!");

  const STATE = {
    PORT: 60001,
    LOG: false,
    poolingFrequency: 5000,
    checkFrequency: 1000,
    waitingForResponse: false,
    lastPrompt: "",
    canAskQuestion: false,
    sendButtonActive: false,
    stopButtonPresent: false,
    stopButtonActive: false,
    logs: [],
  };

  let lastAssistantResponse = "";

  const log = (message, color = null) => {
    if (!STATE.LOG) return;
    const timestamp = new Date().toISOString();
    const logEntry = `${timestamp}: ${message}`;
    STATE.logs.push(logEntry);
    const style = color ? `color: ${color}` : "";
    console.log(`%c${logEntry}`, style);
  };

  const updateState = () => {
    STATE.canAskQuestion =
      !STATE.sendButtonActive &&
      !STATE.stopButtonPresent &&
      !STATE.waitingForResponse;
    log(`Can ask question: ${STATE.canAskQuestion}`);
  };

  const checkButtons = () => {
    const sendButton = document.querySelector('[data-testid="send-button"]');
    if (sendButton) {
      STATE.sendButtonActive = !sendButton.disabled;
      log(
        `Send button is ${STATE.sendButtonActive ? "active" : "disabled"}`
      );
    }
    checkStopButton();
    updateState();
  };

  const checkStopButton = () => {
    const stopButton = document.querySelector('[data-testid="stop-button"]');
    STATE.stopButtonPresent = !!stopButton;
    if (stopButton) {
      STATE.stopButtonActive = !stopButton.disabled;
      log(
        `Stop button is ${STATE.stopButtonActive ? "active" : "disabled"}`
      );
    } else {
      log("Stop button is not present");
    }
  };

  function clickElement(element) {
    const rect = element.getBoundingClientRect();
    const clickEvent = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      clientX: Math.floor(rect.left + rect.width / 2),
      clientY: Math.floor(rect.top + rect.height / 2),
    });
    element.dispatchEvent(clickEvent);
  }

  function pasteText(element, text) {
    element.textContent = text;
    const inputEvent = new Event("input", {
      bubbles: true,
      cancelable: true,
    });
    element.dispatchEvent(inputEvent);
  }

  function getLastAssistantMessage() {
    const assistantMessages = document.querySelectorAll(
      '[data-message-author-role="assistant"]'
    );
    if (assistantMessages.length > 0) {
      return assistantMessages[assistantMessages.length - 1].textContent.trim();
    }
    console.log("No assistant messages found.");
    return null;
  }

  async function waitForSendButtonToBeEnabled() {
    while (!STATE.sendButtonActive) {
      await new Promise((resolve) => setTimeout(resolve, STATE.checkFrequency));
      checkButtons();
    }
  }

  async function waitForResponseToComplete() {
    let previousResponse = getLastAssistantMessage();
    let noChangeCount = 0;
    const maxNoChangeCount = 10; // Adjust this value as needed

    while (STATE.stopButtonPresent || noChangeCount < maxNoChangeCount) {
      await new Promise((resolve) => setTimeout(resolve, STATE.checkFrequency));
      checkButtons();

      const currentResponse = getLastAssistantMessage();
      if (currentResponse !== previousResponse) {
        previousResponse = currentResponse;
        noChangeCount = 0;
      } else {
        noChangeCount++;
      }
    }

    return previousResponse;
  }

  async function simulateWebpageInteraction() {
    while (!STATE.canAskQuestion) {
      await new Promise((resolve) => setTimeout(resolve, STATE.checkFrequency));
      checkButtons();
    }

    const inputElement = document.querySelector('[contenteditable="true"]');
    const sendButton = document.querySelector('[data-testid="send-button"]');

    if (!inputElement || !sendButton) {
      console.error("Required elements not found");
      return null;
    }

    clickElement(inputElement);
    await new Promise((resolve) => setTimeout(resolve, 500));

    pasteText(inputElement, STATE.lastPrompt);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    await waitForSendButtonToBeEnabled();

    clickElement(sendButton);
    STATE.waitingForResponse = true;

    const newResponse = await waitForResponseToComplete();

    if (newResponse) {
      lastAssistantResponse = newResponse;
      console.log(
        "%cAssistant's response:",
        "color: green",
        lastAssistantResponse
      );
    } else {
      console.log("%cNo new response received", "color: red");
    }

    STATE.waitingForResponse = false;
    return newResponse;
  }

  async function fetchLatestPrompt() {
    const url = `http://localhost:${STATE.PORT}/latest-prompt`;

    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: "GET",
        url: url,
        onload: async (response) => {
          try {
            const jsonResponse = JSON.parse(response.responseText);
            if (jsonResponse.prompt && jsonResponse.prompt !== STATE.lastPrompt) {
              console.log(`New prompt received: ${jsonResponse.prompt}`);
              STATE.lastPrompt = jsonResponse.prompt;
              resolve(jsonResponse.prompt);
            } else {
              resolve(null);
            }
          } catch (error) {
            console.error("Error parsing server response:", error);
            reject(error);
          }
        },
        onerror: (error) => {
          console.error("Error fetching latest prompt:", error);
          reject(error);
        },
      });
    });
  }

  async function handlePrompt(prompt) {
    console.log(`Handling prompt: ${prompt}`);
    STATE.waitingForResponse = true;

    const response = await simulateWebpageInteraction();

    if (response) {
      await logResponseToServer(response);
    } else {
      console.error("Failed to get a response from the assistant");
    }

    STATE.waitingForResponse = false;
  }

  function logResponseToServer(response) {
    return new Promise((resolve, reject) => {
      const url = `http://localhost:${STATE.PORT}/log-response`;
      GM_xmlhttpRequest({
        method: "POST",
        url: url,
        data: JSON.stringify({ response }),
        headers: { "Content-Type": "application/json" },
        onload: (response) => {
          console.log("Response logged to server:", response.responseText);
          window.location.reload();
          resolve();
        },
        onerror: (error) => {
          console.error("Error logging response:", error);
          reject(error);
        },
      });
    });
  }

  async function loop() {
    while (true) {
      if (!STATE.waitingForResponse) {
        const prompt = await fetchLatestPrompt();
        if (prompt) {
          await handlePrompt(prompt);
        }
      }
      await new Promise((resolve) => setTimeout(resolve, STATE.poolingFrequency));
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