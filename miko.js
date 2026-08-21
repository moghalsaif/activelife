(function () {
  "use strict";

  const dialog = document.getElementById("miko-dialog");
  const messages = document.getElementById("miko-dialog-messages");
  const prompts = document.getElementById("miko-dialog-prompts");
  const form = document.getElementById("miko-dialog-form");
  const input = document.getElementById("miko-dialog-input");
  const send = form?.querySelector("button[type='submit']");
  const guide = window.MIKO_GUIDE;
  if (!dialog || !messages || !prompts || !form || !input || !send || !guide) {
    window.PATHWAY_REPORT_ERROR?.();
    return;
  }
  let busy = false;

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
    if (!dialog.open) dialog.showModal();
    await window.PATHWAY_LANGUAGE?.translateElement(dialog);
    window.setTimeout(() => input.focus(), 220);
  }

  async function handlePrompt(event) {
    if (busy) return;
    const button = event.target.closest("button[data-global-prompt]");
    if (!button) return;
    await addMessage(button.textContent.trim(), true);
    await respond(button.dataset.globalPrompt);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (busy) return;
    const message = input.value.trim();
    if (!message) return;
    await addMessage(message, true);
    input.value = "";
    let normalized = message.toLowerCase();
    try {
      normalized = (await window.PATHWAY_LANGUAGE?.translateToEnglish(message) || message).toLowerCase();
    } catch (_) {
      normalized = message.toLowerCase();
    }
    await respond(guide.detectGlobalIntent(normalized));
  }

  async function respond(intent) {
    if (busy) return;
    setBusy(true);
    try {
      dialog.classList.add("is-listening");
      await new Promise((resolve) => window.setTimeout(resolve, 260));
      dialog.classList.remove("is-listening");
      dialog.classList.add("is-speaking");
      await addMessage(guide.responses[intent] || guide.responses.fallback);
      window.setTimeout(() => dialog.classList.remove("is-speaking"), 560);
    } finally {
      dialog.classList.remove("is-listening");
      setBusy(false);
    }
  }

  function setBusy(nextBusy) {
    busy = nextBusy;
    form.setAttribute("aria-busy", String(busy));
    input.disabled = busy;
    send.disabled = busy;
    prompts.querySelectorAll("button").forEach((button) => { button.disabled = busy; });
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
