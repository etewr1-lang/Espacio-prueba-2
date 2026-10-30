/* Conquista Espacial · Juego HTML5 para móviles, sin dependencias */
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const canvas = $("game");
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) {
    $("menuOverlay").querySelector("p").textContent = "Este navegador no admite Canvas 2D. Abre el juego en Chrome o Firefox.";
    return;
  }

  const overlays = {
    menu: $("menuOverlay"),
    pause: $("pauseOverlay"),
    upgrade: $("upgradeOverlay"),
    gameover: $("gameoverOverlay")
  };
  const fields = { score: $("score"), wave: $("wave"), best: $("best"), health: $("healthDots") };
  const joystick = $("joystick");
  const stick = $("stick");
  const fireButton = $("fireBtn");
  const toastEl = $("toast");
  const keys = new Set();
  const input = { x: 0, y: 0, firing: false, stickPointer: null, firePointer: null };
  const STORAGE_KEY = "conquista-espacial-record-v1";

  function readRecord() {
    try { return Math.max(0, Number(localStorage.getItem(STORAGE_KEY)) || 0); }
    catch { return 0; }
  }
  function saveRecord(value) {
    try { localStorage.setItem(STORAGE_KEY, String(value)); }
    catch { /* El juego funciona sin almacenamiento local. */ }
  }

  const state = {
    mode: "menu", width: 320, height: 500, lastTime: 0, time: 0,
    score: 0, best: readRecord(), wave: 1, kills: 0,
    spawnTimer: 0, shotTimer: 0, toastTimer: 0, stars: [],
    enemies: [], shots: [], enemyShots: [], particles: [], pickups: [],
    sound: false, audio: null
  };
  const player = { x: 160, y: 420, r: 15, hp: 3, maxHp: 3, speed: 265,
    fireDelay: 0.23, damage: 1, invulnerable: 0 };

  function clamp(v, low, high) { return Math.max(low, Math.min(high, v)); }
  function rand(low, high) { return low + Math.random() * (high - low); }
  function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const oldWidth = state.width;
    state.width = Math.max(280, rect.width || 320);
    state.height = Math.max(260, rect.height || 450);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(state.width * dpr);
    canvas.height = Math.round(state.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    player.x = clamp(player.x * state.width / oldWidth, 22, state.width - 22);
    player.y = clamp(player.y, state.height * .25, state.height - 24);
    state.stars = Array.from({ length: 90 }, () => ({
      x: rand(0, state.width), y: rand(0, state.height),
      size: rand(.5, 2.2), speed: rand(14, 65), alpha: rand(.25, 1)
    }));
  }

  function showOverlay(which) {
    for (const [name, element] of Object.entries(overlays)) element.hidden = name !== which;
  }

  function updateHud() {
    fields.score.textContent = String(state.score).padStart(6, "0");
    fields.wave.textContent = String(state.wave).padStart(2, "0");
    fields.best.textContent = String(state.best).padStart(6, "0");
    fields.health.textContent = Array.from({ length: player.maxHp },
      (_, index) => index < player.hp ? "♥" : "♡").join(" ");
    fields.health.setAttribute("aria-label", "Escudo: " + player.hp + " de " + player.maxHp);
  }

  function sound(freq, seconds = .05, type = "sine", volume = .025) {
    if (!state.sound) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      if (!state.audio) state.audio = new AudioContextClass();
      if (state.audio.state === "suspended") state.audio.resume();
      const oscillator = state.audio.createOscillator();
      const gain = state.audio.createGain();
      const now = state.audio.currentTime;
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(freq, now);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(50, freq * .5), now + seconds);
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(.001, now + seconds);
      oscillator.connect(gain); gain.connect(state.audio.destination);
      oscillator.start(now); oscillator.stop(now + seconds);
    } catch { /* Audio opcional. */ }
  }

  function vibrate(ms) {
    if (navigator.vibrate) navigator.vibrate(ms);
  }

  function notify(text) {
    toastEl.textContent = text;
    toastEl.classList.add("show");
    state.toastTimer = 1.5;
  }

  function resetControls() {
    input.x = 0; input.y = 0; input.firing = false;
    input.stickPointer = null; input.firePointer = null;
    stick.style.transform = "translate(0px, 0px)";
    fireButton.classList.remove("active");
    keys.clear();
  }

  function startGame() {
    state.mode = "play"; state.time = 0; state.score = 0; state.wave = 1;
    state.kills = 0; state.spawnTimer = .65; state.shotTimer = 0;
    state.enemies = []; state.shots = []; state.enemyShots = [];
    state.particles = []; state.pickups = [];
    Object.assign(player, { x: state.width / 2, y: state.height * .79, hp: 3, maxHp: 3,
      speed: 265, fireDelay: .23, damage: 1, invulnerable: 1 });
    resetControls();
    showOverlay(null);
    $("pauseBtn").disabled = false;
    $("pauseBtn").textContent = "Ⅱ";
    $("pauseBtn").setAttribute("aria-label", "Pausar partida");
    updateHud(); notify("SECTOR ALFA"); sound(740, .18, "triangle");
  }

  function pauseGame() {
    if (state.mode !== "play") return;
    state.mode = "pause";
    resetControls();
    showOverlay("pause");
    $("pauseBtn").textContent = "▶";
    $("pauseBtn").setAttribute("aria-label", "Reanudar partida");
  }

  function resumeGame() {
    if (state.mode !== "pause") return;
    state.mode = "play";
    showOverlay(null);
    $("pauseBtn").textContent = "Ⅱ";
    $("pauseBtn").setAttribute("aria-label", "Pausar partida");
  }

  function gameOver() {
    state.mode = "gameover";
    resetControls();
    $("pauseBtn").disabled = true;
    $("finalScore").textContent = state.score.toLocaleString("es-EC");
    $("finalWave").textContent = state.wave;
    const newBest = state.score > state.best;
    if (newBest) {
      state.best = state.score;
      saveRecord(state.best);
    }
    $("newRecord").hidden = !newBest;
    updateHud();
    showOverlay("gameover");
    sound(170, .4, "sawtooth", .04);
  }

  function sparks(x, y, color, count = 9) {
    for (let i = 0; i < count; i++) {
      const angle = rand(0, Math.PI * 2), speed = rand(45, 170);
      state.particles.push({
        x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        life: rand(.25, .65), maxLife: .65, size: rand(1.5, 4), color
      });
    }
  }

  function shoot() {
    const spread = player.damage > 1 ? 8 : 0;
    for (const offset of (spread ? [-spread, spread] : [0])) {
      state.shots.push({ x: player.x + offset, y: player.y - 20, vy: -570, r: 3.8, damage: 1 });
    }
    sound(880, .055, "square", .012);
  }

  function spawnEnemy() {
    const typeRoll = Math.random();
    const type = typeRoll < .23 ? "asteroid" : typeRoll < .79 ? "scout" : "heavy";
    const r = type === "heavy" ? 23 : type === "asteroid" ? 18 : 16;
    const hp = (type === "heavy" ? 2 : 1) + Math.floor((state.wave - 1) / 5);
    state.enemies.push({
      x: rand(r + 10, state.width - r - 10), y: -40, r, type, hp,
      value: type === "heavy" ? 210 : type === "asteroid" ? 80 : 120,
      vy: rand(70, 116) + state.wave * 12, t: rand(0, 6.28),
      phase: rand(0, 6.28), amplitude: rand(3, 16),
      fireTimer: rand(2.5, 5.5), rotation: rand(0, Math.PI * 2)
    });
  }

  function takeDamage() {
    if (player.invulnerable > 0 || state.mode !== "play") return;
    player.hp--;
    player.invulnerable = 1.25;
    sparks(player.x, player.y, "#f56aab", 14);
    sound(200, .2, "sawtooth", .04);
    vibrate(80);
    updateHud();
    if (player.hp <= 0) gameOver();
  }

  function beginUpgrade() {
    state.mode = "upgrade";
    resetControls();
    showOverlay("upgrade");
    sound(990, .24, "triangle", .04);
  }

  function chooseUpgrade(kind) {
    if (state.mode !== "upgrade") return;
    if (kind === "blaster") {
      player.fireDelay = Math.max(.085, player.fireDelay * .81);
      if (player.fireDelay < .14) player.damage = 2;
    } else if (kind === "engine") {
      player.speed = Math.min(450, player.speed + 35);
    } else if (kind === "armor") {
      player.maxHp = Math.min(6, player.maxHp + 1);
      player.hp = Math.min(player.maxHp, player.hp + 2);
    } else return;
    state.mode = "play";
    showOverlay(null);
    updateHud(); notify("OLA " + String(state.wave).padStart(2, "0"));
  }

  function killEnemy(enemy) {
    state.score += enemy.value + state.wave * 10;
    state.kills++;
    sparks(enemy.x, enemy.y, enemy.type === "asteroid" ? "#ffda87" : "#67f7ed", 12);
    sound(260, .07, "triangle", .018);
    if (Math.random() < .11) {
      state.pickups.push({ x: enemy.x, y: enemy.y, r: 10, speed: 75, t: 0 });
    }
    updateHud();
    if (state.kills >= state.wave * 12) {
      state.wave++;
      beginUpgrade();
    }
  }

  function update(dt) {
    const w = state.width, h = state.height;
    state.time += dt;
    player.invulnerable = Math.max(0, player.invulnerable - dt);
    state.shotTimer -= dt;
    state.spawnTimer -= dt;
    state.toastTimer -= dt;
    if (state.toastTimer <= 0) toastEl.classList.remove("show");

    let dx = input.x + (keys.has("ArrowRight") || keys.has("d") ? 1 : 0)
      - (keys.has("ArrowLeft") || keys.has("a") ? 1 : 0);
    let dy = input.y + (keys.has("ArrowDown") || keys.has("s") ? 1 : 0)
      - (keys.has("ArrowUp") || keys.has("w") ? 1 : 0);
    const length = Math.hypot(dx, dy);
    if (length > 1) { dx /= length; dy /= length; }
    player.x = clamp(player.x + dx * player.speed * dt, 21, w - 21);
    player.y = clamp(player.y + dy * player.speed * dt, h * .28, h - 25);

    if ((input.firing || keys.has(" ")) && state.shotTimer <= 0) {
      shoot();
      state.shotTimer = player.fireDelay;
    }
    if (state.spawnTimer <= 0) {
      spawnEnemy();
      state.spawnTimer = Math.max(.36, 1.12 - state.wave * .055) * rand(.72, 1.22);
    }

    for (let i = state.enemies.length - 1; i >= 0; i--) {
      const e = state.enemies[i];
      e.t += dt;
      e.y += e.vy * dt;
      e.x = clamp(e.x + Math.sin(e.t * 2 + e.phase) * e.amplitude * dt, e.r, w - e.r);
      e.rotation += dt;
      e.fireTimer -= dt;
      if (state.wave >= 3 && e.type !== "asteroid" && e.y > 15 && e.y < h * .65 && e.fireTimer <= 0) {
        state.enemyShots.push({ x: e.x, y: e.y + e.r, vy: 185 + state.wave * 8, r: 5 });
        e.fireTimer = rand(2.6, 4.8);
      }
      if (e.y - e.r > h) {
        state.enemies.splice(i, 1);
        takeDamage();
        continue;
      }
      if (distance(e, player) < e.r + player.r - 4) {
        state.enemies.splice(i, 1);
        sparks(e.x, e.y, "#f66aaa", 10);
        takeDamage();
      }
    }

    for (let i = state.shots.length - 1; i >= 0; i--) {
      const bullet = state.shots[i];
      bullet.y += bullet.vy * dt;
      if (bullet.y < -15) { state.shots.splice(i, 1); continue; }
      for (let j = state.enemies.length - 1; j >= 0; j--) {
        const enemy = state.enemies[j];
        if (distance(bullet, enemy) < bullet.r + enemy.r) {
          state.shots.splice(i, 1);
          enemy.hp -= bullet.damage;
          sparks(bullet.x, bullet.y, "#aceffd", 3);
          if (enemy.hp <= 0) {
            state.enemies.splice(j, 1);
            killEnemy(enemy);
          }
          break;
        }
      }
      if (state.mode !== "play") break;
    }

    for (let i = state.enemyShots.length - 1; i >= 0; i--) {
      const shot = state.enemyShots[i];
      shot.y += shot.vy * dt;
      if (shot.y > h + 20) { state.enemyShots.splice(i, 1); continue; }
      if (distance(shot, player) < shot.r + player.r) {
        state.enemyShots.splice(i, 1);
        takeDamage();
      }
    }
    for (let i = state.pickups.length - 1; i >= 0; i--) {
      const p = state.pickups[i];
      p.y += p.speed * dt; p.t += dt;
      if (p.y > h + 20) { state.pickups.splice(i, 1); continue; }
      if (distance(p, player) < p.r + player.r) {
        state.pickups.splice(i, 1);
        player.hp = Math.min(player.maxHp, player.hp + 1);
        sparks(p.x, p.y, "#8dffb7", 10);
        notify("+1 ESCUDO");
        sound(1120, .12, "sine");
        updateHud();
      }
    }
    state.particles = state.particles.filter(p => {
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= .98; p.vy *= .98; p.life -= dt;
      return p.life > 0;
    });
  }

  function drawBackground(dt) {
    const w = state.width, h = state.height;
    ctx.fillStyle = "#060d23";
    ctx.fillRect(0, 0, w, h);
    const nebula = ctx.createRadialGradient(w * .35, h * .4, 0, w * .35, h * .4, w * .8);
    nebula.addColorStop(0, "#172951");
    nebula.addColorStop(.55, "#0a1635");
    nebula.addColorStop(1, "#060d23");
    ctx.fillStyle = nebula; ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.strokeStyle = "#26355e"; ctx.globalAlpha = .25; ctx.lineWidth = 1;
    const step = 55, shift = (state.time * 15) % step;
    for (let x = w / 2 % step; x < w; x += step) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = shift; y < h; y += step) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    ctx.restore();
    for (const star of state.stars) {
      star.y += star.speed * dt * (state.mode === "play" ? 1 : .22);
      if (star.y > h) { star.y = 0; star.x = rand(0, w); }
      ctx.globalAlpha = star.alpha;
      ctx.fillStyle = star.size > 1.5 ? "#95e6f5" : "#eefaff";
      ctx.fillRect(star.x, star.y, star.size, star.size);
    }
    ctx.globalAlpha = 1;
  }

  function drawShip() {
    if (player.invulnerable > 0 && Math.floor(player.invulnerable * 9) % 2 === 0) return;
    const { x, y } = player;
    ctx.save(); ctx.translate(x, y);
    ctx.shadowColor = "#63fff3"; ctx.shadowBlur = 17;
    ctx.fillStyle = "#62f5ea";
    ctx.beginPath();
    ctx.moveTo(0, -21); ctx.lineTo(12, -2); ctx.lineTo(19, 12);
    ctx.lineTo(6, 8); ctx.lineTo(0, 15); ctx.lineTo(-6, 8);
    ctx.lineTo(-19, 12); ctx.lineTo(-12, -2);
    ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = "#123859";
    ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(5, 2); ctx.lineTo(-5, 2); ctx.fill();
    ctx.fillStyle = "#ffc976";
    const flameHeight = 16 + Math.sin(state.time * 22) * 5;
    ctx.beginPath(); ctx.moveTo(-5, 12); ctx.lineTo(0, flameHeight + 13); ctx.lineTo(5, 12); ctx.fill();
    ctx.restore();
    if (player.invulnerable > 0) {
      ctx.strokeStyle = "#84fff48e";
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(x, y, 25, 0, Math.PI * 2); ctx.stroke();
    }
  }

  function drawEnemy(e) {
    ctx.save(); ctx.translate(e.x, e.y);
    if (e.type === "asteroid") {
      ctx.rotate(e.rotation * .55);
      ctx.fillStyle = "#a27c75"; ctx.strokeStyle = "#f3c69a"; ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const radius = e.r * (i % 2 ? .87 : 1.05);
        if (!i) ctx.moveTo(Math.cos(a) * radius, Math.sin(a) * radius);
        else ctx.lineTo(Math.cos(a) * radius, Math.sin(a) * radius);
      }
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#624e56";
      ctx.beginPath(); ctx.arc(-4, -3, 4, 0, Math.PI * 2); ctx.fill();
    } else {
      const heavy = e.type === "heavy";
      ctx.fillStyle = heavy ? "#f6b668" : "#f16aaf";
      ctx.shadowColor = heavy ? "#f5a65d" : "#ff6fb7";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(0, e.r); ctx.lineTo(e.r, -e.r * .5);
      ctx.lineTo(e.r * .35, -e.r * .25); ctx.lineTo(0, -e.r * .63);
      ctx.lineTo(-e.r * .35, -e.r * .25); ctx.lineTo(-e.r, -e.r * .5);
      ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0; ctx.fillStyle = "#491d51";
      ctx.fillRect(-4, -3, 8, 9);
    }
    ctx.restore();
  }

  function draw() {
    const dt = Math.min((performance.now() - (draw.previous || performance.now())) / 1000, .04);
    draw.previous = performance.now();
    drawBackground(dt);
    if (state.mode === "menu") {
      ctx.globalAlpha = .6;
      ctx.save();
      const x = state.width / 2, y = state.height * .79;
      ctx.translate(x, y); ctx.fillStyle = "#62f5ea"; ctx.shadowColor = "#62f5ea"; ctx.shadowBlur = 20;
      ctx.beginPath(); ctx.moveTo(0, -25); ctx.lineTo(20, 20); ctx.lineTo(0, 12); ctx.lineTo(-20, 20); ctx.closePath(); ctx.fill();
      ctx.restore(); ctx.globalAlpha = 1;
      return;
    }
    for (const p of state.pickups) {
      const size = p.r + Math.sin(p.t * 6) * 2;
      ctx.shadowColor = "#71ffc4"; ctx.shadowBlur = 14;
      ctx.fillStyle = "#9ffcc2";
      ctx.beginPath(); ctx.arc(p.x, p.y, size, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#164a3c"; ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("+", p.x, p.y);
    }
    for (const bullet of state.shots) {
      ctx.shadowColor = "#64faf1"; ctx.shadowBlur = 13;
      ctx.fillStyle = "#b7fff6";
      ctx.fillRect(bullet.x - 2.5, bullet.y - 11, 5, 18);
    }
    ctx.shadowBlur = 0;
    for (const bullet of state.enemyShots) {
      ctx.fillStyle = "#ff729c"; ctx.beginPath(); ctx.arc(bullet.x, bullet.y, bullet.r, 0, 6.283); ctx.fill();
    }
    for (const enemy of state.enemies) drawEnemy(enemy);
    if (state.mode !== "gameover") drawShip();
    for (const p of state.particles) {
      ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1);
      ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  function frame(now) {
    const dt = Math.min((now - (state.lastTime || now)) / 1000, .04);
    state.lastTime = now;
    if (state.mode === "play") update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  function moveJoystick(event) {
    const rect = joystick.getBoundingClientRect();
    const x = event.clientX - (rect.left + rect.width / 2);
    const y = event.clientY - (rect.top + rect.height / 2);
    const length = Math.hypot(x, y);
    const radius = 30;
    input.x = clamp(x / radius, -1, 1);
    input.y = clamp(y / radius, -1, 1);
    if (length > radius) { input.x = x / length; input.y = y / length; }
    stick.style.transform = "translate(" + (input.x * radius) + "px," + (input.y * radius) + "px)";
  }

  joystick.addEventListener("pointerdown", e => {
    if (state.mode !== "play" || input.stickPointer !== null) return;
    e.preventDefault(); input.stickPointer = e.pointerId;
    joystick.setPointerCapture(e.pointerId); moveJoystick(e);
  });
  joystick.addEventListener("pointermove", e => {
    if (e.pointerId === input.stickPointer) moveJoystick(e);
  });
  function releaseJoystick(e) {
    if (e.pointerId !== input.stickPointer) return;
    input.stickPointer = null; input.x = 0; input.y = 0;
    stick.style.transform = "translate(0px, 0px)";
  }
  joystick.addEventListener("pointerup", releaseJoystick);
  joystick.addEventListener("pointercancel", releaseJoystick);
  joystick.addEventListener("lostpointercapture", releaseJoystick);

  fireButton.addEventListener("pointerdown", e => {
    if (state.mode !== "play" || input.firePointer !== null) return;
    e.preventDefault(); input.firePointer = e.pointerId; input.firing = true;
    fireButton.classList.add("active"); fireButton.setPointerCapture(e.pointerId);
  });
  function releaseFire(e) {
    if (e.pointerId !== input.firePointer) return;
    input.firePointer = null; input.firing = false;
    fireButton.classList.remove("active");
  }
  fireButton.addEventListener("pointerup", releaseFire);
  fireButton.addEventListener("pointercancel", releaseFire);
  fireButton.addEventListener("lostpointercapture", releaseFire);

  window.addEventListener("keydown", e => {
    if ([" ", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) e.preventDefault();
    if ((e.key === "p" || e.key === "Escape") && !e.repeat) {
      if (state.mode === "play") pauseGame();
      else if (state.mode === "pause") resumeGame();
      return;
    }
    keys.add(e.key.length === 1 ? e.key.toLowerCase() : e.key);
  });
  window.addEventListener("keyup", e => keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key));
  window.addEventListener("blur", () => { if (state.mode === "play") pauseGame(); });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && state.mode === "play") pauseGame();
  });

  $("startBtn").addEventListener("click", startGame);
  $("restartBtn").addEventListener("click", startGame);
  $("pauseRestartBtn").addEventListener("click", startGame);
  $("resumeBtn").addEventListener("click", resumeGame);
  $("pauseBtn").addEventListener("click", () => {
    if (state.mode === "play") pauseGame();
    else if (state.mode === "pause") resumeGame();
  });
  $("soundBtn").addEventListener("click", () => {
    state.sound = !state.sound;
    $("soundBtn").setAttribute("aria-pressed", String(state.sound));
    $("soundBtn").setAttribute("aria-label", state.sound ? "Desactivar sonido" : "Activar sonido");
    $("soundBtn").textContent = state.sound ? "♫" : "♪";
    sound(780, .09);
  });
  document.querySelectorAll("[data-upgrade]").forEach(button => {
    button.addEventListener("click", () => chooseUpgrade(button.dataset.upgrade));
  });

  window.addEventListener("resize", resize);
  resize(); updateHud(); showOverlay("menu");
  requestAnimationFrame(frame);
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
  }
})();
