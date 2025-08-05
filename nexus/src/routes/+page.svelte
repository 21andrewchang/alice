<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { cubicOut, cubicIn } from 'svelte/easing';
	import { scale, fade } from 'svelte/transition';
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
	let cursorGravityScale = 0;

	const dotSpacing = 24; // was 24, fewer dots, more spread out
	const dotRadius = 0.7; // was 1.0, smaller dots
	const minBrightness = 0.1; // was 0.18, brighter dots
	const maxBrightness = 0.5; // was 0.38, brighter dots
	const cursorDeceleration = 0.9; // was 0.82, higher = more floaty
	const maxDotDisplacement = 28;
	const springK = 0.07; // was 0.12, lower = softer spring

	// Glow dots background
	let glowCanvasEl: HTMLCanvasElement;
	let glowCtx: CanvasRenderingContext2D | null = null;
	const glowDotCount = 18;
	let glowDots: { x: number; y: number; r: number; color: string; a: number }[] = [];

	let showLoginModal = false;
	let email = '';

	// For button glow
	let btnGlowX = 50;
	let btnGlowY = 50;
	let btnHover = false;
	let btnGlowFadeTimer: ReturnType<typeof setTimeout> | null = null;

	// Each dot gets a random base brightness
	let dots: {
		x: number;
		y: number;
		ox: number;
		oy: number;
		vx: number;
		vy: number;
		baseB: number;
	}[] = [];

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
		if (now - lastAberrationUpdate < 32) {
			// ~30fps
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
			const split = proximity > 0.01 ? 0.5 + proximity * 2 + vibrate * proximity * 1.2 : 0;
			const alpha = proximity > 0.01 ? 0.5 * proximity + 0.5 * proximity : 0;
			span.style.setProperty('--aberration', `${split}px`);
			span.style.setProperty('--aberration-alpha', `${alpha}`);
			// Update green layer (vertical split)
			const greenSpan = span.parentElement?.querySelector(
				'.aberration-green'
			) as HTMLElement | null;
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
			grad.addColorStop(
				0,
				dot.color.replace('0.12', dot.a.toFixed(2)).replace('0.10', dot.a.toFixed(2))
			);
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
	const cursorLag = 0.4; // 0.1-0.2 is a good range

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
				const dist = Math.sqrt(dx * dx + dy * dy);
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
			const odist = Math.sqrt(odx * odx + ody * ody);
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
				const dist = Math.sqrt(dx * dx + dy * dy);
				const maxDist = Math.max(width, height);
				if (dist < maxDist) {
					brightness += (maxBrightness - dot.baseB) * (1 - dist / maxDist);
				}
			}
			const b = Math.min(1, Math.max(0, brightness));
			ctx.beginPath();
			ctx.arc(dot.x, dot.y, dotRadius, 0, Math.PI * 2);
			ctx.fillStyle = `rgba(255,255,255,${b})`;
			ctx.shadowColor = `rgba(255,255,255,${b * 0.7})`;
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
			const {
				data: { session }
			} = await supabase.auth.getSession();
			if (session) {
				goto('/app');
			}
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
			//animateHeadingAberration();
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
		const circleRadius = 8 * cursorScale;

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
			provider: 'google'
		});
		if (error) alert(error.message);
	}

	async function signInWithMagicLink() {
		const { error } = await supabase.auth.signInWithOtp({
			email,
			options: { emailRedirectTo: `${location.origin}/app` }
		});
		if (!error) {
			alert('Check your email for the login link!');
			email = '';
		} else {
			alert(error.message);
		}
	}
</script>

<div class="landing-bg">
	<canvas bind:this={canvasEl} {width} {height} style="display:block;width:100vw;height:100vh;"
	></canvas>
</div>
<div class="landing-glow-bg">
	<canvas bind:this={glowCanvasEl} {width} {height} style="display:block;width:100vw;height:100vh;"
	></canvas>
</div>
<canvas bind:this={cursorCanvasEl} class="cursor-aberration-canvas"></canvas>
<!-- Custom cursor -->
{#if showCustomCursor}
	<div
		class="custom-cursor"
		style="left: {lagCursorX}px; top: {lagCursorY}px; transform: translate(-50%, -50%) scale({cursorScale});"
	></div>
{/if}
<div
	class="absolute top-0 left-0 z-50 grid w-full grid-cols-3 items-center bg-black/10
         p-4 px-24 backdrop-blur-sm"
>
	<div class="text-white">Alice</div>

	<div class="flex items-center justify-center gap-x-4">
		<a class="text-xs text-neutral-400">How It Works</a>
		<a class="text-xs text-neutral-400">Our Mission</a>
	</div>

	<div class="flex items-center justify-end gap-x-4">
		<a class="text-xs text-neutral-400">Log in</a>
		<div class="rounded-md bg-neutral-200 px-2 py-1 text-[10px] font-medium text-black">
			Sign up
		</div>
	</div>
</div>

<div class="landing-content flex min-h-screen flex-col items-center justify-center px-4">
	<div class="heading-words mt-12">
		{#each headingText.split(' ') as word, i}
			<span class="text-neutral-200">
				{word}
			</span>
		{/each}
	</div>
	<div class="text-lg text-neutral-400">
		You follow your interests, Alice will take care of the rest.
	</div>
	<button
		class="glow-btn mt-12"
		data-hover={btnHover}
		style="--glow-x: {btnGlowX}%; --glow-y: {btnGlowY}%"
		on:mousemove={handleBtnMouseMove}
		on:mouseleave={handleBtnMouseLeave}
		on:mouseenter={handleBtnMouseMove}
		on:click={() => {
			showLoginModal = true;
		}}
	>
		Start learning
	</button>
</div>

{#if showLoginModal}
	<div class="fixed inset-0 z-[999] flex items-center justify-center p-4">
		<div
			class="absolute inset-0 bg-black/60"
			in:fade={{ duration: 180, easing: cubicOut }}
			out:fade={{ duration: 140, easing: cubicIn }}
		/>

		<div
			class="relative z-10 flex max-h-[80vh] w-full max-w-lg flex-col justify-center overflow-auto rounded-md border-[2px] border-white/10 bg-black/70 p-6 backdrop-blur-2xl"
			style="-webkit-backdrop-filter: blur(24px);"
			transition:scale={{ start: 0.9, duration: 200, easing: cubicOut }}
		>
			<h1 class="mb-6 self-start text-center text-xl font-semibold text-neutral-50">
				Login to your account
			</h1>
			<button
				class=" mb-4 rounded-lg bg-[#E5E5E5] px-4 py-2 font-semibold text-black"
				on:click={signInWithGoogle}
			>
				Continue with Google
			</button>
		</div>
	</div>
{/if}

<style>
	.heading-words {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		font-size: clamp(2.2rem, 5vw, 3.5rem);
		font-weight: bold;
		gap: 0.5ch;
		/* ensure it sits above your canvases: */
		position: relative;
		z-index: 3;
	}

	.heading-word {
		display: inline-block;
		opacity: 0;
		filter: blur(8px);
		/* optional right-margin if you don’t use &nbsp; */
		/* margin-right: 0.25ch; */
	}

	@keyframes wordFadeIn {
		from {
			opacity: 0;
			filter: blur(8px);
		}
		to {
			opacity: 1;
			filter: blur(0);
		}
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
		transition:
			background 0.15s,
			box-shadow 0.15s,
			transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
	}
	.boxy-btn,
	.glow-btn {
		background: rgba(0, 0, 0, 0.7);
		border: 2px solid rgba(255, 255, 255, 0.2);
		color: #e0e0e0;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		font-weight: 600;
		font-size: 1rem;
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
	.glow-btn:hover,
	.glow-btn:focus {
		border: 2px solid rgba(255, 255, 255, 0.7);
	}

	.glow-btn::before {
		display: none;
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
	.cursor-aberration-canvas {
		position: fixed;
		left: 0;
		top: 0;
		width: 100vw;
		height: 100vh;
		pointer-events: none;
		z-index: 10001;
	}
	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	/* apply it to your grid + glow canvases */
	.landing-bg canvas,
	.landing-glow-bg canvas {
		opacity: 0; /* start hidden */
		animation: fadeIn 1s ease-out 0.2s 1 forwards;
		/*           ↑   ↑         ↑  ↑
                 │   │         └─ run once, keep final state
                 │   └─ 0.5s delay before starting
                 └─ 1s duration */
	}
	* {
		-webkit-user-select: none; /* Safari */
		-moz-user-select: none; /* Firefox */
		-ms-user-select: none; /* IE10+ */
		user-select: none; /* standard */
	}

	/* make any accidental selection invisible */
	::selection {
		background: transparent;
	}
</style>
