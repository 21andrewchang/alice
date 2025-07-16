<script lang="ts">
import { onMount, onDestroy, tick } from 'svelte';
import { cubicOut } from 'svelte/easing';
import { goto } from '$app/navigation';
import { supabase } from '$lib/supabaseClient';

let canvasEl: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D | null = null;
let animationId: number;

let width = 0;
let height = 0;
let mouse = { x: -1000, y: -1000 };
let cursorX = 0;
let cursorY = 0;
let showCustomCursor = false;
let cursorSpawned = false;
let cursorScale = 0;
let cursorSpawnedOnce = false;
let cursorTimer: ReturnType<typeof setTimeout>;
let cursorGravityScale = 0;

const dotSpacing = 32; // was 24, fewer dots, more spread out
const dotRadius = 0.7; // was 1.0, smaller dots
const minBrightness = 0.24; // was 0.18, brighter dots
const maxBrightness = 0.48; // was 0.38, brighter dots
const cursorEffectRadius = 420; // very large radius for global shift
const cursorAttractStrength = 0.22; // strong enough to move the grid
// Make the dots more bouncy and smooth
const cursorDeceleration = 0.90; // was 0.82, higher = more floaty
const maxDotDisplacement = 32;
const springK = 0.07; // was 0.12, lower = softer spring
const damping = 0.75;

// Glow dots background
let glowCanvasEl: HTMLCanvasElement;
let glowCtx: CanvasRenderingContext2D | null = null;
const glowDotCount = 18;
let glowDots: {x: number, y: number, r: number, color: string, a: number}[] = [];

let showLoginModal = false;
let email = '';

// For button glow
let btnGlowX = 50;
let btnGlowY = 50;
let btnHover = false;
let btnGlowFadeTimer: ReturnType<typeof setTimeout> | null = null;

// Each dot gets a random base brightness
let dots: {x: number, y: number, ox: number, oy: number, vx: number, vy: number, baseB: number}[] = [];

let cursorCanvasEl: HTMLCanvasElement;
let cursorCtx: CanvasRenderingContext2D | null = null;
let cursorAberrationAnimId: number;
let prevCursor = { x: 0, y: 0, time: Date.now() };

// --- Chromatic Aberration Animated Heading ---
const headingText = 'Unleash Your Intellectual Potential';
let headingSpanRefs: HTMLSpanElement[] = new Array(headingText.length);
let headingSpans: HTMLSpanElement[] = headingSpanRefs;
let headingRef: HTMLDivElement;
let headingRect = { left: 0, top: 0, width: 0, height: 0 };
let headingMouse = { x: -1000, y: -1000 };
let animId: number;

function updateHeadingRect() {
  if (headingRef) {
    const rect = headingRef.getBoundingClientRect();
    headingRect = {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height
    };
  }
}

function handleHeadingMouseMove(e: MouseEvent) {
  headingMouse.x = e.clientX;
  headingMouse.y = e.clientY;
}
function handleHeadingMouseLeave() {
  headingMouse.x = -1000;
  headingMouse.y = -1000;
}

// Optimize heading animation: only update visible spans and throttle frame rate
let lastAberrationUpdate = 0;
function animateHeadingAberration() {
  const now = performance.now();
  if (now - lastAberrationUpdate < 32) { // ~30fps
    animId = requestAnimationFrame(animateHeadingAberration);
    return;
  }
  lastAberrationUpdate = now;
  for (let i = 0; i < headingSpans.length; i++) {
    const span = headingSpans[i];
    if (!span || span.offsetParent === null) continue;
    const rect = span.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    // If mouse is off-screen, treat as far left
    let mouseX = headingMouse.x;
    if (mouseX < 0) mouseX = 0;
    if (mouseX > window.innerWidth) mouseX = window.innerWidth;
    const dx = Math.abs(mouseX - cx);
    const maxDist = window.innerWidth;
    let proximity = Math.max(0, 1 - dx / maxDist);
    // Use linear fade for now to guarantee effect is visible
    const t = now / 1000 + i * 0.13;
    const vibrate = Math.sin(t * (48 + 64 * proximity) + i) * (0.5 + 1.2 * proximity);
    const split = proximity > 0.01 ? (0.5 + proximity * 2 + vibrate * proximity * 1.2) : 0;
    const alpha = proximity > 0.01 ? (0.5 * proximity + 0.5 * proximity) : 0;
    span.style.setProperty('--aberration', `${split}px`);
    span.style.setProperty('--aberration-alpha', `${alpha}`);
    // Update green layer (vertical split)
    const greenSpan = span.parentElement?.querySelector('.aberration-green') as HTMLElement | null;
    if (greenSpan) {
      greenSpan.style.setProperty('--aberration', `${split}px`);
      greenSpan.style.setProperty('--aberration-alpha', `${alpha}`);
      // Alternate up/down for green for visual interest
      greenSpan.style.transform = `translateY(${i % 2 === 0 ? '-' : ''}${split}px)`;
    }
  }
  animId = requestAnimationFrame(animateHeadingAberration);
}

function setupGrid() {
  width = window.innerWidth;
  height = window.innerHeight;
  dots = [];
  for (let y = 0; y <= height; y += dotSpacing) {
    for (let x = 0; x <= width; x += dotSpacing) {
      const baseB = minBrightness + Math.random() * (maxBrightness - minBrightness);
      dots.push({ x, y, ox: x, oy: y, vx: 0, vy: 0, baseB });
    }
  }
}

function setupGlowDots() {
  width = window.innerWidth;
  height = window.innerHeight;
  glowDots = [];
  for (let i = 0; i < glowDotCount; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const r = 60 + Math.random() * 80;
    const color = Math.random() > 0.5 ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.10)';
    const a = 0.18 + Math.random() * 0.12;
    glowDots.push({ x, y, r, color, a });
  }
}

function drawGlowDots() {
  if (!glowCtx) return;
  glowCtx.clearRect(0, 0, width, height);
  for (const dot of glowDots) {
    const grad = glowCtx.createRadialGradient(dot.x, dot.y, 0, dot.x, dot.y, dot.r);
    grad.addColorStop(0, dot.color.replace('0.12', dot.a.toFixed(2)).replace('0.10', dot.a.toFixed(2)));
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    glowCtx.beginPath();
    glowCtx.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2);
    glowCtx.fillStyle = grad;
    glowCtx.fill();
  }
}

// Custom cursor lag
let lagCursorX = 0;
let lagCursorY = 0;
const cursorLag = 0.12; // 0.1-0.2 is a good range

function animate() {
  if (!ctx) return;
  ctx.clearRect(0, 0, width, height);
  for (const dot of dots) {
    // Spring force toward original position
    let springFx = (dot.ox - dot.x) * springK;
    let springFy = (dot.oy - dot.y) * springK;

    // Only apply repelling force if cursor has spawned
    if (cursorSpawnedOnce) {
      const dx = dot.x - mouse.x;
      const dy = dot.y - mouse.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const maxDist = Math.max(width, height); // as big as the page
      if (dist < maxDist) {
        // Strong repelling force near center, much less farther away
        const repelStrength = 0.18 * Math.exp(-dist / (maxDist * 0.22)); // exponential falloff
        springFx += (dx / (dist + 1e-6)) * repelStrength * maxDist * cursorGravityScale;
        springFy += (dy / (dist + 1e-6)) * repelStrength * maxDist * cursorGravityScale;
      }
    }

    // More physically realistic spring-damper (for bounciness)
    dot.vx = (dot.vx + springFx) * cursorDeceleration;
    dot.vy = (dot.vy + springFy) * cursorDeceleration;

    dot.x += dot.vx;
    dot.y += dot.vy;

    // Clamp dot displacement
    const odx = dot.x - dot.ox;
    const ody = dot.y - dot.oy;
    const odist = Math.sqrt(odx*odx + ody*ody);
    if (odist > maxDotDisplacement) {
      const clampAngle = Math.atan2(ody, odx);
      dot.x = dot.ox + Math.cos(clampAngle) * maxDotDisplacement;
      dot.y = dot.oy + Math.sin(clampAngle) * maxDotDisplacement;
      // Do NOT reset dot.vx or dot.vy to zero; let them decay naturally
    }

    // Draw dot with dynamic brightness (brighter when closer to cursor)
    // Add twinkle: randomize brightness a bit each frame
    let brightness = dot.baseB + (Math.random() - 0.5) * 0.12;
    if (cursorSpawnedOnce) {
      const dx = dot.x - mouse.x;
      const dy = dot.y - mouse.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const maxDist = Math.max(width, height);
      if (dist < maxDist) {
        brightness += (maxBrightness - dot.baseB) * (1 - dist / maxDist);
      }
    }
    const b = Math.min(1, Math.max(0, brightness));
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, dotRadius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${b})`;
    ctx.shadowColor = `rgba(255,255,255,${b*0.7})`;
    ctx.shadowBlur = 2;
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  animationId = requestAnimationFrame(animate);
}

// Custom cursor lag update
function updateLagCursor() {
  lagCursorX += (cursorX - lagCursorX) * cursorLag;
  lagCursorY += (cursorY - lagCursorY) * cursorLag;
  requestAnimationFrame(updateLagCursor);
}

function handleResize() {
  setupGrid();
  setupGlowDots();
  if (canvasEl) {
    canvasEl.width = width;
    canvasEl.height = height;
  }
  if (glowCanvasEl) {
    glowCanvasEl.width = width;
    glowCanvasEl.height = height;
  }
  drawGlowDots();
}

onMount(() => {
  (async () => {
    ctx = canvasEl.getContext('2d');
    glowCtx = glowCanvasEl.getContext('2d');
    cursorCtx = cursorCanvasEl.getContext('2d');
    handleResize();
    animate();
    updateLagCursor();
    resizeCursorCanvas();
    drawCursorAberration();
    await tick();
    updateHeadingRect();
    animateHeadingAberration();
  })();
  window.addEventListener('resize', handleResize);
  window.addEventListener('resize', resizeCursorCanvas);
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('touchmove', handleTouchMove, { passive: false });
  window.addEventListener('resize', updateHeadingRect);
  return () => {
    window.removeEventListener('resize', handleResize);
    window.removeEventListener('resize', resizeCursorCanvas);
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('touchmove', handleTouchMove);
    window.cancelAnimationFrame(animationId);
    cancelAnimationFrame(cursorAberrationAnimId);
    window.removeEventListener('resize', updateHeadingRect);
    cancelAnimationFrame(animId);
  };
});

function resizeCursorCanvas() {
  const dpr = window.devicePixelRatio || 1;
  cursorCanvasEl.width = window.innerWidth * dpr;
  cursorCanvasEl.height = window.innerHeight * dpr;
  cursorCanvasEl.style.width = `${window.innerWidth}px`;
  cursorCanvasEl.style.height = `${window.innerHeight}px`;
  cursorCtx?.setTransform(1, 0, 0, 1, 0, 0);
  cursorCtx?.scale(dpr, dpr);
}

function drawCursorAberration() {
  if (!cursorCtx) return;
  cursorCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);

  // Aberration logic
  const now = Date.now();
  const dt = now - prevCursor.time;
  const dx = lagCursorX - prevCursor.x;
  const dy = lagCursorY - prevCursor.y;
  const velocity = Math.sqrt(dx * dx + dy * dy) / (dt || 1);
  prevCursor = { x: lagCursorX, y: lagCursorY, time: now };

  // Use the same radius as the main white cursor (16px at scale 1)
  const minOffset = 0;
  const maxOffset = 18;
  const aberrationOffset = Math.max(minOffset, Math.min(maxOffset, velocity * 1.2));
  const circleRadius = 16 * cursorScale;

  function drawAberrationCircle(offsetX: number, offsetY: number, color: string, rad: number) {
    if (!cursorCtx) return;
    cursorCtx.save();
    cursorCtx.shadowColor = color;
    cursorCtx.shadowBlur = 8;
    cursorCtx.beginPath();
    cursorCtx.arc(lagCursorX + offsetX, lagCursorY + offsetY, rad, 0, Math.PI * 2);
    cursorCtx.fillStyle = color;
    cursorCtx.fill();
    cursorCtx.restore();
  }

  // Draw colored circles first (so they hide behind the white core)
  drawAberrationCircle(aberrationOffset, 0, 'rgba(254, 0, 0, 0.7)', circleRadius);
  drawAberrationCircle(-aberrationOffset, 0, 'rgba(0, 128, 255, 0.7)', circleRadius);
  // Draw the white core last, always on top, same size as color circles
  drawAberrationCircle(0, 0, 'rgba(255,255,255,0.95)', circleRadius);

  cursorAberrationAnimId = requestAnimationFrame(drawCursorAberration);
}

function animateCursorScale() {
  if (cursorScale < 1) {
    cursorScale += (1 - cursorScale) * 0.22 + 0.01;
    cursorGravityScale += (1 - cursorGravityScale) * 0.22 + 0.01;
    if (cursorScale > 0.995) cursorScale = 1;
    if (cursorGravityScale > 0.995) cursorGravityScale = 1;
    requestAnimationFrame(animateCursorScale);
  }
}

function handleMouseMove(e: MouseEvent) {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
  cursorX = e.clientX;
  cursorY = e.clientY;
  if (!cursorSpawnedOnce) {
    lagCursorX = cursorX;
    lagCursorY = cursorY;
    showCustomCursor = true;
    cursorSpawned = true;
    cursorScale = 0.01;
    cursorGravityScale = 0; // reset gravity ramp
    animateCursorScale();
    cursorSpawnedOnce = true;
  }
}

function handleTouchMove(e: TouchEvent) {
  if (e.touches.length > 0) {
    const t = e.touches[0];
    mouse.x = t.clientX;
    mouse.y = t.clientY;
    cursorX = t.clientX;
    cursorY = t.clientY;
    if (!cursorSpawnedOnce) {
      lagCursorX = cursorX;
      lagCursorY = cursorY;
      showCustomCursor = true;
      cursorSpawned = true;
      cursorScale = 0.01;
      cursorGravityScale = 0; // reset gravity ramp
      animateCursorScale();
      cursorSpawnedOnce = true;
    }
  }
}

function handleBtnMouseMove(e: MouseEvent) {
  const target = e.target as HTMLButtonElement | null;
  if (!target) return;
  const rect = target.getBoundingClientRect();
  btnGlowX = ((e.clientX - rect.left) / rect.width) * 100;
  btnGlowY = ((e.clientY - rect.top) / rect.height) * 100;
  btnHover = true;
  if (btnGlowFadeTimer) {
    clearTimeout(btnGlowFadeTimer);
    btnGlowFadeTimer = null;
  }
}
function handleBtnMouseLeave() {
  btnHover = false;
}

async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/app`
    }
  });
  if (error) alert(error.message);
}

async function signInWithMagicLink() {
  const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${location.origin}/app` } });
  if (!error) {
    alert('Check your email for the login link!');
    email = '';
  } else {
    alert(error.message);
  }
}
</script>

<style>
body, html, #svelte {
  cursor: none !important;
}
.landing-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  background: #000;
}
.landing-glow-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}
.landing-content {
  position: relative;
  z-index: 3;
}
.custom-cursor {
  position: fixed;
  left: 0;
  top: 0;
  width: 32px;
  height: 32px;
  pointer-events: none;
  z-index: 10000;
  transform: translate(-50%, -50%) scale(0);
  border-radius: 50%;
  background: radial-gradient(circle, #fff 60%, rgba(255,255,255,0.5) 100%);
  box-shadow: 0 0 14px 4px #fff, 0 0 48px 18px rgba(255,255,255,0.18);
  opacity: 0.95;
  transition: background 0.15s, box-shadow 0.15s, transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}
.boxy-btn, .glow-btn {
  background: rgba(0,0,0,0.7);
  border: 2px solid rgba(255,255,255,0.18);
  color: #e0e0e0;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-weight: 600;
  font-size: 1rem;
  padding: 0.5rem 1.5rem;
  border-radius: 2px;
  transition: border 0.15s, background 0.15s, color 0.15s;
  box-shadow: none;
  position: relative;
  overflow: hidden;
  z-index: 1;
}
.glow-btn {
  border: 2px solid #343434; /* crisp dark inner border */
}
.glow-btn::before {
  display: none;
}
.glow-btn::after {
  content: '';
  position: absolute;
  left: -8px; top: -8px; right: -8px; bottom: -8px;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.5s;
  border-radius: 999px;
  z-index: 2;
  background: radial-gradient(
    circle at var(--glow-x, 50%) var(--glow-y, 50%),
    rgba(255,255,255,0.85) 0%,
    rgba(255,255,255,0.45) 30%,
    rgba(255,255,255,0.12) 60%,
    transparent 100%
  );
  filter: blur(3.5px);
}
.glow-btn[data-hover='true']::after {
  opacity: 1;
}
.boxy-btn:hover, .boxy-btn:focus {
  border: 2px solid #fff;
  color: #fff;
  background: rgba(30,30,30,0.9);
}
.login-modal-bg {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(255,255,255,0.18);
  backdrop-filter: blur(16px);
}
.login-modal {
  background: #111;
  border: 1.5px solid rgba(255,255,255,0.18);
  border-radius: 1.25rem;
  box-shadow: 0 4px 32px rgba(0,0,0,0.18);
  padding: 2.5rem 2rem 2rem 2rem;
  min-width: 320px;
  max-width: 95vw;
  width: 100%;
  color: #fff;
  position: relative;
  opacity: 1;
}
.login-close {
  position: absolute;
  top: 1.25rem;
  right: 1.25rem;
  background: none;
  border: none;
  color: #fff;
  font-size: 1.5rem;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.15s;
}
.login-close:hover {
  opacity: 1;
}
.cursor-aberration-canvas {
  position: fixed;
  left: 0; top: 0;
  width: 100vw; height: 100vh;
  pointer-events: none;
  z-index: 10001;
}
.glitch-text {
  position: relative;
  color: #fff;
  z-index: 1;
  cursor: pointer;
  transition: color 0.2s;
}
.glitch-text::before,
.glitch-text::after {
  content: attr(data-text);
  position: absolute;
  left: 0; top: 0;
  width: 100%; height: 100%;
  z-index: -1;
  opacity: 0.7;
  pointer-events: none;
  transition: transform 0.2s cubic-bezier(.25,.46,.45,.94);
}
.glitch-text::before {
  color: #00aaff;
  transform: translate(0, 0);
  mix-blend-mode: lighten;
}
.glitch-text::after {
  color: #ff003c;
  transform: translate(0, 0);
  mix-blend-mode: lighten;
}
.glitch-text:hover::before {
  transform: translate(-2px, -1px);
}
.glitch-text:hover::after {
  transform: translate(2px, 1px);
}
.aberration-heading {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  font-size: clamp(2.2rem, 5vw, 3.5rem);
  font-weight: bold;
  position: relative;
  z-index: 3;
  /* Remove drop-shadow glow */
  /* filter: drop-shadow(0 2px 16px #fff) drop-shadow(0 0px 32px #aaf); */
}
.aberration-char {
  position: relative;
  display: inline-block;
  color: #fff;
  transition: color 0.18s;
}
.aberration-char::before,
.aberration-char::after {
  content: attr(data-char);
  position: absolute;
  left: 0; top: 0;
  width: 100%; height: 100%;
  pointer-events: none;
  z-index: -1;
  opacity: var(--aberration-alpha, 0.5);
  transition: opacity 0.18s;
}
.aberration-char::before {
  color: #00aaff;
  transform: translateX(calc(-1 * var(--aberration, 0px)));
  mix-blend-mode: lighten;
}
.aberration-char::after {
  color: #ff003c;
  transform: translateX(var(--aberration, 0px));
  mix-blend-mode: lighten;
}
.aberration-char-wrapper { position: relative; display: inline-block; }
</style>

<div class="landing-bg">
  <canvas bind:this={canvasEl} width={width} height={height} style="display:block;width:100vw;height:100vh;"></canvas>
</div>
<div class="landing-glow-bg">
  <canvas bind:this={glowCanvasEl} width={width} height={height} style="display:block;width:100vw;height:100vh;"></canvas>
</div>
<canvas bind:this={cursorCanvasEl} class="cursor-aberration-canvas"></canvas>
<!-- Custom cursor -->
{#if showCustomCursor}
  <div class="custom-cursor" style="left: {lagCursorX}px; top: {lagCursorY}px; transform: translate(-50%, -50%) scale({cursorScale});"></div>
{/if}

<div class="landing-content min-h-screen flex flex-col items-center justify-center px-4">
  <div
    class="aberration-heading"
    bind:this={headingRef}
    on:mousemove={handleHeadingMouseMove}
    on:mouseleave={handleHeadingMouseLeave}
  >
    {#each headingText.split('') as char, i (i)}
      <span class="aberration-char-wrapper" style="position:relative;display:inline-block;">
        <span
          class="aberration-char"
          data-char={char === ' ' ? '\u00a0' : char}
          bind:this={headingSpanRefs[i]}
          style="--aberration:0px; --aberration-alpha:0;"
        >{char === ' ' ? '\u00a0' : char}</span>
      </span>
    {/each}
  </div>
  <button
    class="glow-btn mb-3"
    data-hover={btnHover}
    style="--glow-x: {btnGlowX}%; --glow-y: {btnGlowY}%"
    on:mousemove={handleBtnMouseMove}
    on:mouseleave={handleBtnMouseLeave}
    on:mouseenter={handleBtnMouseMove}
    on:click={() => goto('/app')}
  >
    Start learning
  </button>
</div>

{#if showLoginModal}
  <div class="login-modal-bg flex items-center justify-center">
    <div class="login-modal">
      <button class="login-close" aria-label="Close" on:click={() => showLoginModal = false}>×</button>
      <h1 class="text-3xl font-bold mb-6 text-center">Sign in to Alice</h1>
      <button class="px-6 py-3 bg-red-500 hover:bg-red-600 rounded-lg font-semibold w-full mb-4" on:click={signInWithGoogle}>
        Continue with Google
      </button>
      <div class="flex items-center gap-2 opacity-70 mb-4">
        <span class="border-t border-gray-600 w-20"></span>
        or
        <span class="border-t border-gray-600 w-20"></span>
      </div>
      <form class="flex flex-col gap-2 w-full max-w-sm mx-auto" on:submit|preventDefault={signInWithMagicLink}>
        <input
          type="email"
          placeholder="you@example.com"
          bind:value={email}
          class="px-4 py-2 rounded bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          required
        />
        <button type="submit" class="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded font-semibold">Send magic link</button>
      </form>
      <button class="mt-8 text-sm underline opacity-80 w-full" on:click={() => showLoginModal = false}>Back to landing</button>
    </div>
  </div>
{/if}

