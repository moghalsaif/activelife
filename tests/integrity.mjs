import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const root = new URL("../", import.meta.url);

async function loadBrowserGlobal(file, name) {
  const source = await readFile(new URL(file, root), "utf8");
  const context = { window: {} };
  vm.runInNewContext(source, context, { filename: file });
  return context.window[name];
}

const data = await loadBrowserGlobal("assessment-data.js", "ASSESSMENT_DATA");
assert.ok(data, "assessment data should load");
assert.equal(data.questions.length, 75, "assessment must contain exactly 75 source questions");
assert.deepEqual(Array.from(data.questions, (question) => question.id), Array.from({ length: 75 }, (_, index) => index + 1), "question IDs must be sequential");
assert.equal(new Set(data.questions.map((question) => question.id)).size, 75, "question IDs must be unique");

const womenSpecific = data.questions.filter((question) => question.womenOnly);
assert.deepEqual(Array.from(womenSpecific, (question) => question.id), [69, 70, 71, 72, 73, 74, 75], "women-specific pathway must remain questions 69–75");
assert.equal(data.questions.filter((question) => !question.womenOnly).length, 68, "core pathway must contain 68 questions");

for (const question of data.questions) {
  assert.ok(data.categories[question.category], `question ${question.id} must reference a known category`);
  assert.ok(typeof question.prompt === "string" && question.prompt.trim().length >= 8, `question ${question.id} needs clear wording`);
  assert.ok(typeof question.help === "string" && question.help.trim().length >= 8, `question ${question.id} needs Miko guidance`);
  assert.ok(typeof question.why === "string" && question.why.trim().length >= 8, `question ${question.id} needs a rationale`);
  if (question.customOptions) {
    assert.ok(question.customOptions.length >= 2, `question ${question.id} needs at least two answer options`);
    for (const option of question.customOptions) {
      assert.ok(typeof option.value === "string" && option.value, `question ${question.id} option needs a value`);
      assert.ok(typeof option.label === "string" && option.label, `question ${question.id} option needs a label`);
      if (question.scored !== false) {
        const isPrivacyExclusion = option.score === null && /prefer not to answer/i.test(option.label);
        assert.ok(isPrivacyExclusion || [1, 2, 3].includes(option.score), `question ${question.id} scores must be 1, 2, 3, or an explicit privacy exclusion`);
      }
    }
  }
}

const guide = await loadBrowserGlobal("miko-logic.js", "MIKO_GUIDE");
assert.equal(guide.detectGlobalIntent("Is this sent to an AI API?".toLowerCase()), "technology");
assert.equal(guide.detectGlobalIntent("Are my answers private?".toLowerCase()), "privacy");
assert.equal(guide.detectGlobalIntent("I have severe chest pain".toLowerCase()), "urgent");
assert.equal(guide.detectQuestionIntent("What does this question mean?".toLowerCase()), "meaning");
assert.equal(guide.detectQuestionIntent("Why are you asking this?".toLowerCase()), "why");
assert.ok(guide.responses.urgent.includes("emergency medical help"), "urgent guidance must direct users to emergency help");

const html = await readFile(new URL("index.html", root), "utf8");
for (const requiredId of [
  "welcome-screen",
  "profile-form",
  "quiz-screen",
  "results-screen",
  "included-areas-value",
  "attention-areas-value",
  "safety-gate-value",
  "score-scale",
  "miko-result-note",
  "miko-dialog",
  "clear-data-dialog",
  "privacy-dialog",
  "app-alert",
]) {
  assert.match(html, new RegExp(`id=["']${requiredId}["']`), `index must include #${requiredId}`);
}

const appSource = await readFile(new URL("app.js", root), "utf8");
for (const categoryKey of ["cardiac", "fitness", "nutrition", "stress", "dependency", "cancer", "sensory", "hiv", "safety"]) {
  assert.match(appSource, new RegExp(`${categoryKey}: '<svg`), `results need a dedicated ${categoryKey} icon`);
}
assert.match(appSource, /class="category-icon category-icon--\$\{key\}"/, "result rows must render their category icon");
assert.match(appSource, /new IntersectionObserver/, "health-area animations must begin when rows enter the viewport");
assert.match(appSource, /entry\.target\.classList\.add\("is-visible"\)/, "visible health areas must activate their animation state");
const expectedScripts = ["runtime.js", "assessment-data.js", "language.js", "miko-logic.js", "miko.js", "app.js"];
let lastScriptIndex = -1;
for (const script of expectedScripts) {
  const index = html.indexOf(`src="${script}"`);
  assert.ok(index > lastScriptIndex, `${script} must load in the correct order`);
  lastScriptIndex = index;
}

const vercel = JSON.parse(await readFile(new URL("vercel.json", root), "utf8"));
const securityHeaders = new Set(vercel.headers?.[0]?.headers?.map((header) => header.key));
for (const header of ["Content-Security-Policy", "Referrer-Policy", "X-Content-Type-Options", "X-Frame-Options", "Permissions-Policy"]) {
  assert.ok(securityHeaders.has(header), `${header} must be configured`);
}

console.log("Production integrity checks passed: 75 questions, safe Miko intents, required UI, and security headers.");
