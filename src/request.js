// request-test.js

const axios = require('axios'); // Ensure you have axios installed

// Constants for the request
const URL = 'http://localhost:60001/ask'; // Replace with the correct URL if different
const HEADER = {
    'Content-Type': 'application/json',
};

// Message History
const messageHistory = [
    { from: "Bella", message: "Hey, how was your day?" },
    { from: "Alex", message: "It was good, thanks. Just got back from the gym." },
    { from: "Bella", message: "Ah nice! I've been meaning to start going again." },
    { from: "Alex", message: "Yeah, you should! I could go with you sometime if you want." },
    { from: "Bella", message: "That sounds like fun!" },
    { from: "Alex", message: "So, I was thinking... maybe we could grab dinner sometime this week?" },
];

// Partner's Latest Response
const partnerLatestResponse = messageHistory[messageHistory.length - 1].message;

// Your Latest Response
const myLatestResponse = "That sounds amazing! 😍 What kind of food do you like? I’m always up for trying new places! 🍽️✨";

// Thinking Process
const thinkingProcess = `
1. Begin with a <thinking> section. Everything in this section is invisible to the user.
2. Inside the thinking section:
   a. Briefly analyze the question and outline your approach.
   b. Present a clear plan of steps to solve the problem.
   c. Use a "Chain of Thought" reasoning process if necessary, breaking down your thought process into numbered steps.
3. Include a <reflection> section for each idea where you:
   a. Review your reasoning.
   b. Check for potential errors or oversights.
   c. Confirm or adjust your conclusion if necessary.
4. Be sure to close all reflection sections.
5. Close the thinking section with </thinking>.
6. Provide your final answer in an <output> section.
`;

// JSON body structure
const BODY = {
    prompt: `
    I want you to take these steps when generating your response: ${thinkingProcess}. 
    Our conversation history "${JSON.stringify(messageHistory).replace(/[\r\n]+/g, '')}".
    Partner's latest message: "${partnerLatestResponse}". 
    My latest response: "${myLatestResponse}". 
    Does my latest response in any shape or form accepted or suggested accepting any kind of date? If it did your response will include DATE_ACCEPTED if it does not your response will include DATE_NOT_ACCEPTED.`
};

// Function to send POST request
const sendRequest = async () => {
    try {
        const response = await axios.post(URL, BODY, { headers: HEADER });
        console.log('Response:', response.data);
    } catch (error) {
        console.error('Error:', error.message);
    }
};

// Execute the request
sendRequest();
