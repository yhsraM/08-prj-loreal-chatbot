// Get DOM elements
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");

// Store conversation history and user context
const conversationHistory = [];
const userContext = {
  name: null, // We'll try to detect or ask for the user's name
};

const workerUrl = "https://projectloreal8.mcazeau4603.workers.dev/";

// Function to add a message to the chat window and history
function addMessage(sender, text) {
  // Remove any previous latest-question
  const prevLatest = chatWindow.querySelector(".latest-question");
  if (prevLatest) prevLatest.remove();

  const messageDiv = document.createElement("div");
  if (sender === "user") {
    messageDiv.className = "user-message latest-question";
    messageDiv.textContent = text;
    chatWindow.appendChild(messageDiv);
  } else {
    messageDiv.className = "bot-message";
    messageDiv.textContent = text;
    // Insert bot message after the latest user message (which is the latest-question)
    const latestQ = chatWindow.querySelector(".latest-question");
    if (latestQ && latestQ.nextSibling) {
      chatWindow.insertBefore(messageDiv, latestQ.nextSibling);
    } else if (latestQ) {
      chatWindow.appendChild(messageDiv);
    } else {
      chatWindow.appendChild(messageDiv);
    }
  }
  chatWindow.scrollTop = chatWindow.scrollHeight;
  conversationHistory.push({ sender, text });
}

// Function to get the user's name from the conversation, or ask for it
function ensureUserName() {
  if (!userContext.name) {
    for (let i = 0; i < conversationHistory.length; i++) {
      const msg = conversationHistory[i];
      if (
        msg.sender === "user" &&
        msg.text.toLowerCase().includes("my name is")
      ) {
        const parts = msg.text.split("my name is");
        if (parts[1]) {
          userContext.name = parts[1].trim().split(" ")[0];
        }
      }
    }
  }
  return userContext.name;
}

// Function to send the conversation history and context to the API
async function getBotReply(userInputText) {
  // Remove any previous user question and AI response
  const prevLatest = chatWindow.querySelector(".latest-question");
  if (prevLatest) prevLatest.remove();
  const prevBot = chatWindow.querySelector(".bot-message");
  if (prevBot) prevBot.remove();

  // Show the user's question above the AI response
  const userDiv = document.createElement("div");
  userDiv.className = "user-message latest-question";
  userDiv.textContent = userInputText;
  chatWindow.appendChild(userDiv);
  chatWindow.scrollTop = chatWindow.scrollHeight;
  conversationHistory.push({ sender: "user", text: userInputText });
  ensureUserName();
  const messages = conversationHistory.map((msg) => ({
    role: msg.sender === "user" ? "user" : "assistant",
    content: msg.text,
  }));
  if (!userContext.name) {
    const botText = "Hi! What's your name?";
    addMessage("bot", botText);
    return;
  }
  messages.unshift({
    role: "system",
    content:
      `You are a helpful assistant for L'Oréal. Only answer questions about L'Oréal products, beauty routines, recommendations, or beauty-related topics. If a question is not related to these, politely reply: ` +
      `"I'm here to help with L'Oréal products, beauty routines, and related topics. Please ask me something about beauty or L'Oréal!"` +
      `\nThe user's name is ${userContext.name}. Continue the conversation naturally and help with product or routine questions.`,
  });

  // --- OpenAI API call ---
  // NOTE: For security, never expose your real API key in client-side JS in production!
  // For demo/learning, you can use a secrets.js file (not committed to git) with: const OPENAI_API_KEY = "sk-...";
  // Or, use a proxy/worker for production.

  // Show a loading message while waiting for the API
  const loadingDiv = document.createElement("div");
  loadingDiv.className = "bot-message loading";
  loadingDiv.textContent = "Thinking...";
  // Insert loading message after the latest user message
  const allMessages = chatWindow.querySelectorAll(
    ".user-message, .bot-message"
  );
  let inserted = false;
  for (let i = allMessages.length - 1; i >= 0; i--) {
    if (allMessages[i].classList.contains("user-message")) {
      if (allMessages[i].nextSibling) {
        chatWindow.insertBefore(loadingDiv, allMessages[i].nextSibling);
      } else {
        chatWindow.appendChild(loadingDiv);
      }
      inserted = true;
      break;
    }
  }
  if (!inserted) chatWindow.appendChild(loadingDiv);
  chatWindow.scrollTop = chatWindow.scrollHeight;

  try {
    // Use your Cloudflare Worker endpoint
    const response = await fetch(workerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages: messages }),
    });
    const data = await response.json();
    // Remove loading message
    loadingDiv.remove();
    // The worker should return the OpenAI API response format
    const botText =
      data.choices && data.choices[0] && data.choices[0].message.content
        ? data.choices[0].message.content.trim()
        : "Sorry, I couldn't understand that.";
    console.log(botText); // Log only the AI text response
    addMessage("bot", botText);
  } catch (error) {
    loadingDiv.remove();
    addMessage("bot", "Sorry, there was a problem connecting to the server.");
  }
}

// Set initial message
addMessage("bot", "👋 Hello! What's your name and how can I help you today?");

// Handle form submission
chatForm.addEventListener("submit", function (event) {
  event.preventDefault();
  const userText = userInput.value.trim();
  if (userText) {
    getBotReply(userText);
    userInput.value = "";
  }
});
