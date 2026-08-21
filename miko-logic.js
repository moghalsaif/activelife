(function () {
  "use strict";

  const responses = Object.freeze({
    assessment: "This lifestyle screening has 68 core questions and seven women-specific context questions. It helps you notice patterns; it does not diagnose a condition.",
    privacy: "Your name, answers, and results stay in this browser. Miko’s replies are prepared locally from the assessment guidance, and you can clear saved answers from the home screen.",
    scoring: "Health-supportive answers receive 3 points, uncertain or middle answers receive 2, and risk answers receive 1. Some safety-critical answers use a stricter flag.",
    time: "Most people need about 15 to 20 minutes. When browser storage is available, progress is saved on this device so you can leave and return.",
    language: "Use the language menu in the header. On supported browsers, translation happens privately on your device and does not change scoring.",
    answer: "Choose the answer that best reflects your usual or current situation. If you are unsure, use “Not sure” rather than guessing when it is available.",
    technology: "I’m a local assessment guide, not a live AI service. I match your question to prepared guidance, so your message is not sent to an external chat API.",
    medical: "I can explain the assessment, but I cannot diagnose, change medication, or recommend treatment. Please discuss personal medical decisions with a qualified healthcare professional.",
    urgent: "If you have severe chest pain, major breathing difficulty, fainting, or another urgent symptom, stop the assessment and seek emergency medical help now.",
    results: "Your result is a structured screening snapshot, not a diagnosis or disease probability. Start with the first practical step and seek professional follow-up for concerning answers.",
    fallback: "I can explain the assessment, scoring, privacy, language support, how to answer, or how to read the final result.",
  });

  function detectGlobalIntent(message) {
    if (/emergency|chest pain|can't breathe|cannot breathe|fainting/.test(message)) return "urgent";
    if (/doctor|diagnos|treat|medicine|medication/.test(message)) return "medical";
    if (/\bapi\b|artificial intelligence|\bai\b|how.*chat|real person/.test(message)) return "technology";
    if (/private|privacy|save|stored|data|clear|delete/.test(message)) return "privacy";
    if (/score|point|rating|calculate/.test(message)) return "scoring";
    if (/language|translate|arabic|hindi|spanish|french/.test(message)) return "language";
    if (/time|long|minutes|finish/.test(message)) return "time";
    if (/answer|choose|select|not sure|guess/.test(message)) return "answer";
    if (/result|report|output/.test(message)) return "results";
    if (/assessment|quiz|check-in|what is|start|begin/.test(message)) return "assessment";
    return "fallback";
  }

  function detectQuestionIntent(message) {
    if (/emergency|chest pain|can't breathe|cannot breathe|fainting/.test(message)) return "urgent";
    if (/doctor|diagnos|treat|medicine|medication|should i stop/.test(message)) return "medical";
    if (/private|privacy|save|stored|data|clear|delete/.test(message)) return "privacy";
    if (/score|point|result|rating|calculate/.test(message)) return "score";
    if (/why|reason|matter|included|ask/.test(message)) return "why";
    if (/mean|explain|understand|term|what is|what does/.test(message)) return "meaning";
    if (/answer|choose|select|not sure|don't know|guess/.test(message)) return "answer";
    return "fallback";
  }

  window.MIKO_GUIDE = Object.freeze({ responses, detectGlobalIntent, detectQuestionIntent });
})();
