#!/usr/bin/env node
/**
 * Vercel build adapter for TanStack Start.
 *
 * `vite build` produces:
 *   dist/client  -> static assets
 *   dist/server  -> an ESM module whose default export is a { fetch } handler
 *
 * Vercel does not understand that layout on its own, so this script converts it
 * into the Vercel Build Output API v3 format (.vercel/output).
 */
import { execSync } from "node:child_process";
import { cpSync, mkdirSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const out = resolve(root, ".vercel/output");

execSync("vite build", { stdio: "inherit" });

const client = resolve(root, "dist/client");
const server = resolve(root, "dist/server");
if (!existsSync(client) || !existsSync(server)) {
  throw new Error("Build output missing: expected dist/client and dist/server");
}

rmSync(out, { recursive: true, force: true });

// 1. Static assets
mkdirSync(resolve(out, "static"), { recursive: true });
cpSync(client, resolve(out, "static"), { recursive: true });

// 2. SSR handler as an edge function
const fn = resolve(out, "functions/index.func");
mkdirSync(fn, { recursive: true });
cpSync(server, fn, { recursive: true });
writeFileSync(
  resolve(fn, ".vc-config.json"),
  JSON.stringify({ runtime: "edge", entrypoint: "server.js" }, null, 2),
);

// 3. Routing: static files first, everything else to the SSR function
writeFileSync(
  resolve(out, "config.json"),
  JSON.stringify(
    {
      version: 3,
      routes: [
        { src: "/assets/(.*)", headers: { "cache-control": "public, max-age=31536000, immutable" } },
        { handle: "filesystem" },
        { src: "/(.*)", dest: "/index" },
      ],
    },
    null,
    2,
  ),
);

console.log("Vercel build output written to .vercel/output");
