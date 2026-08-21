(function () {
  "use strict";

  const categories = {
    cardiac: {
      label: "Heart & circulation",
      shortLabel: "Cardiac risk",
      color: "#ef735f",
      description: "Family history, known conditions, blood pressure, blood sugar, blood fats, and related risk signals.",
      nextStep: "Review any heart, blood-pressure, blood-sugar, or cholesterol concerns with a qualified clinician.",
      technical: true,
      critical: true,
    },
    fitness: {
      label: "Movement & body",
      shortLabel: "Fitness & body",
      color: "#2d8f83",
      description: "Exercise safety, activity, stamina, strength, mobility, and body composition.",
      nextStep: "Choose one realistic movement habit you can repeat safely this week.",
      technical: false,
      critical: false,
    },
    nutrition: {
      label: "Food & hydration",
      shortLabel: "Nutrition",
      color: "#e5a93d",
      description: "Food knowledge, eating patterns, protein, fibre, fats, sugar, water, salt, and packaged foods.",
      nextStep: "Pick one food habit to improve first—regular meals, more plants, water, or less added sugar/salt.",
      technical: false,
      critical: false,
    },
    stress: {
      label: "Stress & support",
      shortLabel: "Stress",
      color: "#8575c8",
      description: "Stress symptoms, support at home, work pressures, coping style, and major life events.",
      nextStep: "Name one source of support and one small recovery practice you can use this week.",
      technical: false,
      critical: false,
    },
    dependency: {
      label: "Substances & dependency",
      shortLabel: "Dependencies",
      color: "#cc6a87",
      description: "Smoking, alcohol, chewing tobacco, passive smoke exposure, and narcotic drug use.",
      nextStep: "If reducing a substance feels difficult, ask a qualified professional about confidential support.",
      technical: true,
      critical: false,
    },
    cancer: {
      label: "Cancer risk signals",
      shortLabel: "Cancer risk",
      color: "#d9894c",
      description: "Long-term exposures, personal and family history, and preventive screening.",
      nextStep: "Discuss personal history, family history, exposures, and age-appropriate screening with a clinician.",
      technical: true,
      critical: true,
    },
    sensory: {
      label: "Eyes, ears & dental",
      shortLabel: "Eye, ENT & dental",
      color: "#4f89b8",
      description: "Hearing, corrected vision, and recurring ear, nose, throat, gum, or dental concerns.",
      nextStep: "Arrange a routine eye, hearing, or dental check if a concern is recurring or affecting daily life.",
      technical: false,
      critical: false,
    },
    hiv: {
      label: "HIV awareness",
      shortLabel: "HIV awareness",
      color: "#7166a8",
      description: "Optional awareness of HIV test status. You can skip this sensitive question.",
      nextStep: "If you are unsure about testing, seek confidential guidance from a qualified health service.",
      technical: true,
      critical: true,
    },
    safety: {
      label: "Everyday safety",
      shortLabel: "Safety",
      color: "#ce7b35",
      description: "Safety practices at home, at work, while commuting, and during higher-risk activities.",
      nextStep: "Fix one practical safety gap today—seat belts, helmets, protective equipment, or a home hazard.",
      technical: true,
      critical: true,
    },
    context: {
      label: "Women’s health context",
      shortLabel: "Women’s health",
      color: "#c77c91",
      description: "Context used to tailor safety notes and follow-up suggestions; these answers do not lower the lifestyle score.",
      nextStep: "Bring any pregnancy, breastfeeding, menstrual, menopause, or safety-at-home concerns to a qualified professional.",
      technical: false,
      critical: false,
    },
  };

  const defaultHelp = {
    cardiac: "Answer using what you currently know. If you have not been tested or are unsure, choose “Not sure” rather than guessing.",
    fitness: "Choose the answer that reflects your usual ability and routine, not your best-ever day.",
    nutrition: "Think about a typical week over the last month, including meals, snacks, and drinks.",
    stress: "Think about your experience over the last 12 months unless the question gives another timeframe.",
    dependency: "Choose the closest honest frequency. This is a non-judgmental screening question.",
    cancer: "Answer from your known history and routine exposures. This question cannot determine whether you have cancer.",
    sensory: "Focus on recurring or day-to-day issues rather than a brief, one-off problem.",
    hiv: "This is optional and private. You can choose “Prefer not to answer,” and HIV will be excluded from the score denominator.",
    safety: "Think about what you do consistently, not only what you intend to do.",
    context: "This answer is used for context and tailored safety notes, not to diagnose a condition.",
  };

  const defaultWhy = {
    cardiac: "The source assessment treats known cardiovascular and metabolic risks as safety-critical because they can change what exercise and follow-up are appropriate.",
    fitness: "Activity, stamina, strength, and mobility together give a broader picture than exercise frequency alone.",
    nutrition: "Repeated eating patterns can support or undermine cardiovascular, metabolic, and digestive health over time.",
    stress: "Persistent stress and low support can affect sleep, coping, daily habits, and physical wellbeing.",
    dependency: "Frequency and duration help identify patterns that may benefit from support or clinical follow-up.",
    cancer: "Personal history, family history, long-term exposures, and screening are considered separately because they mean different things.",
    sensory: "Recurring sensory or dental problems can affect comfort, communication, nutrition, and daily functioning.",
    hiv: "Knowing test status can help someone seek timely, confidential care, but this assessment cannot determine HIV status.",
    safety: "A single safety gap can have a large consequence, so the source logic uses a stricter rule in this category.",
    context: "Pregnancy, breastfeeding, menstrual health, menopause, and social safety can change the kind of guidance that is appropriate.",
  };

  const q = (id, category, prompt, config = {}) => ({
    id,
    category,
    prompt,
    scale: "yn",
    direction: "positive",
    technical: false,
    scored: true,
    help: defaultHelp[category],
    why: defaultWhy[category],
    ...config,
  });

  const questions = [
    q(1, "cardiac", "Has a close family member had a major heart or metabolic condition before age 60?", {
      scale: "ynu",
      direction: "risk",
      technical: true,
      context: "Close family means parents, grandparents, or siblings. Conditions include heart attack, high blood pressure, diabetes, or high cholesterol.",
      followup: {
        when: ["yes"],
        label: "Which conditions are in your family history?",
        type: "checks",
        options: ["Heart attack", "High blood pressure", "Diabetes", "High cholesterol"],
      },
    }),
    q(2, "cardiac", "Have you been diagnosed with coronary heart disease?", {
      scale: "ynu",
      direction: "risk",
      technical: true,
      context: "Examples in the source include angina, heart attack, angioplasty, or bypass surgery.",
      help: "Choose “Yes” if a clinician has diagnosed coronary heart disease or you have had one of the listed events/procedures. Optional test details do not replace clinical interpretation.",
      followup: {
        when: ["yes", "unsure"],
        label: "Optional test status",
        type: "test-status",
        options: ["ECG", "TMT / stress test", "Echocardiogram"],
      },
    }),
    q(3, "cardiac", "Do you have high blood pressure?", {
      scale: "ynu",
      direction: "risk",
      technical: true,
      followup: {
        when: ["yes", "no", "unsure"],
        label: "Latest reading, if known",
        type: "blood-pressure",
      },
    }),
    q(4, "cardiac", "Do you have high blood sugar or diabetes?", {
      scale: "ynu",
      direction: "risk",
      technical: true,
      followup: {
        when: ["yes", "no", "unsure"],
        label: "Latest glucose values, if known",
        type: "glucose",
      },
    }),
    q(5, "cardiac", "Do you have high cholesterol or triglycerides?", {
      scale: "ynu",
      direction: "risk",
      technical: true,
      followup: {
        when: ["yes", "no", "unsure"],
        label: "Latest lipid values, if known",
        type: "lipids",
      },
    }),
    q(6, "fitness", "In the last 12 months, have you had a major accident, surgery, or hospital stay?", {
      direction: "risk",
      technical: true,
      help: "Choose “Yes” if an event could affect what activity is safe now. A clinician should guide return to exercise after a major event.",
      followup: { when: ["yes"], label: "Optional detail", type: "text", placeholder: "What happened, and roughly when?" },
    }),
    q(7, "fitness", "Do you have anaemia?", {
      direction: "risk",
      technical: true,
      followup: { when: ["yes"], label: "Haemoglobin, if known", type: "number", suffix: "g/dL", min: 3, max: 25, step: 0.1 },
    }),
    q(8, "fitness", "Are you frequently taking prescribed medication or receiving medical treatment?", {
      direction: "risk",
      technical: true,
      help: "Medication is not “bad.” The question is a safety check because some conditions and medicines affect exercise and follow-up. Do not stop medication based on this assessment.",
      followup: {
        when: ["yes"],
        label: "What is the treatment mainly for?",
        type: "checks",
        options: ["High blood pressure", "Diabetes", "High cholesterol", "Heart condition", "Respiratory condition", "Another reason"],
      },
    }),
    q(9, "fitness", "Is exercise partly or fully limited by a medical or physical reason?", {
      direction: "risk",
      technical: true,
      followup: {
        when: ["yes"],
        label: "What currently limits exercise?",
        type: "checks",
        options: ["Orthopaedic impairment", "Limb difference or amputation", "Polio", "Muscular dysfunction", "Paralysis or stroke", "Another reason"],
      },
    }),
    q(10, "fitness", "Do you exercise for at least 30 minutes on three days each week?", {
      context: "If your usual occupation is substantially manual or physical, the source instructs you to choose “Yes.”",
    }),
    q(11, "fitness", "Is your resting pulse usually 72 beats per minute or lower while sitting?", {
      scale: "ynu",
      followup: { when: ["yes", "no", "unsure"], label: "Resting pulse, if known", type: "number", suffix: "bpm", min: 30, max: 220, step: 1 },
      help: "Measure after sitting quietly for several minutes. A single reading can vary, so choose “Not sure” if you do not have a reliable measurement.",
    }),
    q(12, "fitness", "Can you comfortably hold a deep breath for 45 seconds?", {
      scale: "ynu",
      help: "Do not attempt this if it feels unsafe or if you have a heart or respiratory condition. Choose “Not sure” instead. This is an old source-screening item, not a diagnostic lung test.",
      followup: { when: ["yes", "no", "unsure"], label: "Pulmonary function test, if known", type: "single-select", options: ["Not tested", "Normal", "Abnormal"] },
    }),
    q(13, "fitness", "Is the skinfold at your waist above the source threshold?", {
      scale: "ynu",
      direction: "risk",
      context: "The source threshold is more than 2.5 cm for the male pathway or more than 3 cm for the female pathway, pinched above the hip bone.",
      help: "This pinch test is only a rough historical screening method. If you cannot measure reliably, choose “Not sure.” Body composition is better assessed with current clinical methods.",
      followup: { when: ["yes", "no", "unsure"], label: "Skinfold measurement, if professionally measured", type: "number", suffix: "mm", min: 1, max: 100, step: 0.1 },
    }),
    q(14, "fitness", "Can you complete the source sit-up target for your age and sex pathway?", {
      scale: "ynu",
      context: "Targets: up to 30—20 male / 10 female; up to 40—15 / 7; up to 50—10 / 5; 60 and above—5 / 3.",
      help: "Do not attempt this if you have pain, a mobility problem, recent surgery, pregnancy, or a clinician has advised against it. Choose “Not sure” when it is not safe to test.",
      followup: { when: ["yes", "no", "unsure"], label: "Maximum continuous sit-ups, if tested safely", type: "number", suffix: "reps", min: 0, max: 200, step: 1 },
    }),
    q(15, "fitness", "Can you touch your toes without bending your knees?", {
      scale: "ynu",
      help: "This is a simple flexibility screen. Do not force the movement or test through pain; choose “Not sure” if it is unsafe.",
    }),
    q(16, "nutrition", "Can you identify common foods that are high in protein, carbohydrate, fat, and fibre?"),
    q(17, "nutrition", "Do you usually follow a vegetarian diet?", {
      customOptions: [
        { value: "yes", label: "Yes", score: 2 },
        { value: "no", label: "No", score: 2 },
      ],
      help: "The source asks this to interpret the next protein question. Vegetarian and non-vegetarian diets can both be balanced, so this answer is neutral in the score.",
    }),
    q(18, "nutrition", "Do you eat raw vegetables or fruit every day?"),
    q(19, "nutrition", "Which statement best describes your usual protein pattern?", {
      customOptions: [
        { value: "plant-daily", label: "Beans, dal, lentils, or gram almost daily", score: 3 },
        { value: "meat-high", label: "Meat more than three days a week", score: 1 },
        { value: "both", label: "Both statements fit", score: 2 },
        { value: "neither", label: "Neither statement fits", score: 2 },
      ],
      context: "The source presents these as two alternate versions of the same question; this combined choice makes the logic explicit.",
    }),
    q(20, "nutrition", "Do you eat high-saturated-fat foods more than twice a week?", {
      direction: "risk",
      context: "Examples: full-cream milk, butter, cheese, ghee, dalda, margarine, eggs, or red and organ meats.",
    }),
    q(21, "nutrition", "Do you frequently eat sweets or use more than four teaspoons of added sugar a day?", {
      direction: "risk",
      context: "Examples include puddings, cakes, mithai, sweets, chocolate, and ice cream.",
    }),
    q(22, "nutrition", "Do you drink more than six glasses of water on a typical day?"),
    q(23, "nutrition", "Do you regularly add excess salt or eat salty snacks?", {
      direction: "risk",
      context: "Examples include salted nuts, wafers, and biscuits.",
    }),
    q(24, "nutrition", "Do you eat restaurant or commercially prepared food at least twice a week?", {
      direction: "risk",
      context: "The source includes packaged drinks, jams, pickles, sauces, tinned, packaged, and smoked foods.",
    }),
    q(25, "nutrition", "Were either of your parents significantly overweight, or were you significantly overweight before age 18?", {
      direction: "risk",
      help: "This asks about family and early-life tendency, not blame. Choose the closest answer based on what you know.",
    }),
    q(26, "nutrition", "Do you usually eat a heavy dinner, snack between meals, or eat at irregular times?", { direction: "risk" }),
    q(27, "stress", "Do you frequently experience headaches?", {
      direction: "risk",
      technical: true,
      context: "For example, migraine or tension-type headaches.",
      help: "Frequent or severe headaches have many possible causes. This assessment cannot identify the cause; seek professional advice for new, severe, or persistent symptoms.",
    }),
    q(28, "stress", "Do you frequently experience respiratory problems?", {
      direction: "risk",
      technical: true,
      context: "For example, asthma, hay fever, or bronchitis.",
    }),
    q(29, "stress", "Do you frequently experience digestive problems?", {
      direction: "risk",
      technical: true,
      context: "For example, ulcers, irritable bowel symptoms, gas, or acidity.",
    }),
    q(30, "stress", "Do you frequently experience muscle or joint problems?", {
      direction: "risk",
      technical: true,
      context: "For example, arthritis, spondylosis, or back pain.",
    }),
    q(31, "stress", "Do you frequently experience skin problems?", {
      direction: "risk",
      technical: true,
      context: "For example, psoriasis, eczema, or recurring rash.",
    }),
    q(32, "stress", "Do you frequently experience allergies or recurring infections?", {
      direction: "risk",
      technical: true,
    }),
    q(33, "stress", "Do you frequently have difficulty falling asleep, staying asleep, or returning to sleep?", {
      direction: "risk",
      technical: true,
    }),
    q(34, "stress", "Do you have friends or relatives you can turn to for support and help?"),
    q(35, "stress", "Do you generally feel emotionally and physically compatible with your family members?", {
      help: "Choose the closest overall answer. If home feels unsafe, consider reaching out to a trusted person or appropriate local support service.",
    }),
    q(36, "stress", "Does your occupation give you adequate returns and a reasonable sense of future stability?", {
      context: "If you are not currently employed, interpret “occupation” as your main daily role, studies, caregiving, or job search.",
    }),
    q(37, "stress", "Does work or your main daily role regularly cause you to neglect home, recreation, or social life?", { direction: "risk" }),
    q(38, "stress", "Are you frequently time-pressured and impatient?", {
      direction: "risk",
      context: "Examples in the source include hating to wait, feeling tense in traffic, or interrupting conversations.",
    }),
    q(39, "stress", "Do you feel compelled to compete and win, and find losing very difficult?", { direction: "risk" }),
    q(40, "stress", "Do you avoid conflict or discussing differences at almost any cost?", { direction: "risk" }),
    q(41, "stress", "Is it difficult to give your own needs as much importance as other people’s needs?", { direction: "risk" }),
    q(42, "stress", "When you face a problem, are you usually able to plan possible solutions?"),
    q(43, "stress", "Can you consider ideas different from your own and delegate when appropriate?"),
    q(44, "stress", "In the last 12 months, have you experienced the death of someone significant to you?", {
      direction: "risk",
      technical: true,
      help: "Choose “Yes” if this happened. The answer is not a personal failing; it signals that extra support may be appropriate.",
    }),
    q(45, "stress", "In the last 12 months, has someone significant to you had a major illness?", {
      direction: "risk",
      technical: true,
    }),
    q(46, "stress", "In the last 12 months, have you experienced separation from family or divorce?", {
      direction: "risk",
      technical: true,
    }),
    q(47, "stress", "Are you currently dealing with a major ongoing problem or crisis?", {
      direction: "risk",
      technical: true,
      followup: {
        when: ["yes"],
        label: "Which areas are involved?",
        type: "checks",
        options: ["Daily hassles", "Family", "Health", "Financial", "Career", "Legal", "Another area"],
      },
    }),
    q(48, "dependency", "How often do you currently smoke?", {
      scale: "frequency",
      technical: true,
      help: "Include cigarettes, cigars, pipes, and similar smoked tobacco. Choose the closest current frequency.",
    }),
    q(49, "dependency", "How often do you currently drink alcohol?", {
      scale: "frequency",
      technical: true,
      help: "Choose the closest current frequency. This screen does not define a safe amount for you personally.",
    }),
    q(50, "dependency", "How often do you currently chew paan, paan masala, supari, or tobacco?", {
      scale: "frequency",
      technical: true,
    }),
    q(51, "dependency", "Are you exposed to other people’s smoke for long periods most days?", { direction: "risk", technical: true }),
    q(52, "dependency", "Have you smoked 10 or more cigarettes daily for seven years or more?", {
      direction: "risk",
      technical: true,
      help: "Answer “No” only if this never applied, or you have fully abstained for at least two years, following the source instruction.",
    }),
    q(53, "dependency", "Have you had more than two standard drinks almost every day for 10 years or more?", {
      direction: "risk",
      technical: true,
      help: "The source uses “two pegs or equivalent.” Because drink sizes vary, choose “Yes” if the long-term pattern clearly fits; otherwise choose the closest answer.",
    }),
    q(54, "dependency", "Have you chewed paan, supari, or tobacco almost daily for seven years or more?", {
      direction: "risk",
      technical: true,
      help: "Answer “No” only if this never applied, or you have fully abstained for at least two years, following the source instruction.",
    }),
    q(55, "dependency", "Do you currently use narcotic or non-prescribed recreational drugs?", {
      direction: "risk",
      technical: true,
      context: "The source examples include marijuana, opium, hashish, and heroin.",
      help: "This is a non-judgmental safety screen. If stopping feels difficult or withdrawal is a concern, seek qualified medical support rather than stopping abruptly on your own.",
    }),
    q(56, "cancer", "If you have fair or sun-sensitive skin, do you often have long sun exposure that leads to sunburn?", {
      technical: true,
      customOptions: [
        { value: "no", label: "No", score: 3 },
        { value: "yes", label: "Yes", score: 1 },
        { value: "na", label: "Not applicable", score: 3 },
      ],
    }),
    q(57, "cancer", "During the last seven years, have you often been exposed to industrial chemicals, fumes, dust, radiation, gasoline, or paint?", {
      direction: "risk",
      technical: true,
      help: "Think about repeated occupational or environmental exposure. Protective equipment and the specific material matter; discuss substantial exposure with an occupational-health professional.",
    }),
    q(58, "cancer", "Do you currently have cancer, or have you had cancer in the past?", {
      direction: "risk",
      technical: true,
      followup: { when: ["yes"], label: "Optional detail", type: "text", placeholder: "Current or past diagnosis, if you wish to note it" },
      help: "Choose “Yes” for a clinician-confirmed current or past diagnosis. This answer should lead to professional follow-up, not a self-directed plan from this assessment.",
    }),
    q(59, "cancer", "Have you had the cancer screening recommended for you within the last year?", {
      scale: "ynu",
      help: "Screening type and frequency depend on age, sex, history, and local guidance. Choose “Not sure” if you do not know what is recommended for you.",
      followup: { when: ["yes"], label: "Optional screening status", type: "test-status", options: ["Pap smear / cervical screening", "Mammogram", "Another screening"] },
    }),
    q(60, "cancer", "Has a parent, grandparent, or sibling had cancer?", {
      scale: "ynu",
      direction: "risk",
      technical: true,
      followup: {
        when: ["yes"],
        label: "Which broad type?",
        type: "checks",
        options: ["Breast, uterine, or ovarian", "Prostate", "Lung, colon, skin, blood, or another type"],
      },
    }),
    q(61, "sensory", "Do you have difficulty hearing?", {
      direction: "risk",
      followup: { when: ["yes"], label: "Optional note", type: "single-select", options: ["Mild or occasional difficulty", "Significant difficulty", "Deaf or profound hearing loss"] },
    }),
    q(62, "sensory", "Do you use spectacles or contact lenses to improve your vision?", {
      customOptions: [
        { value: "no", label: "No", score: 3 },
        { value: "yes", label: "Yes", score: 2 },
      ],
      help: "Using vision correction is not a failure. The source records it as a managed sensory need, so it receives a middle score rather than a risk score here.",
    }),
    q(63, "sensory", "Do you have recurring ear, nose, throat, gum, or dental problems?", {
      direction: "risk",
      followup: { when: ["yes"], label: "Which areas recur?", type: "checks", options: ["Ears", "Nose", "Throat", "Gums or teeth"] },
    }),
    q(64, "hiv", "What is your current HIV testing status?", {
      sensitive: true,
      technical: true,
      customOptions: [
        { value: "negative", label: "Most recent test was negative", score: 3 },
        { value: "positive", label: "Most recent test was positive", score: 1 },
        { value: "unaware", label: "Not tested or not aware", score: 2 },
        { value: "skip", label: "Prefer not to answer", score: null },
      ],
      help: "This optional answer stays on this device. A positive result is not a lifestyle failure; it is flagged only so the result can recommend confidential professional care. Choosing “Prefer not to answer” removes this category from the denominator.",
    }),
    q(65, "safety", "Do you consistently follow basic safety practices at home?", {
      technical: true,
      context: "For example, fire prevention, safe gas and electricity use, and safe balconies and stairways.",
    }),
    q(66, "safety", "Do you consistently follow the safety rules required in your work or main daily role?", {
      technical: true,
      help: "If formal workplace rules do not apply, answer based on the precautions appropriate to your main daily activities.",
    }),
    q(67, "safety", "Do you consistently follow safety rules while commuting?", {
      technical: true,
      context: "For example, seat belts, helmets, speed limits, and traffic rules.",
    }),
    q(68, "safety", "Do you frequently take part in contact, motor, water, air, or mountain adventure activities without appropriate preparation and protection?", {
      direction: "risk",
      technical: true,
      help: "The source asks only whether you do these activities. This clearer wording focuses the risk logic on preparation and protection, not on discouraging well-managed activity.",
    }),
    q(69, "context", "Are you currently pregnant?", {
      womenOnly: true,
      scored: false,
      direction: "risk",
      help: "This does not lower your score. It changes the safety note: exercise and nutrition should be discussed with your maternity-care professional.",
    }),
    q(70, "context", "Do you have biological children?", {
      womenOnly: true,
      scored: false,
      help: "This is retained from the source for context. It does not affect your lifestyle score.",
    }),
    q(71, "context", "Are you currently breastfeeding?", {
      womenOnly: true,
      scored: false,
      help: "This does not lower your score. It helps tailor the note about nutrition, hydration, and professional guidance.",
    }),
    q(72, "context", "Do you frequently experience significant discomfort during menstruation?", {
      womenOnly: true,
      scored: false,
      direction: "risk",
      help: "This does not lower your score. Persistent or severe pain deserves discussion with a qualified clinician.",
    }),
    q(73, "context", "Have you reached menopause naturally or through surgery?", {
      womenOnly: true,
      scored: false,
      help: "This is an unmodifiable health context, not a negative behaviour. It is used only to tailor follow-up language.",
    }),
    q(74, "context", "Do you feel subjected to discrimination or harassment socially or at work?", {
      womenOnly: true,
      scored: false,
      direction: "risk",
      help: "This is not your fault and does not lower your score. If you feel unsafe, consider contacting someone you trust or an appropriate local support service.",
    }),
    q(75, "context", "Do you feel pressured or dominated by family or society?", {
      womenOnly: true,
      scored: false,
      direction: "risk",
      help: "This is not your fault and does not lower your score. If control or coercion affects your safety, seek confidential support from a trusted person or local service when it is safe to do so.",
    }),
  ];

  window.ASSESSMENT_DATA = {
    title: "Preliminary Health & Lifestyle Scan",
    version: "75-question adult assessment",
    questions,
    categories,
  };
})();
