(function () {
  "use strict";

  const dialog = document.getElementById("miko-dialog");
  const messages = document.getElementById("miko-dialog-messages");
  const prompts = document.getElementById("miko-dialog-prompts");
  const form = document.getElementById("miko-dialog-form");
  const input = document.getElementById("miko-dialog-input");
  if (!dialog || !messages || !prompts || !form || !input) return;

  const responses = {
    assessment: "This is a 75-question lifestyle screening across nine health areas. It helps you notice patterns; it does not diagnose a condition.",
    privacy: "Your name, answers, and results stay in this browser. Miko’s replies are generated locally from the assessment guidance.",
    scoring: "Health-supportive answers receive 3 points, uncertain or middle answers receive 2, and risk answers receive 1. Some safety-critical answers use a stricter flag.",
    time: "Most people need about 15 to 20 minutes. Your progress is saved on this device, so you can leave and return.",
    language: "Use the language menu in the header. On supported desktop browsers, translation happens privately on your device and does not change scoring.",
    answer: "Choose the answer that best reflects your usual or current situation. If you are unsure, use “Not sure” rather than guessing when it is available.",
    medical: "I can explain the assessment, but I cannot diagnose, change medication, or recommend treatment. Please discuss personal medical decisions with a qualified healthcare professional.",
    urgent: "If you have severe chest pain, major breathing difficulty, fainting, or another urgent symptom, stop the assessment and seek emergency medical help now.",
    results: "Your result is a structured screening snapshot, not a diagnosis or disease probability. Start with the first practical step and seek professional follow-up for concerning answers.",
    fallback: "I can explain what the assessment is, how scoring works, privacy, language support, how to answer, or how to read the final result.",
  };

  document.querySelectorAll("[data-open-miko]").forEach((button) => {
    button.addEventListener("click", () => openMiko(button));
  });
  prompts.addEventListener("click", handlePrompt);
  form.addEventListener("submit", handleSubmit);
  document.addEventListener("pathway:languagechange", refreshAssistantMessages);

  async function openMiko(source) {
    source.classList.remove("is-miko-clicked");
    void source.offsetWidth;
    source.classList.add("is-miko-clicked");
    if (!messages.children.length) {
      await addMessage("Hi, I’m Miko. Ask me about the assessment, privacy, scoring, language, or how to get started.");
    }
    await refreshAssistantMessages();
    dialog.showModal();
    await window.PATHWAY_LANGUAGE?.translateElement(dialog);
    window.setTimeout(() => input.focus(), 220);
  }

  async function handlePrompt(event) {
    const button = event.target.closest("button[data-global-prompt]");
    if (!button) return;
    addMessage(button.textContent.trim(), true);
    await respond(button.dataset.globalPrompt);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const message = input.value.trim();
    if (!message) return;
    addMessage(message, true);
    input.value = "";
    dialog.classList.add("is-listening");
    let normalized = message.toLowerCase();
    try {
      normalized = (await window.PATHWAY_LANGUAGE?.translateToEnglish(message) || message).toLowerCase();
    } catch (_) {
      normalized = message.toLowerCase();
    }
    await respond(detectIntent(normalized));
  }

  function detectIntent(message) {
    if (/emergency|chest pain|can't breathe|cannot breathe|fainting/.test(message)) return "urgent";
    if (/doctor|diagnos|treat|medicine|medication/.test(message)) return "medical";
    if (/private|privacy|save|stored|data/.test(message)) return "privacy";
    if (/score|point|rating|calculate/.test(message)) return "scoring";
    if (/language|translate|arabic|hindi|spanish|french/.test(message)) return "language";
    if (/time|long|minutes|finish/.test(message)) return "time";
    if (/answer|choose|select|not sure|guess/.test(message)) return "answer";
    if (/result|report|output/.test(message)) return "results";
    if (/assessment|quiz|check-in|what is|start|begin/.test(message)) return "assessment";
    return "fallback";
  }

  async function respond(intent) {
    dialog.classList.add("is-listening");
    await new Promise((resolve) => window.setTimeout(resolve, 260));
    dialog.classList.remove("is-listening");
    dialog.classList.add("is-speaking");
    await addMessage(responses[intent] || responses.fallback);
    window.setTimeout(() => dialog.classList.remove("is-speaking"), 560);
  }

  async function addMessage(text, user = false) {
    const message = document.createElement("div");
    message.className = `miko-dialog-message${user ? " user" : ""}`;
    if (user) {
      message.textContent = text;
    } else {
      message.dataset.sourceText = text;
      message.dataset.noTranslate = "";
      try {
        message.textContent = await window.PATHWAY_LANGUAGE?.translateForDisplay(text) || text;
      } catch (_) {
        message.textContent = text;
      }
    }
    messages.appendChild(message);
    messages.scrollTop = messages.scrollHeight;
  }

  async function refreshAssistantMessages() {
    const assistantMessages = messages.querySelectorAll(".miko-dialog-message:not(.user)[data-source-text]");
    for (const message of assistantMessages) {
      const source = message.dataset.sourceText || "";
      try {
        message.textContent = await window.PATHWAY_LANGUAGE?.translateForDisplay(source) || source;
      } catch (_) {
        message.textContent = source;
      }
    }
  }
})();
