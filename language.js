(function () {
  "use strict";

  const select = document.getElementById("language-select");
  const status = document.getElementById("translation-status");
  if (!select || !status) return;

  const originalText = new WeakMap();
  const lastTranslatedText = new WeakMap();
  const originalAttributes = new WeakMap();
  const translators = new Map();
  const translationCache = new Map();
  const rtlLanguages = new Set(["ar", "iw"]);
  let currentLanguage = "en";
  let translationRun = 0;
  let toastTimer;

  select.addEventListener("change", () => changeLanguage(select.value));

  window.PATHWAY_LANGUAGE = {
    getLanguage: () => currentLanguage,
    refresh: () => refreshVisibleContent(),
    translateElement,
    translateForDisplay: (text) => translateText(text, "en", currentLanguage),
    translateToEnglish: (text) => translateText(text, currentLanguage, "en"),
  };

  async function changeLanguage(targetLanguage) {
    const run = ++translationRun;
    if (targetLanguage === "en") {
      currentLanguage = "en";
      document.documentElement.lang = "en";
      document.documentElement.dir = "ltr";
      restoreVisibleContent();
      setStatus(false);
      document.dispatchEvent(new CustomEvent("pathway:languagechange", { detail: { language: "en" } }));
      showToast("Language changed to English.");
      return;
    }

    setStatus(true, "Preparing private translation…");
    try {
      await getTranslator("en", targetLanguage, updateDownloadProgress);
      if (run !== translationRun) return;
      currentLanguage = targetLanguage;
      document.documentElement.lang = targetLanguage;
      document.documentElement.dir = rtlLanguages.has(targetLanguage) ? "rtl" : "ltr";
      await refreshVisibleContent(run);
      if (run !== translationRun) return;
      setStatus(false);
      document.dispatchEvent(new CustomEvent("pathway:languagechange", { detail: { language: targetLanguage } }));
      const label = select.options[select.selectedIndex]?.textContent || targetLanguage;
      showToast(`${label} is ready. English wording remains the scoring source.`);
    } catch (error) {
      if (run !== translationRun) return;
      currentLanguage = "en";
      select.value = "en";
      document.documentElement.lang = "en";
      document.documentElement.dir = "ltr";
      restoreVisibleContent();
      setStatus(false);
      document.dispatchEvent(new CustomEvent("pathway:languagechange", { detail: { language: "en" } }));
      showToast("Private translation is not available in this browser. Use desktop Chrome 138 or newer.");
    }
  }

  async function refreshVisibleContent(run = translationRun) {
    if (currentLanguage === "en") return;
    const scopes = [
      document.querySelector(".site-header"),
      document.querySelector(".screen.is-active"),
      ...document.querySelectorAll("dialog[open]"),
    ].filter(Boolean);
    for (const scope of scopes) {
      if (run !== translationRun) return;
      await translateElement(scope, run);
    }
  }

  function restoreVisibleContent() {
    const scopes = [
      document.querySelector(".site-header"),
      ...document.querySelectorAll(".screen, dialog"),
    ].filter(Boolean);
    scopes.forEach((scope) => {
      collectTextNodes(scope).forEach((node) => {
        const source = originalText.get(node);
        if (source !== undefined) node.nodeValue = source;
        lastTranslatedText.delete(node);
      });
      collectTranslatableElements(scope).forEach(({ element, attribute }) => {
        const source = originalAttributes.get(element)?.[attribute];
        if (source !== undefined) element.setAttribute(attribute, source);
      });
    });
  }

  async function translateElement(root, run = translationRun) {
    if (!root || currentLanguage === "en") return;
    const textNodes = collectTextNodes(root);
    for (const node of textNodes) {
      if (run !== translationRun) return;
      const current = node.nodeValue || "";
      const last = lastTranslatedText.get(node);
      if (!originalText.has(node) || (last !== undefined && current !== last)) originalText.set(node, current);
      const source = originalText.get(node) || "";
      const core = source.trim();
      if (!shouldTranslate(core)) continue;
      const translated = await translateText(core, "en", currentLanguage);
      const next = `${source.match(/^\s*/)?.[0] || ""}${translated}${source.match(/\s*$/)?.[0] || ""}`;
      node.nodeValue = next;
      lastTranslatedText.set(node, next);
    }

    for (const { element, attribute } of collectTranslatableElements(root)) {
      if (run !== translationRun) return;
      const sourceMap = originalAttributes.get(element) || {};
      if (!(attribute in sourceMap)) {
        sourceMap[attribute] = element.getAttribute(attribute) || "";
        originalAttributes.set(element, sourceMap);
      }
      const source = sourceMap[attribute];
      if (!shouldTranslate(source)) continue;
      element.setAttribute(attribute, await translateText(source, "en", currentLanguage));
    }
  }

  function collectTextNodes(root) {
    const nodes = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      const parent = node.parentElement;
      if (parent && !parent.closest("script, style, [data-no-translate], .brand, .chat-message.user, .miko-dialog-message.user, kbd")) {
        nodes.push(node);
      }
      node = walker.nextNode();
    }
    return nodes;
  }

  function collectTranslatableElements(root) {
    const items = [];
    root.querySelectorAll("[placeholder], [aria-label], [title]").forEach((element) => {
      if (element.closest("[data-no-translate], .brand, .chat-message.user, .miko-dialog-message.user")) return;
      ["placeholder", "aria-label", "title"].forEach((attribute) => {
        if (element.hasAttribute(attribute)) items.push({ element, attribute });
      });
    });
    return items;
  }

  function shouldTranslate(text) {
    return Boolean(text && /[A-Za-z]/.test(text) && !/^[\d\s.,:/%+–—-]+$/.test(text));
  }

  async function translateText(text, sourceLanguage, targetLanguage) {
    if (!text || sourceLanguage === targetLanguage) return text;
    const key = `${sourceLanguage}|${targetLanguage}|${text}`;
    if (translationCache.has(key)) return translationCache.get(key);
    const translator = await getTranslator(sourceLanguage, targetLanguage, updateDownloadProgress);
    const translated = await translator.translate(text);
    translationCache.set(key, translated);
    return translated;
  }

  async function getTranslator(sourceLanguage, targetLanguage, onProgress) {
    const key = `${sourceLanguage}|${targetLanguage}`;
    if (translators.has(key)) return translators.get(key);
    if (!("Translator" in window) || !window.isSecureContext) throw new Error("Translator API unavailable");

    const availability = await window.Translator.availability({ sourceLanguage, targetLanguage });
    if (availability === "unavailable") throw new Error("Language pair unavailable");

    const translator = await window.Translator.create({
      sourceLanguage,
      targetLanguage,
      monitor(monitor) {
        monitor.addEventListener("downloadprogress", (event) => onProgress?.(event.loaded));
      },
    });
    translators.set(key, translator);
    return translator;
  }

  function updateDownloadProgress(progress) {
    const percent = Math.round((progress || 0) * 100);
    setStatus(true, percent ? `Downloading language · ${percent}%` : "Preparing private translation…");
  }

  function setStatus(visible, message = "Changing language…") {
    status.querySelector("strong").textContent = message;
    status.classList.toggle("is-visible", visible);
    status.setAttribute("aria-hidden", String(!visible));
  }

  function showToast(message) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("is-visible");
    toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 4200);
  }
})();
