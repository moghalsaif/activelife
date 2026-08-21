import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(root, "dist");
const client = resolve(output, "client");
const server = resolve(output, "server");
const publicFiles = [
  "index.html",
  "styles.css",
  "assessment-data.js",
  "language.js",
  "miko.js",
  "app.js",
];

await rm(output, { recursive: true, force: true });
await mkdir(client, { recursive: true });
await mkdir(server, { recursive: true });

for (const file of publicFiles) {
  const source = resolve(root, file);
  await writeFile(resolve(client, file), await readFile(source));
}

await cp(resolve(root, "assets"), resolve(client, "assets"), { recursive: true });

await writeFile(
  resolve(server, "index.js"),
  `export default {
  async fetch(request, env) {
    if (env?.ASSETS?.fetch) return env.ASSETS.fetch(request);
    return new Response("Pathway site assets are unavailable.", {
      status: 503,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  },
};
`,
);

console.log("Pathway production build is ready.");
