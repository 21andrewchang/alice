<script lang="ts">
import { onMount, onDestroy } from 'svelte';
import { goto } from '$app/navigation';
import { supabase } from '$lib/supabaseClient';

let canvasEl: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D | null = null;
let animationId: number;

const dotSpacing = 24;
const dotRadius = 1.5;
let dots: {x: number, y: number, ox: number, oy: number, vx: number, vy: number}[] = [];
let width = 0;
let height = 0;
let mouse = { x: -1000, y: -1000 };
let cursorX = 0;
let cursorY = 0;
let showCustomCursor = false;
let cursorTimer: ReturnType<typeof setTimeout>;
const gravityRadius = 40;
const gravityStrength = 30;
const maxDotDisplacement = 32;
const springK = 0.12;
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

function setupGrid() {
  width = window.innerWidth;
  height = window.innerHeight;
  dots = [];
  for (let y = 0; y <= height; y += dotSpacing) {
    for (let x = 0; x <= width; x += dotSpacing) {
      dots.push({ x, y, ox: x, oy: y, vx: 0, vy: 0 });
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
    const color = Math.random() > 0.5 ? 'rgba(191,202,243,0.12)' : 'rgba(255,255,255,0.10)';
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

function animate() {
  if (!ctx) return;
  ctx.clearRect(0, 0, width, height);
  for (const dot of dots) {
    // Spring force toward original position
    const springFx = (dot.ox - dot.x) * springK;
    const springFy = (dot.oy - dot.y) * springK;
    dot.vx += springFx;
    dot.vy += springFy;

    // Damping
    dot.vx *= damping;
    dot.vy *= damping;

    // Calculate distance to mouse
    const dx = dot.x - mouse.x;
    const dy = dot.y - mouse.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist < gravityRadius) {
      // Push dot away from mouse
      const angle = Math.atan2(dy, dx);
      const force = (gravityRadius - dist) / gravityRadius * gravityStrength;
      dot.vx += Math.cos(angle) * force;
      dot.vy += Math.sin(angle) * force;
    }

    // Update position
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
      dot.vx = 0;
      dot.vy = 0;
    }

    // All dots: same color and subtle shadow
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, dotRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#222';
    ctx.shadowColor = '#222';
    ctx.shadowBlur = 2;
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  animationId = requestAnimationFrame(animate);
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
  ctx = canvasEl.getContext('2d');
  glowCtx = glowCanvasEl.getContext('2d');
  handleResize();
  animate();
  window.addEventListener('resize', handleResize);
  window.addEventListener('mousemove', handleMouseMove);
  // Delay cursor spawn by 2 seconds
  cursorTimer = setTimeout(() => {
    showCustomCursor = true;
  }, 2000);
  return () => {
    window.removeEventListener('resize', handleResize);
    window.removeEventListener('mousemove', handleMouseMove);
    window.cancelAnimationFrame(animationId);
    clearTimeout(cursorTimer);
  };
});

function handleMouseMove(e: MouseEvent) {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
  cursorX = e.clientX;
  cursorY = e.clientY;
  if (!showCustomCursor) {
    showCustomCursor = true;
    clearTimeout(cursorTimer);
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
  z-index: 1;
}
.custom-cursor {
  position: fixed;
  left: 0;
  top: 0;
  width: 32px;
  height: 32px;
  pointer-events: none;
  z-index: 10000;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: radial-gradient(circle, #BFCAF3 60%, rgba(191,202,243,0.5) 100%);
  box-shadow: 0 0 24px 8px #BFCAF3, 0 0 64px 16px rgba(191,202,243,0.25);
  opacity: 0.95;
  transition: background 0.15s, box-shadow 0.15s;
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
    rgba(191,202,243,0.85) 0%,
    rgba(191,202,243,0.45) 30%,
    rgba(191,202,243,0.12) 60%,
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
</style>

<div class="landing-bg">
  <canvas bind:this={canvasEl} width={width} height={height} style="display:block;width:100vw;height:100vh;"></canvas>
</div>
<div class="landing-glow-bg">
  <canvas bind:this={glowCanvasEl} width={width} height={height} style="display:block;width:100vw;height:100vh;"></canvas>
</div>

<!-- Custom cursor -->
{#if showCustomCursor}
  <div class="custom-cursor" style="left: {cursorX}px; top: {cursorY}px;"></div>
{/if}

<div class="landing-content min-h-screen flex flex-col items-center justify-center px-4">
  <h1 class="text-4xl md:text-6xl font-bold mb-6 text-center" style="color: #fff">Alice — Level-up your ML & Robotics skills</h1>
  <p class="text-lg mb-8 max-w-2xl text-center opacity-80" style="color: #fff">
    Learn from curated research papers and bite-size lessons. No planning, just play.
  </p>
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
  <button
    class="boxy-btn"
    on:click={() => showLoginModal = true}
  >
    Log in
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
