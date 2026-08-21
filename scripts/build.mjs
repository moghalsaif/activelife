import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(root, "dist");
const client = resolve(output, "client");
const server = resolve(output, "server");
const publicFiles = [
  "index.html",
  "styles.css",
  "runtime.js",
  "assessment-data.js",
  "language.js",
  "miko-logic.js",
  "miko.js",
  "app.js",
];
const publicAssets = ["miko-buddy-crop.webp", "og-pathway.webp"];

await rm(output, { recursive: true, force: true });
await mkdir(client, { recursive: true });
await mkdir(server, { recursive: true });
await mkdir(resolve(client, "assets"), { recursive: true });

for (const file of publicFiles) {
  const source = resolve(root, file);
  await writeFile(resolve(client, file), await readFile(source));
}

for (const asset of publicAssets) {
  await copyFile(resolve(root, "assets", asset), resolve(client, "assets", asset));
}

await writeFile(
  resolve(server, "index.js"),
  `export default {
  async fetch(request, env) {
    if (env?.ASSETS?.fetch) {
      const response = await env.ASSETS.fetch(request);
      const headers = new Headers(response.headers);
      headers.set("Content-Security-Policy", "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; upgrade-insecure-requests");
      headers.set("Referrer-Policy", "no-referrer");
      headers.set("X-Content-Type-Options", "nosniff");
      headers.set("X-Frame-Options", "DENY");
      headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
      return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
    }
    return new Response("Pathway site assets are unavailable.", {
      status: 503,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  },
};
`,
);

console.log("Pathway production build is ready.");
