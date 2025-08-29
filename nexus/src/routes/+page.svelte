<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { cubicOut, cubicIn, cubicInOut } from 'svelte/easing';
	import { fade, scale } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import { supabase } from '$lib/supabaseClient';

	let videoEl: HTMLVideoElement;
	let showOverlay = true;
	function handlePlay() {
		if (!videoEl) return;
		videoEl.controls = true;
		videoEl.play();
		showOverlay = false;
	}

	let canvasEl: HTMLCanvasElement; // dots
	let ctx: CanvasRenderingContext2D | null = null;

	let width = 0;
	let height = 0;
	let dpr = 1;

	const TARGET_DOTS = 900;
	// Added: b (current brightness), tTarget (target brightness), tNext (next change time)
	let dots: {
		x: number;
		y: number;
		ox: number;
		oy: number;
		vx: number;
		vy: number;
		baseB: number;
		b: number;
		tTarget: number;
		tNext: number;
	}[] = [];

	let dotRadius = 0.1;
	const minBrightness = 0.1;
	const maxBrightness = 0.1;
	const cursorDeceleration = 0.9;
	let maxDotDisplacement = 28;
	const springK = 0.07;

	// Twinkle controls (lower frequency + smoothing)
	const TWINKLE_MIN_MS = 900;
	const TWINKLE_MAX_MS = 2400;
	const BRIGHTNESS_LERP = 0.08; // smaller = smoother/slower

	// Anisotropic vignette (different widths per edge)
	const V_TOP_WIDTH = 150; // px
	const V_BOTTOM_WIDTH = 0; // px
	const V_SIDE_WIDTH = 50; // px for both left/right (set to 0 to disable side fade)
	const VIGNETTE_FLOOR = 0.15; // 0–1 brightness floor at the edge
	const VIGNETTE_EXP = 0.8; // >1 tightens rolloff

	function smoothstep(a: number, b: number, x: number) {
		const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
		return t * t * (3 - 2 * t);
	}
	let mouse = { x: -1000, y: -1000 };
	let cursorX = 0;
	let cursorY = 0;
	let lagCursorX = 0;
	let lagCursorY = 0;
	let showCustomCursor = false;
	let cursorScale = 0;
	let cursorSpawnedOnce = false;
	let cursorGravityScale = 0;

	const glowDotCount = 18;
	let glowDots: { x: number; y: number; r: number; color: string; a: number }[] = [];

	// UI
	let showLoginModal = false;
	let btnGlowX = 50;
	let btnGlowY = 50;
	let btnHover = false;
	let btnGlowFadeTimer: ReturnType<typeof setTimeout> | null = null;

	const headingText = 'Unleash Your Intellectual Potential';
	let headingRef: HTMLDivElement;
	let wordRefs: HTMLElement[] = [];
	let headingRect = { left: 0, width: 0 };

	function clamp(n: number, a: number, b: number) {
		return Math.max(a, Math.min(b, n));
	}

	function setupGrid() {
		width = window.innerWidth;
		height = window.innerHeight;

		// same grid logic as your previous version: solve cols/rows from TARGET_DOTS
		const aspect = width / Math.max(1, height);
		let cols = Math.max(1, Math.round(Math.sqrt(TARGET_DOTS * aspect)));
		let rows = Math.max(1, Math.ceil(TARGET_DOTS / cols));
		if (cols * rows < TARGET_DOTS) rows = Math.ceil(TARGET_DOTS / cols);

		const stepX = width / (cols + 1);
		const stepY = height / (rows + 1);

		// keep look: radius tied gently to spacing (but clamp to your old ~0.7 baseline)
		const spacing = Math.min(stepX, stepY);
		dotRadius = clamp(spacing * 0.035, 0.6, 1.2);
		maxDotDisplacement = spacing * 1.05;

		const nowMs = performance.now();

		if (dots.length < TARGET_DOTS) {
			const midB = (0.2 + maxBrightness) / 2;
			const jitter = (maxBrightness - minBrightness) * 0.1;
			for (let i = dots.length; i < TARGET_DOTS; i++) {
				const baseB = midB + (Math.random() - 0.5) * jitter;
				const interval = TWINKLE_MIN_MS + Math.random() * (TWINKLE_MAX_MS - TWINKLE_MIN_MS);
				dots.push({
					x: 0,
					y: 0,
					ox: 0,
					oy: 0,
					vx: 0,
					vy: 0,
					baseB,
					b: baseB,
					tTarget: baseB,
					tNext: nowMs + interval
				});
			}
		} else if (dots.length > TARGET_DOTS) {
			dots.length = TARGET_DOTS;
		}

		// place dots on grid
		for (let i = 0; i < TARGET_DOTS; i++) {
			const c = i % cols;
			const r = Math.floor(i / cols);
			if (r >= rows) break;
			const x = (c + 1) * stepX;
			const y = (r + 1) * stepY;

			const d = dots[i];
			d.x = d.ox = x;
			d.y = d.oy = y;
			d.vx = 0;
			d.vy = 0;
		}
	}

	function resizeAll() {
		const MAX_DPR = 1.75;
		dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1);

		width = window.innerWidth;
		height = window.innerHeight;

		if (canvasEl) {
			canvasEl.width = Math.max(1, Math.floor(width * dpr));
			canvasEl.height = Math.max(1, Math.floor(height * dpr));
			canvasEl.style.width = `${width}px`;
			canvasEl.style.height = `${height}px`;
			ctx?.setTransform(1, 0, 0, 1, 0, 0);
			ctx?.scale(dpr, dpr);
		}

		setupGrid();
	}

	let rafId = 0;
	function loop() {
		if (!ctx) return;

		const nowMs = performance.now();

		lagCursorX += (cursorX - lagCursorX) * 0.4;
		lagCursorY += (cursorY - lagCursorY) * 0.4;

		ctx.clearRect(0, 0, width, height);

		for (const dot of dots) {
			// spring back
			let springFx = (dot.ox - dot.x) * springK;
			let springFy = (dot.oy - dot.y) * springK;

			// same repel shape you had (exp falloff) gated by gravity ramp
			if (cursorSpawnedOnce) {
				const dx = dot.x - mouse.x;
				const dy = dot.y - mouse.y;
				const dist = Math.sqrt(dx * dx + dy * dy);
				const maxDist = 5000;
				if (dist < maxDist) {
					const repelStrength = 0.18 * Math.exp(-dist / (maxDist * 0.22));
					springFx += (dx / (dist + 1e-6)) * repelStrength * maxDist * cursorGravityScale;
					springFy += (dy / (dist + 1e-6)) * repelStrength * maxDist * cursorGravityScale;
				}
			}

			// integrate (same damping feel)
			dot.vx = (dot.vx + springFx) * cursorDeceleration;
			dot.vy = (dot.vy + springFy) * cursorDeceleration;
			dot.x += dot.vx;
			dot.y += dot.vy;

			// clamp displacement (same)
			{
				const odx = dot.x - dot.ox;
				const ody = dot.y - dot.oy;
				const odist = Math.sqrt(odx * odx + ody * ody);
				if (odist > maxDotDisplacement) {
					const a = Math.atan2(ody, odx);
					dot.x = dot.ox + Math.cos(a) * maxDotDisplacement;
					dot.y = dot.oy + Math.sin(a) * maxDotDisplacement;
				}
			}

			// --- Less frequent twinkle with smoothing ---
			if (nowMs >= dot.tNext) {
				const interval = TWINKLE_MIN_MS + Math.random() * (TWINKLE_MAX_MS - TWINKLE_MIN_MS);
				dot.tNext = nowMs + interval;
				// same amplitude as before (±0.06 around baseB)
				dot.tTarget = dot.baseB + (Math.random() - 0.5) * 0.12;
			}
			// smooth toward target
			dot.b += (dot.tTarget - dot.b) * BRIGHTNESS_LERP;

			// brightness + twinkle (same pattern)
			let brightness = dot.baseB + (Math.random() - 0.5) * 0.12;
			if (cursorSpawnedOnce) {
				const dx = dot.x - mouse.x;
				const dy = dot.y - mouse.y;
				const dist = Math.sqrt(dx * dx + dy * dy);
				const maxDist = Math.max(width, height);
				if (dist < maxDist) {
					brightness += (maxBrightness - dot.baseB) * (1 - dist / maxDist);
				}
			}
			// --- anisotropic edge fade (top/bottom different) ---
			const distTop = dot.y; // distance to top edge
			const distBottom = height - dot.y; // distance to bottom edge
			const distLeft = dot.x;
			const distRight = width - dot.x;

			const topT = V_TOP_WIDTH > 0 ? smoothstep(0, V_TOP_WIDTH, distTop) : 1;
			const bottomT = V_BOTTOM_WIDTH > 0 ? smoothstep(0, V_BOTTOM_WIDTH, distBottom) : 1;
			const leftT = V_SIDE_WIDTH > 0 ? smoothstep(0, V_SIDE_WIDTH, distLeft) : 1;
			const rightT = V_SIDE_WIDTH > 0 ? smoothstep(0, V_SIDE_WIDTH, distRight) : 1;

			// use the minimum so any single edge can dim; avoids double-multiplying corners
			let edgeT = Math.min(topT, bottomT, leftT, rightT);
			edgeT = Math.pow(edgeT, VIGNETTE_EXP);

			const vignette = VIGNETTE_FLOOR + (1 - VIGNETTE_FLOOR) * edgeT;
			brightness *= vignette;
			const b = clamp(brightness, 0, 1);

			ctx.beginPath();
			ctx.arc(dot.x, dot.y, dotRadius, 0, Math.PI * 2);
			// subtle halo like before
			ctx.shadowColor = `rgba(255,255,255,${b * 0.7})`;
			ctx.shadowBlur = 2;
			ctx.fillStyle = `rgba(255,255,255,${b})`;
			ctx.fill();
			ctx.shadowBlur = 0;
		}

		rafId = requestAnimationFrame(loop);
	}

	function animateCursorScale() {
		if (cursorScale < 1) {
			cursorScale += (1 - cursorScale) * 0.22 + 0.01;
			if (cursorScale > 0.995) cursorScale = 1;
			requestAnimationFrame(animateCursorScale);
		}
	}
	function rampUpGravity() {
		const start = performance.now();
		function frame(now: number) {
			const t = Math.min((now - start) / 3000, 1);
			cursorGravityScale = cubicInOut(t);
			if (t < 1) requestAnimationFrame(frame);
		}
		requestAnimationFrame(frame);
	}

	function handleMouseMove(e: MouseEvent) {
		mouse.x = e.clientX;
		mouse.y = e.clientY;
		cursorX = e.clientX;
		cursorY = e.clientY;
		if (!cursorSpawnedOnce) {
			lagCursorX = cursorX;
			lagCursorY = cursorY;
			cursorScale = 0.01;
			showCustomCursor = true;
			animateCursorScale();
			rampUpGravity();
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
				cursorScale = 0.01;
				showCustomCursor = true;
				animateCursorScale();
				rampUpGravity();
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

	function updateHeadingRect() {
		const el = document.querySelector('.heading-words');
		if (!el) return;
		const r = el.getBoundingClientRect();
		headingRect = { left: r.left, width: r.width };
	}
	function handleHeadingMouseMove(e: MouseEvent) {
		const { left, width } = headingRef.getBoundingClientRect();
		const xNorm = (e.clientX - (left + width / 2)) / (width / 2);
		const maxAngle = 4;
		headingRef.style.setProperty('--y-tilt', `${-xNorm * maxAngle}deg`);
	}
	function resetHeadingTilt() {
		headingRef.style.setProperty('--y-tilt', `0deg`);
	}

	async function signInWithGoogle() {
		const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
		if (error) alert(error.message);
	}

	onMount(() => {
		(async () => {
			const {
				data: { session }
			} = await supabase.auth.getSession();
			if (session) goto('/app');

			ctx = canvasEl.getContext('2d', { alpha: false });

			resizeAll();
			rafId = requestAnimationFrame(loop);

			await tick();
			wordRefs = Array.from(headingRef.querySelectorAll('.heading-word'));
			updateHeadingRect();

			window.addEventListener('resize', resizeAll);
			window.addEventListener('resize', updateHeadingRect);
			window.addEventListener('mousemove', handleMouseMove);
			window.addEventListener('touchmove', handleTouchMove, { passive: false });
		})();

		return () => {
			cancelAnimationFrame(rafId);
			window.removeEventListener('resize', resizeAll);
			window.removeEventListener('resize', updateHeadingRect);
			window.removeEventListener('mousemove', handleMouseMove);
			window.removeEventListener('touchmove', handleTouchMove);
		};
	});
</script>

<div class="landing-bg">
	<canvas bind:this={canvasEl}></canvas>
</div>

{#if showCustomCursor}
	<div
		class="custom-cursor"
		style="left: {lagCursorX}px; top: {lagCursorY}px; transform: translate(-50%, -50%) scale({cursorScale});"
	></div>
{/if}

<div
	class="sticky top-0 left-0 z-50 grid w-full grid-cols-[1fr_2fr_1fr] items-center bg-black/70 p-4 px-24 backdrop-blur-sm"
>
	<a href="/" class="text-white">Alice</a>
	<div class="flex items-center justify-center gap-x-4">
		<a
			href="#how-it-works"
			class="rounded-md px-2 py-1 text-[12px] text-neutral-400 transition hover:bg-neutral-800"
			>How It Works</a
		>
		<a
			href="#mission"
			class="rounded-md px-2 py-1 text-[12px] text-neutral-400 transition hover:bg-neutral-800"
			>Our Mission</a
		>
		<a
			href="/updates"
			class="rounded-md px-2 py-1 text-[12px] text-neutral-400 transition hover:bg-neutral-800"
			>Updates</a
		>
		<a
			href="/contact"
			class="rounded-md px-2 py-1 text-[12px] text-neutral-400 transition hover:bg-neutral-800"
			>Contact Us</a
		>
	</div>
	<div class="flex items-center justify-end gap-x-2">
		<button
			on:click={() => (showLoginModal = true)}
			class="rounded-md px-2 py-1 font-medium transition hover:bg-neutral-800"
		>
			<div class="text-[12px] text-neutral-400">Log in</div>
		</button>
		<button
			on:click={() => (showLoginModal = true)}
			class="rounded-md bg-neutral-200 px-2 py-1 text-[12px] text-black transition hover:bg-white"
		>
			Sign up
		</button>
	</div>
</div>

<!-- Content -->
<div class="landing-content flex min-h-screen flex-col items-center pt-52">
	<section class="mb-20 flex flex-col items-center">
		<div
			class="heading-wrapper"
			bind:this={headingRef}
			on:mousemove={handleHeadingMouseMove}
			on:mouseleave={resetHeadingTilt}
		>
			<div class="heading-words">
				{#each headingText.split(' ') as word}
					<span class="heading-word">{word}</span>
				{/each}
			</div>
		</div>
		<div class="text-lg text-neutral-400">
			You follow your interests, Alice will take care of the rest.
		</div>
		<button
			class="magnet relative mt-12 inline-flex overflow-hidden rounded-full p-px"
			on:mousemove={handleBtnMouseMove}
			on:mouseleave={handleBtnMouseLeave}
			on:mouseenter={handleBtnMouseMove}
			on:click={() => {
				showLoginModal = true;
			}}
		>
			<span
				class="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#c2c2c2_0%,#505050_50%,#bebebe_100%)]"
			/>
			<span
				class="glow-btn inline-flex h-full w-full cursor-pointer items-center justify-center rounded-[11px] bg-neutral-950 px-4 py-2 text-sm font-medium text-neutral-200 backdrop-blur-3xl"
				data-hover={btnHover}
				style="--glow-x: {btnGlowX}%; --glow-y: {btnGlowY}%">Start Learning</span
			>
		</button>
	</section>

	<section
		id="how-it-works"
		class="mx-auto grid max-w-screen-2xl gap-8 px-6 py-20 sm:px-10 lg:px-16"
	>
		<div
			class="relative mx-auto aspect-video w-full max-w-screen-xl overflow-hidden rounded-lg border border-white/10"
		>
			<video
				bind:this={videoEl}
				class="absolute inset-0 h-full w-full object-cover"
				src="/demo.mp4"
				preload="none"
				playsinline
			/>
			{#if showOverlay}
				<button class="overlay-btn" on:click={handlePlay} aria-label="Play demo video">
					<video
						src="/demo-thumb.mp4"
						autoplay
						loop
						muted
						playsinline
						class="absolute inset-0 z-10 h-full w-full object-cover"
					/>
					<div class="play-puck z-20">
						<svg viewBox="0 0 24 24" class="h-10 w-10 text-white"
							><path fill="currentColor" d="M8 5v14l11-7z" /></svg
						>
					</div>
				</button>
			{/if}
		</div>

		<div class="mb-12 flex h-128 w-full max-w-5xl flex-col rounded-lg p-4 text-neutral-200">
			<div class="text-5xl font-medium text-neutral-200">Curiosity-Based Learning</div>
			<div class="mb-8 text-lg text-neutral-400">
				Alice is a curiosity-based education platform that adapts to your evolving interests and
				skill as you explore and provides the best material at each step to keep you engaged.
			</div>
			<div class="text-3xl text-neutral-200">Skill Brackets</div>
			<div class="ml-8 text-2xl text-[#9CA3AF]">Beginner: 5 Mastery 1 Nodes to rank up</div>
			<div class="ml-8 text-2xl text-[#E0AF67]">Intermediate: 5 Mastery 2 Nodes to rank up</div>
			<div class="ml-8 text-2xl text-[#BA9AF7]">Advanced: 5 Mastery 3 Nodes to rank up</div>
			<div class="ml-8 text-2xl text-[#F7768E]">Expert: Current highest rank</div>
			<div class="ml-8 self-center text-2xl text-neutral-200">
				Challenge your Mastery, Earn EXP, and Rank Up.
			</div>
		</div>
	</section>

	<section id="mission" class="mx-auto w-full max-w-screen-xl px-6 py-20 sm:px-10 lg:px-16">
		<div
			class="mx-auto mb-12 flex h-128 w-full max-w-5xl items-center justify-center rounded-lg text-neutral-200"
		>
			🚧 Mission Coming Soon 🚧
		</div>
	</section>

	<section id="footer" class="container mx-auto grid gap-12 px-6 py-20"></section>
</div>

{#if showLoginModal}
	<div class="fixed inset-0 z-[999] flex items-center justify-center p-4">
		<div
			class="absolute inset-0 bg-black/60"
			on:click={() => {
				showLoginModal = false;
			}}
			in:fade={{ duration: 180, easing: cubicOut }}
			out:fade={{ duration: 140, easing: cubicIn }}
		/>
		<div
			class="relative z-10 flex max-h-[80vh] w-full max-w-lg flex-col justify-center overflow-auto rounded-md border border-white/10 bg-black p-6"
			in:scale={{ duration: 200, easing: cubicOut, start: 0.9 }}
			out:scale={{ duration: 140, easing: cubicIn, start: 0.9 }}
		>
			<h1 class="mb-6 self-start text-center text-xl font-semibold text-neutral-200">
				Login to your account
			</h1>
			<button
				class="mb-4 rounded-full bg-neutral-200 px-4 py-2 font-semibold text-black"
				on:click={signInWithGoogle}
			>
				Continue with Google
			</button>
		</div>
	</div>
{/if}

<style>
	/* canvases */
	.landing-bg {
		position: fixed;
		inset: 0;
		z-index: 0;
	}
	.landing-bg canvas {
		display: block;
		width: 100vw;
		height: 100vh;
	}
	.landing-content {
		position: relative;
		z-index: 3;
	}
	.landing-bg {
		background: #000;
	}

	.custom-cursor {
		position: fixed;
		left: 0;
		top: 0;
		width: 16px;
		height: 16px;
		pointer-events: none;
		z-index: 10000;
		transform: translate(-50%, -50%) scale(0);
		border-radius: 50%;
		background: radial-gradient(circle, #fff 60%, rgba(255, 255, 255, 0.5) 100%);
		box-shadow:
			0 0 14px 4px #fff,
			0 0 48px 18px rgba(255, 255, 255, 0.18);
		opacity: 0.95;
		transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
	}

	/* nav + heading */
	.magnet {
		transform: scale(1);
		transition: transform 3s cubic-bezier(0.22, 1, 0.36, 1);
	}
	.magnet:hover {
		transform: scale(1.05);
	}
	.heading-wrapper {
		perspective: 800px;
		position: relative;
		z-index: 10;
	}
	.heading-words {
		display: inline-flex;
		flex-wrap: wrap;
		gap: 0.5ch;
		transform-style: preserve-3d;
		transform: rotateY(var(--y-tilt, 0deg));
		transition: transform 3s cubic-bezier(0.22, 1, 0.36, 1);
	}
	.heading-word {
		font-size: clamp(2.2rem, 5vw, 3.5rem);
		font-weight: bold;
		color: white;
	}

	/* button glow */
	.glow-btn {
		text-transform: uppercase;
		letter-spacing: 0.12em;
		font-weight: 500;
		font-size: 0.9rem;
		padding: 0.5rem 1.5rem;
		border-radius: 200px;
		transition:
			border 0.15s,
			background 0.15s,
			color 0.15s;
		box-shadow: none;
		position: relative;
		overflow: hidden;
		z-index: 1;
	}
	.glow-btn::after {
		content: '';
		position: absolute;
		left: -8px;
		top: -8px;
		right: -8px;
		bottom: -8px;
		pointer-events: none;
		opacity: 0;
		transition: opacity 0.5s;
		border-radius: 999px;
		z-index: 2;
		background: radial-gradient(
			circle at var(--glow-x, 50%) var(--glow-y, 50%),
			rgba(255, 255, 255, 0.85) 0%,
			rgba(255, 255, 255, 0.45) 30%,
			rgba(255, 255, 255, 0.12) 60%,
			transparent 100%
		);
		filter: blur(3.5px);
	}
	.glow-btn[data-hover='true']::after {
		opacity: 1;
	}

	/* video overlay */
	.overlay-btn {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		border: 0;
		background: transparent;
		padding: 0;
		cursor: pointer;
	}
	.overlay-btn:focus-visible {
		outline: 2px solid rgba(255, 255, 255, 0.5);
		outline-offset: 4px;
	}
	.play-puck {
		display: grid;
		place-items: center;
		border-radius: 9999px;
		padding: 12px;
		background: rgba(0, 0, 0, 0.5);
		border: 1px solid rgba(255, 255, 255, 0.2);
		backdrop-filter: blur(6px);
		transition: transform 120ms ease-out;
	}
	.overlay-btn:hover .play-puck {
		transform: scale(1.05);
	}

	* {
		user-select: none;
	}
	::selection {
		background: transparent;
	}
</style>
