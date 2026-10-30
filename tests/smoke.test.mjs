import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
const js = readFileSync(new URL("../game.js", import.meta.url), "utf8");
const manifest = JSON.parse(readFileSync(new URL("../manifest.webmanifest", import.meta.url), "utf8"));

test("existen los recursos esenciales para el juego offline", () => {
  for (const file of ["index.html", "styles.css", "game.js", "manifest.webmanifest", "sw.js", "icon.svg"]) {
    assert.ok(existsSync(new URL("../" + file, import.meta.url)), file + " debe existir");
  }
});

test("los botones usados por el motor existen en la interfaz", () => {
  const ids = ["game", "playfield", "score", "wave", "best", "healthDots",
    "menuOverlay", "pauseOverlay", "upgradeOverlay", "gameoverOverlay",
    "startBtn", "resumeBtn", "restartBtn", "pauseRestartBtn", "pauseBtn",
    "soundBtn", "fireBtn", "joystick", "stick", "toast", "finalWave",
    "finalScore", "newRecord"];
  for (const id of ids) assert.ok(html.includes('id="' + id + '"'), "Falta id=" + id);
});

test("el juego se adapta a pantallas táctiles y tiene mejoras", () => {
  assert.match(html, /viewport-fit=cover/);
  assert.match(css, /touch-action:none/);
  assert.match(js, /pointerdown/);
  assert.match(html, /data-upgrade="blaster"/);
  assert.match(html, /data-upgrade="engine"/);
  assert.match(html, /data-upgrade="armor"/);
});

test("el manifiesto PWA apunta al inicio de la app", () => {
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, "./");
  assert.ok(manifest.icons.length > 0);
});
