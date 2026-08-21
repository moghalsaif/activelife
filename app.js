(function () {
  "use strict";

  const data = window.ASSESSMENT_DATA;
  if (!data) throw new Error("Assessment data failed to load.");

  const STORAGE_KEY = "pathway-health-check-v1";
  const screens = {
    welcome: document.getElementById("welcome-screen"),
    profile: document.getElementById("profile-screen"),
    quiz: document.getElementById("quiz-screen"),
    results: document.getElementById("results-screen"),
  };

  const els = {
    begin: document.getElementById("begin-button"),
    resume: document.getElementById("resume-button"),
    profileBack: document.getElementById("profile-back-button"),
    profileForm: document.getElementById("profile-form"),
    firstName: document.getElementById("first-name"),
    age: document.getElementById("age"),
    sourceSex: document.getElementById("source-sex"),
    height: document.getElementById("height"),
    weight: document.getElementById("weight"),
    consent: document.getElementById("consent"),
    ageError: document.getElementById("age-error"),
    sourceSexError: document.getElementById("source-sex-error"),
    consentError: document.getElementById("consent-error"),
    exit: document.getElementById("exit-button"),
    exitDialog: document.getElementById("exit-dialog"),
    confirmExit: document.getElementById("confirm-exit-button"),
    sectionLabel: document.getElementById("section-label"),
    progressLabel: document.getElementById("progress-label"),
    progressTrack: document.querySelector(".progress-track"),
    progressFill: document.getElementById("progress-fill"),
    questionStage: document.querySelector(".question-stage"),
    questionNumber: document.getElementById("question-number"),
    questionTitle: document.getElementById("question-title"),
    questionContext: document.getElementById("question-context"),
    mikoQuestionNote: document.getElementById("miko-question-note"),
    mikoNoteLabel: document.getElementById("miko-note-label"),
    mikoNoteText: document.getElementById("miko-note-text"),
    mikoNoteAvatar: document.getElementById("miko-note-avatar"),
    sensitiveLabel: document.getElementById("sensitive-label"),
    optionsList: document.getElementById("options-list"),
    followupFields: document.getElementById("followup-fields"),
    answerError: document.getElementById("answer-error"),
    previous: document.getElementById("previous-button"),
    next: document.getElementById("next-button"),
    guidePanel: document.getElementById("guide-panel"),
    guideToggle: document.getElementById("guide-toggle"),
    guideClose: document.getElementById("guide-close"),
    chatMessages: document.getElementById("chat-messages"),
    chatForm: document.getElementById("chat-form"),
    chatInput: document.getElementById("chat-input"),
    quickPrompts: document.getElementById("quick-prompts"),
    methodDialog: document.getElementById("method-dialog"),
    resultsMethodButton: document.getElementById("results-method-button"),
    soundButton: document.getElementById("sound-button"),
    resultsHome: document.getElementById("results-home-button"),
    resultsSummary: document.getElementById("results-summary"),
    scoreRing: document.getElementById("score-ring"),
    scoreValue: document.getElementById("score-value"),
    resultBadge: document.getElementById("result-badge"),
    resultHeading: document.getElementById("result-heading"),
    resultExplanation: document.getElementById("result-explanation"),
    categoryList: document.getElementById("category-list"),
    nextSteps: document.getElementById("next-steps-list"),
    download: document.getElementById("download-button"),
    retake: document.getElementById("retake-button"),
    toast: document.getElementById("toast"),
  };

  const emptyState = () => ({
    profile: { firstName: "", age: "", sourceSex: "", height: "", weight: "" },
    answers: {},
    details: {},
    currentIndex: 0,
    completed: false,
    sound: true,
  });

  let state = loadState() || emptyState();
  let activeQuestions = getActiveQuestions();
  let toastTimer;
  let buddyTimer;

  init();

  function init() {
    els.resume.classList.toggle("is-hidden", !hasMeaningfulProgress());
    if (state.completed) els.resume.textContent = "View saved result";
    els.soundButton.setAttribute("aria-pressed", String(state.sound));
    els.soundButton.setAttribute("aria-label", state.sound ? "Turn sound off" : "Turn sound on");

    els.begin.addEventListener("click", () => {
      playTone("select");
      populateProfile();
      showScreen("profile");
    });

    els.resume.addEventListener("click", () => {
      playTone("select");
      activeQuestions = getActiveQuestions();
      if (state.completed) {
        renderResults();
        showScreen("results");
      } else if (state.profile.age && state.profile.sourceSex) {
        state.currentIndex = clamp(state.currentIndex, 0, activeQuestions.length - 1);
        showScreen("quiz");
        prepareGuideForViewport();
        renderQuestion(true);
      } else {
        populateProfile();
        showScreen("profile");
      }
    });

    els.profileBack.addEventListener("click", () => showScreen("welcome"));
    els.profileForm.addEventListener("submit", handleProfileSubmit);
    els.exit.addEventListener("click", () => els.exitDialog.showModal());
    els.confirmExit.addEventListener("click", () => {
      saveState();
      els.resume.classList.remove("is-hidden");
      els.resume.textContent = "Resume saved check-in";
      showScreen("welcome");
    });

    els.previous.addEventListener("click", previousQuestion);
    els.next.addEventListener("click", nextQuestion);
    els.optionsList.addEventListener("click", handleOptionClick);
    els.followupFields.addEventListener("input", captureFollowup);
    els.followupFields.addEventListener("change", captureFollowup);

    els.guideToggle.addEventListener("click", () => setGuideOpen(true));
    els.guideClose.addEventListener("click", () => setGuideOpen(false));
    els.mikoNoteAvatar.addEventListener("click", openQuestionGuide);
    els.quickPrompts.addEventListener("click", handleQuickPrompt);
    els.chatForm.addEventListener("submit", handleChatSubmit);

    [els.resultsMethodButton].forEach((button) => {
      button.addEventListener("click", async () => {
        els.methodDialog.showModal();
        await window.PATHWAY_LANGUAGE?.translateElement(els.methodDialog);
      });
    });

    els.soundButton.addEventListener("click", toggleSound);
    els.resultsHome.addEventListener("click", () => {
      els.resume.classList.remove("is-hidden");
      els.resume.textContent = "View saved result";
      showScreen("welcome");
    });
    els.download.addEventListener("click", printSummary);
    els.retake.addEventListener("click", resetAssessment);

    document.addEventListener("keydown", handleKeyboard);
    window.addEventListener("beforeunload", saveState);
    window.addEventListener("resize", handleViewportChange);
  }

  function showScreen(name) {
    Object.entries(screens).forEach(([key, screen]) => {
      screen.classList.toggle("is-active", key === name);
      screen.setAttribute("aria-hidden", String(key !== name));
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
    window.setTimeout(() => window.PATHWAY_LANGUAGE?.refresh(), 0);
  }

  function populateProfile() {
    els.firstName.value = state.profile.firstName || "";
    els.age.value = state.profile.age || "";
    els.sourceSex.value = state.profile.sourceSex || "";
    els.height.value = state.profile.height || "";
    els.weight.value = state.profile.weight || "";
    els.consent.checked = Boolean(state.profile.consent);
  }

  function handleProfileSubmit(event) {
    event.preventDefault();
    const age = Number(els.age.value);
    const validAge = age >= 18 && age <= 110;
    const validSex = Boolean(els.sourceSex.value);
    const validConsent = els.consent.checked;

    els.ageError.textContent = validAge ? "" : "Enter an age between 18 and 110.";
    els.sourceSexError.textContent = validSex ? "" : "Choose the source pathway that fits best.";
    els.consentError.textContent = validConsent ? "" : "Please confirm before starting.";
    if (!validAge || !validSex || !validConsent) return;

    const previousSex = state.profile.sourceSex;
    state.profile = {
      firstName: els.firstName.value.trim(),
      age,
      sourceSex: els.sourceSex.value,
      height: els.height.value ? Number(els.height.value) : "",
      weight: els.weight.value ? Number(els.weight.value) : "",
      consent: true,
    };

    if (previousSex && previousSex !== state.profile.sourceSex) {
      data.questions.filter((question) => question.womenOnly).forEach((question) => {
        delete state.answers[question.id];
        delete state.details[question.id];
      });
    }

    activeQuestions = getActiveQuestions();
    state.currentIndex = clamp(state.currentIndex, 0, activeQuestions.length - 1);
    state.completed = false;
    saveState();
    playTone("advance");
    showScreen("quiz");
    prepareGuideForViewport();
    renderQuestion(true);
  }

  function getActiveQuestions() {
    return data.questions.filter((question) => !question.womenOnly || state.profile.sourceSex === "female");
  }

  function currentQuestion() {
    return activeQuestions[state.currentIndex];
  }

  function renderQuestion(resetChat = true) {
    const question = currentQuestion();
    if (!question) return;

    els.questionStage.classList.remove("is-changing");
    void els.questionStage.offsetWidth;
    els.questionStage.classList.add("is-changing");

    const progress = ((state.currentIndex + 1) / activeQuestions.length) * 100;
    els.sectionLabel.textContent = data.categories[question.category].label;
    els.progressLabel.textContent = `${state.currentIndex + 1} of ${activeQuestions.length}`;
    els.progressFill.style.width = `${progress}%`;
    els.progressTrack.setAttribute("aria-valuemax", String(activeQuestions.length));
    els.progressTrack.setAttribute("aria-valuenow", String(state.currentIndex + 1));
    els.questionNumber.textContent = `Question ${question.id}`;
    els.questionTitle.textContent = question.prompt;
    els.questionContext.textContent = question.context || "";
    const isSafetyNote = question.technical
      || question.sensitive
      || /safe|safety|clinician|do not|diagnos|not your fault|urgent/i.test(question.help);
    els.mikoNoteLabel.textContent = isSafetyNote ? "Miko’s safety note" : "Miko’s note";
    els.mikoNoteText.textContent = question.help;
    els.mikoQuestionNote.classList.remove("is-arriving");
    void els.mikoQuestionNote.offsetWidth;
    els.mikoQuestionNote.classList.add("is-arriving");
    els.sensitiveLabel.classList.toggle("is-hidden", !question.sensitive);
    els.previous.disabled = state.currentIndex === 0;
    els.next.innerHTML = state.currentIndex === activeQuestions.length - 1
      ? `See my results <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"></path></svg>`
      : `Continue <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"></path></svg>`;
    els.answerError.classList.add("is-hidden");

    renderOptions();
    renderFollowup();
    if (resetChat) resetChatForQuestion(question);
    window.PATHWAY_LANGUAGE?.refresh();
  }

  function getOptions(question) {
    if (question.customOptions) return question.customOptions;
    if (question.scale === "frequency") {
      return [
        { value: "never", label: "Never", score: 3 },
        { value: "occasionally", label: "Occasionally", score: 2 },
        { value: "daily", label: "Daily or almost daily", score: 1 },
      ];
    }

    const positive = question.direction !== "risk";
    const options = [
      { value: "yes", label: "Yes", score: positive ? 3 : 1 },
      { value: "no", label: "No", score: positive ? 1 : 3 },
    ];
    if (question.scale === "ynu") options.push({ value: "unsure", label: "Not sure", score: 2 });
    return options;
  }

  function renderOptions() {
    const question = currentQuestion();
    const selected = state.answers[question.id];
    els.optionsList.innerHTML = getOptions(question).map((option, index) => `
      <button
        class="option-button${selected === option.value ? " is-selected" : ""}"
        type="button"
        role="radio"
        aria-checked="${selected === option.value}"
        data-value="${escapeHtml(option.value)}"
      >
        <span class="option-index">${index + 1}</span>
        <span class="option-label">${escapeHtml(option.label)}</span>
        <span class="option-check" aria-hidden="true"></span>
      </button>
    `).join("");
  }

  function handleOptionClick(event) {
    const button = event.target.closest(".option-button");
    if (!button) return;
    selectOption(button.dataset.value);
  }

  function selectOption(value) {
    const question = currentQuestion();
    state.answers[question.id] = value;
    els.answerError.classList.add("is-hidden");
    renderOptions();
    renderFollowup();
    saveState();
    playTone("select");
    animateBuddy("happy");
  }

  function renderFollowup() {
    const question = currentQuestion();
    const config = question.followup;
    const answer = state.answers[question.id];
    if (!config || !config.when.includes(answer)) {
      els.followupFields.innerHTML = "";
      return;
    }

    const detail = state.details[question.id] || {};
    let content = "";
    if (config.type === "text") {
      content = `<input type="text" data-detail="text" maxlength="180" value="${escapeHtml(detail.text || "")}" placeholder="${escapeHtml(config.placeholder || "Optional detail")}" />`;
    } else if (config.type === "number") {
      content = metricField("value", config.label, detail.value, config.suffix, config.min, config.max, config.step);
    } else if (config.type === "checks") {
      const selected = Array.isArray(detail.selected) ? detail.selected : [];
      content = `<div class="followup-grid">${config.options.map((option) => `
        <label class="followup-item">
          <input type="checkbox" data-detail="selected" value="${escapeHtml(option)}" ${selected.includes(option) ? "checked" : ""} />
          <span>${escapeHtml(option)}</span>
        </label>
      `).join("")}</div>`;
    } else if (config.type === "single-select") {
      content = `<select data-detail="status">
        ${config.options.map((option) => `<option value="${escapeHtml(option)}" ${detail.status === option ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}
      </select>`;
    } else if (config.type === "blood-pressure") {
      content = `<div class="metric-grid">
        ${metricField("systolic", "Systolic (top)", detail.systolic, "mmHg", 50, 280, 1)}
        ${metricField("diastolic", "Diastolic (bottom)", detail.diastolic, "mmHg", 30, 180, 1)}
      </div>`;
    } else if (config.type === "glucose") {
      content = `<div class="metric-grid">
        ${metricField("fasting", "Fasting", detail.fasting, "mg/dL", 20, 700, 1)}
        ${metricField("postMeal", "2-hour post-meal", detail.postMeal, "mg/dL", 20, 700, 1)}
        ${metricField("random", "Random", detail.random, "mg/dL", 20, 700, 1)}
        ${metricField("postGlucose", "2-hour glucose test", detail.postGlucose, "mg/dL", 20, 700, 1)}
      </div>`;
    } else if (config.type === "lipids") {
      content = `<div class="metric-grid">
        ${metricField("total", "Total cholesterol", detail.total, "mg/dL", 50, 800, 1)}
        ${metricField("hdl", "HDL", detail.hdl, "mg/dL", 5, 200, 1)}
        ${metricField("ldl", "LDL", detail.ldl, "mg/dL", 5, 500, 1)}
        ${metricField("triglycerides", "Triglycerides", detail.triglycerides, "mg/dL", 10, 1500, 1)}
      </div>`;
    } else if (config.type === "test-status") {
      content = `<div class="followup-grid">${config.options.map((test) => `
        <label class="metric-field">
          <span>${escapeHtml(test)}</span>
          <select data-detail="test:${escapeHtml(test)}">
            ${["Not tested", "Normal", "Abnormal"].map((status) => `<option value="${status}" ${detail.tests?.[test] === status ? "selected" : ""}>${status}</option>`).join("")}
          </select>
        </label>
      `).join("")}</div>`;
    }

    els.followupFields.innerHTML = `
      <div class="followup-card">
        <span class="followup-label">${escapeHtml(config.label)}</span>
        ${content}
      </div>
    `;
  }

  function metricField(key, label, value = "", suffix = "", min = "", max = "", step = "any") {
    return `
      <label class="metric-field">
        <span>${escapeHtml(label)}</span>
        <input type="number" data-detail="${escapeHtml(key)}" value="${escapeHtml(value)}" min="${min}" max="${max}" step="${step}" inputmode="decimal" />
        ${suffix ? `<small>${escapeHtml(suffix)}</small>` : ""}
      </label>
    `;
  }

  function captureFollowup() {
    const question = currentQuestion();
    const detail = state.details[question.id] || {};
    els.followupFields.querySelectorAll("[data-detail]").forEach((field) => {
      const key = field.dataset.detail;
      if (key === "selected") {
        detail.selected = Array.from(els.followupFields.querySelectorAll('[data-detail="selected"]:checked')).map((input) => input.value);
      } else if (key.startsWith("test:")) {
        detail.tests = detail.tests || {};
        detail.tests[key.slice(5)] = field.value;
      } else {
        detail[key] = field.value;
      }
    });
    state.details[question.id] = detail;
    saveState();
  }

  function nextQuestion() {
    const question = currentQuestion();
    if (!state.answers[question.id]) {
      els.answerError.classList.remove("is-hidden");
      els.optionsList.querySelector(".option-button")?.focus();
      playTone("error");
      animateBuddy("alert");
      return;
    }

    if (state.currentIndex >= activeQuestions.length - 1) {
      state.completed = true;
      saveState();
      playTone("complete");
      renderResults();
      showScreen("results");
      return;
    }

    state.currentIndex += 1;
    saveState();
    playTone("advance");
    renderQuestion(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
    els.questionTitle.focus?.();
  }

  function previousQuestion() {
    if (state.currentIndex === 0) return;
    state.currentIndex -= 1;
    saveState();
    playTone("select");
    renderQuestion(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleKeyboard(event) {
    if (!screens.quiz.classList.contains("is-active")) return;
    if (els.methodDialog.open || els.exitDialog.open) return;
    if (["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement?.tagName)) return;

    const number = Number(event.key);
    if (number >= 1 && number <= 4) {
      const option = getOptions(currentQuestion())[number - 1];
      if (option) selectOption(option.value);
    } else if (event.key === "Enter") {
      event.preventDefault();
      nextQuestion();
    } else if (event.key === "ArrowLeft") {
      previousQuestion();
    }
  }

  function prepareGuideForViewport() {
    setGuideOpen(false);
  }

  function handleViewportChange() {
    if (!screens.quiz.classList.contains("is-active")) return;
  }

  function setGuideOpen(open) {
    els.guidePanel.classList.toggle("is-collapsed", !open);
    els.guideToggle.setAttribute("aria-expanded", String(open));
    if (open) animateBuddy("happy");
    if (open && window.innerWidth <= 1040) setTimeout(() => els.chatInput.focus(), 220);
  }

  function openQuestionGuide() {
    setGuideOpen(true);
    animateBuddy("happy");
    window.setTimeout(() => els.chatInput.focus(), 220);
  }

  function animateBuddy(mood) {
    const className = `buddy-${mood}`;
    const classes = ["buddy-thinking", "buddy-happy", "buddy-alert"];
    const targets = [els.guidePanel, els.guideToggle].filter(Boolean);
    window.clearTimeout(buddyTimer);
    targets.forEach((target) => {
      target.classList.remove(...classes);
      void target.offsetWidth;
      target.classList.add(className);
    });
    buddyTimer = window.setTimeout(() => {
      targets.forEach((target) => target.classList.remove(className));
    }, 620);
  }

  function resetChatForQuestion(question) {
    els.chatMessages.innerHTML = "";
    const name = state.profile.firstName ? `, ${state.profile.firstName}` : "";
    addChatMessage(`Here’s my note for question ${question.id}${name}: ${question.help} Ask me if you want the wording, reason, or answer choices explained.`);
  }

  function handleQuickPrompt(event) {
    const button = event.target.closest("button[data-prompt]");
    if (!button) return;
    const prompts = {
      meaning: "What does this question mean?",
      why: "Why is this being asked?",
      answer: "How should I answer?",
    };
    const text = prompts[button.dataset.prompt];
    addChatMessage(button.textContent.trim() || text, true);
    animateBuddy("thinking");
    window.setTimeout(() => replyAsMiko(button.dataset.prompt), 240);
  }

  async function handleChatSubmit(event) {
    event.preventDefault();
    const message = els.chatInput.value.trim();
    if (!message) return;
    addChatMessage(message, true);
    els.chatInput.value = "";
    animateBuddy("thinking");

    let normalized = message.toLowerCase();
    try {
      normalized = (await window.PATHWAY_LANGUAGE?.translateToEnglish(message) || message).toLowerCase();
    } catch (_) {
      normalized = message.toLowerCase();
    }
    let intent = "fallback";
    if (/why|reason|matter|included|ask/.test(normalized)) intent = "why";
    else if (/mean|explain|understand|term|what is|what does/.test(normalized)) intent = "meaning";
    else if (/answer|choose|select|not sure|don't know|guess/.test(normalized)) intent = "answer";
    else if (/score|point|result|rating|calculate/.test(normalized)) intent = "score";
    else if (/private|privacy|save|stored|data/.test(normalized)) intent = "privacy";
    else if (/doctor|diagnos|treat|medicine|medication|should i stop/.test(normalized)) intent = "medical";
    else if (/emergency|chest pain|can't breathe|cannot breathe|fainting/.test(normalized)) intent = "urgent";
    window.setTimeout(() => replyAsMiko(intent), 240);
  }

  function replyAsMiko(intent) {
    const question = currentQuestion();
    const replies = {
      meaning: `${question.help}${question.context ? ` In this question, “${question.context}”` : ""}`,
      why: question.why,
      answer: `Answer for your usual or current situation, using the timeframe in the question. Choose “Not sure” when it is available rather than guessing. Optional detail fields can be left blank.`,
      score: `The source uses 3 points for the most health-supportive answer, 2 for an uncertain or middle answer, and 1 for a risk answer. Some safety-critical areas use a stricter flag when one risk answer appears.`,
      privacy: `Your answers are saved only in this browser’s local storage so you can resume. This prototype does not send them to a server. You can clear them by choosing “Retake assessment.”`,
      medical: `I can explain this assessment’s wording and logic, but I can’t diagnose, change medication, or recommend treatment. Keep taking prescribed medication unless your clinician tells you otherwise.`,
      urgent: `If you have severe chest pain, major breathing difficulty, fainting, or another urgent symptom, stop the assessment and seek emergency medical help now.`,
      fallback: `I can help with the current question’s meaning, why it is included, how to answer without guessing, privacy, or scoring. For personal diagnosis or treatment, please speak with a qualified healthcare professional.`,
    };
    addChatMessage(replies[intent]);
    animateBuddy(intent === "urgent" || intent === "medical" ? "alert" : "happy");
    playTone("message");
  }

  function addChatMessage(text, user = false) {
    const message = document.createElement("div");
    message.className = `chat-message${user ? " user" : ""}`;
    message.textContent = text;
    els.chatMessages.appendChild(message);
    els.chatMessages.scrollTop = els.chatMessages.scrollHeight;
    if (!user) window.PATHWAY_LANGUAGE?.refresh();
  }

  function calculateResults() {
    const categoryResults = {};
    const scoredCategories = Object.keys(data.categories).filter((key) => key !== "context");

    scoredCategories.forEach((key) => {
      const questions = activeQuestions.filter((question) => question.category === key && question.scored !== false);
      const entries = questions.map((question) => {
        const answer = state.answers[question.id];
        const option = getOptions(question).find((item) => item.value === answer);
        return option ? { question, score: option.score } : null;
      }).filter((entry) => entry && entry.score !== null);

      if (!entries.length) {
        categoryResults[key] = { key, included: false, percent: 0, rating: "Not included", points: 0, hasTechnicalRisk: false };
        return;
      }

      const sum = entries.reduce((total, entry) => total + entry.score, 0);
      const percent = Math.round((sum / (entries.length * 3)) * 100);
      const hasTechnicalRisk = entries.some((entry) => entry.question.technical && entry.score === 1);
      let rating = "Needs attention";
      let points = 1;
      if (!hasTechnicalRisk && percent === 100) {
        rating = "Very satisfactory";
        points = 3;
      } else if (!hasTechnicalRisk && percent >= 66) {
        rating = "Satisfactory";
        points = 2;
      }

      categoryResults[key] = { key, included: true, percent, rating, points, hasTechnicalRisk };
    });

    const included = Object.values(categoryResults).filter((result) => result.included);
    const categoryPoints = included.reduce((total, result) => total + result.points, 0);
    const baseScore = included.length ? (categoryPoints / (included.length * 3)) * 100 : 0;
    const riskFactors = getRiskFactors(categoryResults);
    const score = clamp(Math.round(baseScore - riskFactors.length), 0, 100);
    const criticalKeys = ["cardiac", "cancer", "hiv", "safety"];
    const criticalClear = criticalKeys.every((key) => !categoryResults[key].included || categoryResults[key].rating !== "Needs attention");

    let status = "Needs attention";
    if (score === 100 && criticalClear) status = "Very satisfactory";
    else if (score >= 66 && criticalClear) status = "Satisfactory";
    else if (score >= 60 && criticalClear) status = "Fair";

    return { categoryResults, baseScore, riskFactors, score, status, criticalClear };
  }

  function getRiskFactors(categoryResults) {
    const factors = new Set();
    const answer = (id) => state.answers[id];
    const detail = (id, key) => Number(state.details[id]?.[key] || 0);

    if (answer(1) === "yes") factors.add("Family cardiac history");
    if (answer(2) === "yes") factors.add("Known heart condition");
    if (answer(3) === "yes" || detail(3, "systolic") >= 140 || detail(3, "diastolic") >= 90) factors.add("Blood pressure signal");
    if (answer(4) === "yes" || detail(4, "fasting") > 115 || detail(4, "random") > 180 || detail(4, "postMeal") > 180) factors.add("Blood sugar signal");
    if (answer(5) === "yes" || detail(5, "total") > 200 || detail(5, "ldl") > 130 || detail(5, "triglycerides") > 200) factors.add("Blood lipid signal");
    if (["occasionally", "daily"].includes(answer(48)) || answer(52) === "yes") factors.add("Smoking exposure");
    if (answer(10) === "no") factors.add("Low activity");
    if (answer(13) === "yes") factors.add("Body-composition signal");
    if (categoryResults.stress?.rating === "Needs attention") factors.add("Stress signal");
    if (answer(60) === "yes") factors.add("Family cancer history");
    if (answer(53) === "yes") factors.add("Long-term alcohol pattern");
    if (answer(54) === "yes") factors.add("Long-term chewing-tobacco pattern");
    if (answer(24) === "yes") factors.add("Frequent commercial or smoked foods");
    if (answer(56) === "yes") factors.add("Repeated sunburn exposure");
    if (answer(57) === "yes") factors.add("Long-term occupational exposure");
    return Array.from(factors);
  }

  function renderResults() {
    const results = calculateResults();
    const needs = Object.values(results.categoryResults).filter((result) => result.included && result.rating === "Needs attention");
    els.resultsSummary.textContent = `Based on your answers—not a diagnosis. ${needs.length ? `${needs.length} ${needs.length === 1 ? "area needs" : "areas need"} attention.` : "No health area was flagged."}`;
    animateResultScore(results.score);
    els.scoreRing.setAttribute("aria-label", `Lifestyle score ${results.score} out of 100, ${results.status}`);
    els.resultBadge.textContent = results.status;
    els.resultBadge.dataset.status = results.status.toLowerCase().replaceAll(" ", "-");
    const copy = resultCopy(results);
    els.resultHeading.textContent = copy.heading;
    els.resultExplanation.textContent = copy.explanation;

    els.categoryList.innerHTML = Object.entries(results.categoryResults)
      .filter(([, result]) => result.included)
      .sort(([, a], [, b]) => a.points - b.points || a.percent - b.percent)
      .map(([key, result], index) => {
        const meta = data.categories[key];
        const needsAttention = result.rating === "Needs attention";
        return `
          <div class="category-row${needsAttention ? " needs-attention" : ""}" style="--category-color:${meta.color}; --category-score:${result.percent}%; --row-delay:${index * 45}ms">
            <div class="category-heading">
              <div class="category-name">
                <i aria-hidden="true"></i>
                <span><strong>${escapeHtml(meta.shortLabel)}</strong></span>
              </div>
              <div class="category-status"><span aria-hidden="true">${needsAttention ? "!" : "✓"}</span>${escapeHtml(result.rating)}</div>
            </div>
            <div class="category-score-line">
              <div class="category-bar" role="img" aria-label="${escapeHtml(meta.shortLabel)} weighted answer score ${result.percent} percent"><span></span></div>
              <strong>${result.percent}%</strong>
            </div>
          </div>
        `;
      }).join("");

    const steps = buildNextSteps(results);
    const stepLabels = ["Start here", "Build from there", "Review your pattern"];
    els.nextSteps.innerHTML = steps.map((step, index) => `<li><span>0${index + 1}</span><div><strong>${stepLabels[index]}</strong><p>${escapeHtml(step)}</p></div></li>`).join("");
    window.PATHWAY_LANGUAGE?.refresh();
  }

  function animateResultScore(score) {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      els.scoreValue.textContent = String(score);
      els.scoreRing.style.setProperty("--score-angle", `${score * 3.6}deg`);
      return;
    }

    const startedAt = performance.now();
    const duration = 900;
    const tick = (now) => {
      const progress = clamp((now - startedAt) / duration, 0, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      const current = Math.round(score * eased);
      els.scoreValue.textContent = String(current);
      els.scoreRing.style.setProperty("--score-angle", `${current * 3.6}deg`);
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function resultCopy(results) {
    if (results.status === "Very satisfactory") {
      return {
        heading: "Your answers are consistently health-supportive.",
        explanation: "The source logic found no flagged safety-critical answer and every included category reached its highest rating. Keep using routine preventive care.",
      };
    }
    if (results.status === "Satisfactory") {
      return {
        heading: "Your foundation looks steady.",
        explanation: "Your overall category score is at least 66 and no safety-critical category was flagged. The lower-scoring areas below are the clearest places to focus.",
      };
    }
    if (results.status === "Fair") {
      return {
        heading: "You’re close, with room to strengthen a few habits.",
        explanation: "Your score falls between 60 and 65, and no safety-critical category was flagged. Small, repeatable improvements can move the overall picture.",
      };
    }
    return {
      heading: "A few areas deserve a closer look.",
      explanation: results.criticalClear
        ? "Your overall score is below the source assessment’s 60-point threshold. Use the category breakdown to choose manageable next steps."
        : "At least one cardiac, cancer, HIV-awareness, or safety answer triggered the source assessment’s strict safety gate. This is a prompt for appropriate professional follow-up, not a diagnosis.",
    };
  }

  function buildNextSteps(results) {
    const answer = (id) => state.answers[id];
    const urgentContext = [];
    if (answer(64) === "positive") urgentContext.push("Arrange confidential follow-up with a qualified HIV care service; this assessment cannot interpret or confirm a test result.");
    if ([2, 3, 4, 5, 58].some((id) => answer(id) === "yes")) urgentContext.push("Share the relevant known condition or test history with a qualified healthcare professional before making major exercise or diet changes.");
    if (answer(69) === "yes" || answer(71) === "yes") urgentContext.push("Use pregnancy- or breastfeeding-specific advice from your maternity-care professional rather than a generic exercise or calorie target.");
    if (answer(74) === "yes" || answer(75) === "yes") urgentContext.push("If harassment, domination, or coercion affects your safety, consider confidential support from a trusted person or appropriate local service when safe.");

    const ranked = Object.values(results.categoryResults)
      .filter((result) => result.included)
      .sort((a, b) => a.points - b.points || a.percent - b.percent)
      .map((result) => data.categories[result.key].nextStep);

    const combined = [...urgentContext, ...ranked, "Repeat the check-in after a meaningful period and compare patterns rather than chasing a perfect number."];
    return Array.from(new Set(combined)).slice(0, 3);
  }

  function printSummary() {
    showToast("Opening a print-ready report. Choose ‘Save as PDF’ to keep a copy.");
    window.setTimeout(() => window.print(), 120);
  }

  function resetAssessment() {
    const keepSound = state.sound;
    state = emptyState();
    state.sound = keepSound;
    activeQuestions = getActiveQuestions();
    localStorage.removeItem(STORAGE_KEY);
    els.resume.classList.add("is-hidden");
    populateProfile();
    showScreen("profile");
    showToast("Previous answers cleared. You can start fresh.");
  }

  function toggleSound() {
    state.sound = !state.sound;
    els.soundButton.setAttribute("aria-pressed", String(state.sound));
    els.soundButton.setAttribute("aria-label", state.sound ? "Turn sound off" : "Turn sound on");
    saveState();
    if (state.sound) playTone("select");
  }

  function playTone(kind) {
    if (!state.sound || !window.AudioContext) return;
    try {
      const context = new AudioContext();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const settings = {
        select: [460, 0.035, 0.035],
        advance: [620, 0.045, 0.04],
        message: [540, 0.04, 0.025],
        error: [190, 0.07, 0.035],
        complete: [720, 0.16, 0.045],
      }[kind] || [440, 0.04, 0.03];
      oscillator.frequency.value = settings[0];
      oscillator.type = kind === "error" ? "triangle" : "sine";
      gain.gain.setValueAtTime(settings[2], context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + settings[1]);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + settings[1]);
      oscillator.addEventListener("ended", () => context.close());
    } catch (_) {
      // Sound is optional; browser restrictions should never block the assessment.
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) {
      // The assessment continues even if private browsing disables local storage.
    }
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return { ...emptyState(), ...parsed, profile: { ...emptyState().profile, ...(parsed.profile || {}) } };
    } catch (_) {
      return null;
    }
  }

  function hasMeaningfulProgress() {
    return Boolean(state.completed || state.profile.age || Object.keys(state.answers).length);
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    els.toast.textContent = message;
    els.toast.classList.add("is-visible");
    toastTimer = setTimeout(() => els.toast.classList.remove("is-visible"), 2800);
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
})();
