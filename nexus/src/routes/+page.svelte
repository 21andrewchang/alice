<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { cubicOut, cubicIn } from 'svelte/easing';
	import { fade, scale, blur } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import { supabase } from '$lib/supabaseClient';
	import * as d3 from 'd3';

	// ---- Mobile mode detection ----
	let vw = 0,
		vh = 0;
	let isMobileMode = false;
	let graphDrawn = false;

	function updateViewport() {
		vw = window.innerWidth;
		vh = window.innerHeight;
		const aspect = vw / Math.max(vh, 1);

		// Tweak thresholds to taste
		const smallScreen = vw < 900 || vh < 600;
		const narrowAspect = aspect < 1.2; // “tall” (phones/portrait)
		isMobileMode = smallScreen || narrowAspect;

		// keep hero/map closed on mobile
		if (isMobileMode) showMap = false;

		// Render/tear down graph depending on mode
		renderGraphIfNeeded();
	}

	function renderGraphIfNeeded() {
		if (!mergedGraphLoaded || !landingBgEl) return;

		// Tear down if drawn but now mobile
		if (isMobileMode && graphDrawn) {
			Array.from(landingBgEl.querySelectorAll('svg')).forEach((n) => n.remove());
			graphDrawn = false;
			return;
		}

		// Draw if desktop and not yet drawn
		if (!isMobileMode && !graphDrawn) {
			Array.from(landingBgEl.querySelectorAll('svg')).forEach((n) => n.remove());
			const svg = chart(mergedGraph);
			if (svg) {
				landingBgEl.appendChild(svg);
				graphDrawn = true;
				// preserve revealed state after draw
				if (showMap && revealGraph) revealGraph(true);
			}
		}
	}
	// ---------- Background: GRAPH from JSON ----------
	let landingBgEl: HTMLDivElement; // container for bg SVG
	let mergedGraph: { nodes: any[]; links: any[] } = { nodes: [], links: [] };
	let mergedGraphLoaded = false;
	let showMap = false;

	async function loadGraphFromJson(path = '/glicko.json') {
		const res = await fetch(path);
		if (!res.ok) return;
		const raw = await res.json();
		mergedGraph = {
			nodes: (raw.nodes || []).map((n: any) => ({
				...n,
				type: n.type ?? 'concept',
				domain: n.domain ?? 'tech',
				difficulty: n.difficulty ?? 0
			})),
			links: (raw.links || []).map((l: any) => ({
				...l,
				relation: l.relation ?? 'prerequisite',
				value: l.value ?? 1
			}))
		};
		mergedGraphLoaded = true;
	}

	const domainColors: Record<string, string> = {
		ai: '#FF6B9D',
		math: '#5B8DF2',
		tech: '#73DACA',
		hardware: '#FFD93D',
		physics: '#BA6FFF',
		biology: '#6BCF8F',
		chemistry: '#FF8C42',
		topic: '#FFFFFF',
		default: '#666'
	};

	// Reveal control for the background graph
	let revealGraph: ((visible: boolean) => void) | null = null;

	const FADE_IN_MS = 3000; // 3s fade
	let initialFadeDone = false; // don't re-run on redraw
	const GRAPH_OPACITY = {
		dim: { nodes: 0.2, links: 0.5 },
		full: { nodes: 1.0, links: 0.7 }
	};
	// Darken a hex color (0..1). 1 = original, 0.35 = much darker.
	const NODE_BRIGHTNESS = { dim: 0.2, full: 1.0 };
	function shadeHex(hex: string, f: number) {
		const h = (hex || '#AAAAAA').replace('#', '');
		const r = Math.round(parseInt(h.slice(0, 2), 16) * f);
		const g = Math.round(parseInt(h.slice(2, 4), 16) * f);
		const b = Math.round(parseInt(h.slice(4, 6), 16) * f);
		return (
			'#' +
			[r, g, b].map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('')
		);
	}
	const ZOOM = { start: 2.0, focus: 1.0 }; // adjust focus if you want subtler zoom (e.g., 1.06)
	const REVEAL_MS = 1200; // match your zoom duration
	const DEFAULT_PARALLAX = 0.2; // your original factor
	let PARALLAX = DEFAULT_PARALLAX; // live factor we can disable
	let scrollOffsetY = 0; // track current translateY
	function chart(data: { nodes: any[]; links: any[] }) {
		const W = window.innerWidth;
		const H = window.innerHeight;

		// Domain anchors for soft clustering
		const anchors: Record<string, [number, number]> = {
			physics: [-W / 3.2, H / 6],
			hardware: [-W / 4.2, -H / 8],
			math: [-W / 5.2, H / 7],
			ai: [W / 4.0, -H / 10],
			tech: [W / 6.0, 0],
			biology: [W / 5.0, H / 6],
			chemistry: [W / 5.0, -H / 6],
			topic: [0, 0],
			default: [0, 0]
		};
		const anchorX = (d: any) => anchors[d.domain]?.[0] ?? anchors.default[0];
		const anchorY = (d: any) => anchors[d.domain]?.[1] ?? anchors.default[1];

		const nodes = data.nodes.map((d) => ({ ...d }));
		const links = data.links.map((d) => ({ ...d }));

		// --- simulation ---
		let interactivityEnabled = true;

		const fx = d3
			.forceX((d: any) => anchorX(d))
			.strength(() => (interactivityEnabled ? 0.06 : 0.18));
		const fy = d3
			.forceY((d: any) => anchorY(d))
			.strength(() => (interactivityEnabled ? 0.05 : 0.16));

		const sim = d3
			.forceSimulation(nodes as any)
			.force(
				'link',
				d3
					.forceLink(links as any)
					.id((d: any) => d.id)
					.distance(90)
					.strength(0.85)
			)
			.force('charge', d3.forceManyBody().strength(-120))
			.force('center', d3.forceCenter(0, 0))
			.force('x', fx)
			.force('y', fy)
			.force(
				'collide',
				d3.forceCollide().radius((d: any) => (d.type === 'paper' ? 10 : 6))
			)
			.velocityDecay(0.35);

		const svg = d3
			.create('svg')
			.attr('width', '100%')
			.attr('height', '100%')
			.attr('viewBox', [-W / 2, -H / 2, W, H].join(' '))
			.attr('preserveAspectRatio', 'xMidYMid meet')
			.style('position', 'absolute')
			.style('inset', '0')
			.style('pointer-events', 'none'); // background-only

		// Wrap graph with a scroll layer so we can translate Y independently of zoom
		const gScroll = svg
			.append('g')
			.attr('class', 'scroll-layer')
			.attr('transform', 'translate(0,0)');

		// Zoom (scale) is applied on the inner graph layer
		const g = gScroll.append('g').attr('class', 'graph').attr('transform', `scale(${ZOOM.start})`);

		// Opacity presets (fallbacks if not provided outside)
		const dimNodes = (GRAPH_OPACITY && GRAPH_OPACITY.dim?.nodes) ?? 0.18;
		const dimLinks = (GRAPH_OPACITY && GRAPH_OPACITY.dim?.links) ?? 0.1;
		const fullNodes = (GRAPH_OPACITY && GRAPH_OPACITY.full?.nodes) ?? 0.95;
		const fullLinks = (GRAPH_OPACITY && GRAPH_OPACITY.full?.links) ?? 0.45;

		// Edges
		const link = g
			.append('g')
			.attr('stroke', '#2A2A2A')
			.selectAll('line')
			.data(links)
			.join('line')
			.attr('stroke-width', (d: any) => Math.max(0.5, Math.sqrt(d.value || 1) * 0.8))
			.attr('stroke-opacity', dimLinks)
			.attr('vector-effect', 'non-scaling-stroke');

		// Nodes
		const node = g
			.append('g')
			.selectAll('circle')
			.data(nodes)
			.join('circle')
			.attr('r', (d: any) => (d.type === 'paper' ? 10 : 6))
			// Fully opaque, but DARKER color in the “dim” state
			.attr('fill', (d: any) => shadeHex(domainColors[d.domain] ?? '#AAAAAA', NODE_BRIGHTNESS.dim))
			.attr('stroke', '#0A0A0A')
			.attr('stroke-width', 0.6)
			.attr('vector-effect', 'non-scaling-stroke'); // no .style('opacity', ...) here

		sim.on('tick', () => {
			link
				.attr('x1', (d: any) => (typeof d.source === 'object' ? d.source.x : 0))
				.attr('y1', (d: any) => (typeof d.source === 'object' ? d.source.y : 0))
				.attr('x2', (d: any) => (typeof d.target === 'object' ? d.target.x : 0))
				.attr('y2', (d: any) => (typeof d.target === 'object' ? d.target.y : 0));

			node.attr('cx', (d: any) => d.x).attr('cy', (d: any) => d.y);
		});

		// --- cursor "gravity" force (repel) ---
		const pointer = { x: 0, y: 0, active: false };

		const cursorForce = (() => {
			let nn: any[] = nodes;
			let radius = 280; // px in viewBox space
			let strength = 20.0; // push strength
			let repel = true; // flip to false to attract

			function force(alpha: number) {
				if (!pointer.active) return;
				const s = strength * alpha;
				const r2 = radius * radius;
				for (let i = 0; i < nn.length; i++) {
					const n = nn[i];
					const dx = n.x - pointer.x;
					const dy = n.y - pointer.y;
					const d2 = dx * dx + dy * dy;
					if (d2 === 0 || d2 > r2) continue;
					const d = Math.sqrt(d2);
					const k = 1 - d / radius; // linear falloff
					const m = s * k * (repel ? 1 : -1);
					n.vx += (dx / d) * m;
					n.vy += (dy / d) * m;
				}
			}
			force.initialize = (arr: any[]) => (nn = arr);
			return force;
		})();

		sim.force('cursor', cursorForce as any);

		// --- listeners: pointer + scroll (parallax) ---
		const svgEl = svg.node() as SVGSVGElement;
		d3.select(window).on('.graph', null); // clear prior listeners on hot-reload/redraw

		function toLocal(e: PointerEvent) {
			const rect = svgEl.getBoundingClientRect();
			return {
				x: e.clientX - rect.left - rect.width / 2,
				y: e.clientY - rect.top - rect.height / 2
			};
		}

		// pointer movement (kept as-is, gated by interactivityEnabled)
		d3.select(window)
			.on('pointermove.graph', (e: PointerEvent) => {
				if (!interactivityEnabled) return;
				const p = toLocal(e);
				pointer.x = p.x;
				pointer.y = p.y;
				pointer.active = true;
				sim.alphaTarget(0.3).restart();
			})
			.on('pointerleave.graph blur.graph', () => {
				pointer.active = false;
				sim.alphaTarget(0);
			});

		// scroll parallax: translate the outer wrapper opposite scroll
		function applyParallax() {
			if (PARALLAX === 0) return; // disabled while revealed

			const y =
				(window.scrollY ??
					document.documentElement.scrollTop ??
					(document.body as any).scrollTop ??
					0) * PARALLAX;

			// Scroll down -> graph shifts up slightly
			scrollOffsetY = -y;
			gScroll.attr('transform', `translate(0, ${scrollOffsetY})`);
		}
		applyParallax(); // set initial position
		d3.select(window).on('scroll.graph', applyParallax); // passive parallax

		// --- expose reveal + enable interactivity ---
		revealGraph = (visible: boolean) => {
			const toNodes = visible ? fullNodes : dimNodes;
			const toLinks = visible ? fullLinks : dimLinks;

			// Fade/brighten
			link.transition().duration(2000).ease(d3.easeCubicOut).attr('stroke-opacity', toLinks);
			node
				.transition()
				.duration(2000)
				.ease(d3.easeCubicOut)
				.attr('fill', (d: any) =>
					shadeHex(
						domainColors[d.domain] ?? '#AAAAAA',
						visible ? NODE_BRIGHTNESS.full : NODE_BRIGHTNESS.dim
					)
				);

			// Zoom (inner graph)
			g.transition()
				.duration(REVEAL_MS)
				.ease(d3.easeCubicOut)
				.attr('transform', `scale(${visible ? ZOOM.focus : ZOOM.start})`);

			if (visible) {
				// 1) Freeze parallax updates so nothing snaps mid-animation
				d3.select(window).on('scroll.graph', null);

				// 2) Animate the outer wrapper from its current offset to center (0)
				gScroll
					.interrupt()
					.transition()
					.duration(REVEAL_MS)
					.ease(d3.easeCubicOut)
					.attr('transform', 'translate(0,0)')
					.on('end', () => {
						scrollOffsetY = 0;
					});

				// 3) Disable parallax + pointer gravity while revealed
				PARALLAX = 0;
				interactivityEnabled = false;
				pointer.active = false;
				sim.alphaTarget(0);
			} else {
				// If you ever "unreveal", restore parallax smoothly for current scroll
				PARALLAX = DEFAULT_PARALLAX;
				applyParallax(); // put gScroll back where it should be
				d3.select(window).on('scroll.graph', applyParallax);
				interactivityEnabled = true;
			}
		};

		const svgSel = d3.select(svg.node());

		// start fully hidden
		if (!initialFadeDone) {
			svgSel.style('opacity', 0);

			// run after it’s been appended to the DOM
			requestAnimationFrame(() => {
				svgSel
					.transition()
					.duration(FADE_IN_MS)
					.ease(d3.easeCubicOut)
					.style('opacity', 1)
					.on('end', () => {
						initialFadeDone = true;
					});
			});
		} else {
			svgSel.style('opacity', 1);
		}
		return svg.node();
	}

	// ---------- UI: heading + CTA ----------
	let btnGlowX = 50;
	let btnGlowY = 50;
	let btnHover = false;
	let btnGlowFadeTimer: ReturnType<typeof setTimeout> | null = null;

	const headingText = 'Unleash Your Intellectual Potential';
	let headingRef: HTMLDivElement;
	let wordRefs: HTMLElement[] = [];
	let headingRect = { left: 0, width: 0 };

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
		const el = document.querySelector('.heading-words') as HTMLElement | null;
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

	// ---------- Auth ----------
	let showLoginModal = false;
	async function signInWithGoogle() {
		const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
		if (error) alert(error.message);
	}
	// ---------- Mount ----------
	onMount(() => {
		(async () => {
			// Redirect if logged in
			const {
				data: { session }
			} = await supabase.auth.getSession();
			if (session) goto('/app');
			// 1) Detect viewport immediately
			updateViewport();
			window.addEventListener('resize', updateViewport);
			window.addEventListener('orientationchange', updateViewport);

			// 2) Draw/skip graph based on mode
			renderGraphIfNeeded();

			await tick();
			wordRefs = Array.from(headingRef?.querySelectorAll('.heading-word') ?? []);
			updateHeadingRect();
			// Load graph JSON & render background
			await loadGraphFromJson('/glicko.json'); // ensure this file exists in /static
			if (mergedGraphLoaded && landingBgEl) {
				// remove previous SVGs (hot-reload safe)
				Array.from(landingBgEl.querySelectorAll('svg')).forEach((n) => n.remove());
				const svg = chart(mergedGraph);
				if (svg) {
					landingBgEl.appendChild(svg);
					// preserve revealed state after first render
					if (showMap && revealGraph) revealGraph(true);
				}
			}

			await tick();
			// Heading tilt
			wordRefs = Array.from(headingRef?.querySelectorAll('.heading-word') ?? []);
			updateHeadingRect();

			// Events
			window.addEventListener('resize', () => {
				if (mergedGraphLoaded && landingBgEl) {
					Array.from(landingBgEl.querySelectorAll('svg')).forEach((n) => n.remove());
					const svg = chart(mergedGraph);
					if (svg) {
						landingBgEl.appendChild(svg);
						// preserve revealed state after redraw
						if (showMap && revealGraph) revealGraph(true);
					}
				}
			});
		})();

		return () => {
			window.removeEventListener('resize', () => {});
			window.removeEventListener('orientationchange', updateViewport);
			d3.select(window).on('.graph', null);
		};
	});
</script>

<!-- Background host (graph lives here) -->
<div class="landing-bg bg-black" bind:this={landingBgEl}></div>

<!-- Top Nav -->
<div
	class="sticky top-0 left-0 z-50 grid w-full grid-cols-[1fr_2fr_1fr] items-center bg-black/70 p-4 px-24 backdrop-blur-sm"
>
	<a href="/" class="text-white">Alice</a>
	{#if !isMobileMode}
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
				href="/blog"
				class="rounded-md px-2 py-1 text-[12px] text-neutral-400 transition hover:bg-neutral-800"
				>Blog</a
			>
			<a
				href="/contact"
				class="rounded-md px-2 py-1 text-[12px] text-neutral-400 transition hover:bg-neutral-800"
				>Contact Us</a
			>
		</div>
	{/if}
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
<div class="landing-content flex min-h-screen flex-col items-center">
	{#if !showMap}
		<section
			class="flex h-screen flex-col items-center justify-center pb-30"
			out:blur={{ amount: 50, duration: 800, easing: cubicOut }}
		>
			<div class="flex flex-col items-center px-6">
				<div
					class="heading-wrapper text-center"
					bind:this={headingRef}
					on:mousemove={handleHeadingMouseMove}
					on:mouseleave={resetHeadingTilt}
				>
					{#if !isMobileMode}
						<div class="heading-words text-center">
							{#each headingText.split(' ') as word}
								<span class="heading-word">{word}</span>
							{/each}
						</div>
					{:else}
						<div class="heading-words mobile-two-line justify-center">
							<span class="heading-word">Unleash</span>
							<span class="heading-word">Your</span>

							<!-- use a flex break instead of <br/> -->
							<span class="flex-break" aria-hidden="true"></span>

							<span class="heading-word">Intellectual&nbsp;Potential</span>
						</div>
					{/if}
				</div>

				<div class="text-center text-lg text-neutral-400">
					Follow your interests. Become an expert. Advance humanity.
				</div>

				<div class="mt-10 flex flex-row gap-4">
					<button
						class="magnet relative inline-flex overflow-hidden rounded-full p-px"
						on:mousemove={handleBtnMouseMove}
						on:mouseleave={handleBtnMouseLeave}
						on:mouseenter={handleBtnMouseMove}
						on:click={() => {
							showMap = true;
							revealGraph && revealGraph(true);
						}}
					>
						<span
							class="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#c2c2c2_0%,#505050_50%,#bebebe_100%)]"
						/>
						<span
							class="glow-btn inline-flex h-full w-full cursor-pointer items-center justify-center rounded-[11px] bg-neutral-950 px-4 py-2 text-sm text-neutral-200 backdrop-blur-3xl"
							data-hover={btnHover}
							style="--glow-x: {btnGlowX}%; --glow-y: {btnGlowY}%">View Map</span
						>
					</button>
					<button
						class="group inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition duration-300 hover:ring-1 hover:ring-white/20"
						on:click={() => goto('/quiz')}
					>
						<span
							class="bg-gradient-to-r from-neutral-100 via-neutral-200 to-neutral-400 bg-clip-text text-transparent"
						>
							Take the interest quiz
						</span>
						<svg
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							class="-ml-1 h-4 w-4 text-neutral-400 transition-transform duration-200 group-hover:translate-x-1"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 5l7 7-7 7"
							/>
						</svg>
					</button>
				</div>
			</div>
		</section>

		<section
			id="how-it-works"
			class="h-screen px-6"
			out:blur={{ amount: 50, duration: 800, easing: cubicOut }}
		>
			<div class="mb-16">
				<h1 class="text-center text-5xl font-medium text-white">A New Era of Education</h1>
				<h1 class="mt-4 text-center text-lg font-light text-neutral-400">
					Curiosity is the new currency. Follow your interests and become an expert.
				</h1>
			</div>
			<div class="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
				<div
					class="group relative overflow-hidden rounded-md border border-white/10 bg-black/10 p-6 backdrop-blur-md"
				>
					<h3 class="text-3xl leading-tight font-medium text-neutral-200">Find your interests</h3>
					<p class="mt-3 max-w-sm text-neutral-400">
						Take the quiz and finally start your unique journey.
					</p>
					<p class="mt-3 max-w-sm text-black/0">
						A quick this-or-that quiz ranks what excites you most so we can tailor everythng that
						follows.
					</p>
					<p class="mt-3 max-w-sm text-black/0">
						A quick this-or-that quiz ranks what excites you most so we can tailor everythng that
						follows.
					</p>
					<p class="mt-3 max-w-sm text-black/0">
						A quick this-or-that quiz ranks what excites you most so we can tailor everythng that
						follows.
					</p>
				</div>
				<div
					class="group relative overflow-hidden rounded-md border border-white/10 bg-black/10 p-6 backdrop-blur-md"
				>
					<h3 class="text-3xl leading-tight font-medium text-neutral-200">Generate projects</h3>
					<p class="mt-3 max-w-sm text-neutral-400">
						Level up your skills by building, not watching lectures.
					</p>
					<p class="mt-3 max-w-sm text-black/0">
						A quick this-or-that quiz ranks what excites you most so we can tailor everythng that
						follows.
					</p>
					<p class="mt-3 max-w-sm text-black/0">
						A quick this-or-that quiz ranks what excites you most so we can tailor everythng that
						follows.
					</p>
					<p class="mt-3 max-w-sm text-black/0">
						A quick this-or-that quiz ranks what excites you most so we can tailor everythng that
						follows.
					</p>
				</div>
				<div
					class="group relative overflow-hidden rounded-md border border-white/10 bg-black/10 p-6 backdrop-blur-md"
				>
					<h3 class="text-3xl leading-tight font-medium text-neutral-200">Become an expert</h3>
					<p class="mt-3 max-w-sm text-neutral-400">
						Alice will guide you every step of the way towards mastery.
					</p>
					<p class="mt-3 max-w-sm text-black/0">
						A quick this-or-that quiz ranks what excites you most so we can tailor everythng that
						follows.
					</p>
					<p class="mt-3 max-w-sm text-black/0">
						A quick this-or-that quiz ranks what excites you most so we can tailor everythng that
						follows.
					</p>
					<p class="mt-3 max-w-sm text-black/0">
						A quick this-or-that quiz ranks what excites you most so we can tailor everythng that
						follows.
					</p>
				</div>
			</div>
		</section>

		<section
			id="how-it-works"
			class="h-screen px-6"
			out:blur={{ amount: 50, duration: 800, easing: cubicOut }}
		>
			<h1 class="text-center text-5xl font-medium text-white">Unrestricted Learning</h1>
			<h1 class="mt-4 text-center text-lg font-light text-neutral-400">
				No classes, no limits. Alice removes friction and encourages you to explore.
			</h1>
		</section>

		<section id="footer" class="container mx-auto grid gap-12 px-6 py-20"></section>
	{/if}
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
	.landing-bg {
		position: fixed;
		inset: 0;
		z-index: 0;
		background: #000;
	}
	.landing-content {
		position: relative;
		z-index: 3;
	}
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
	/* Tighter, centered layout just for the forced two-line mobile variant */
	.mobile-two-line {
		display: flex; /* make sure it's flex (not inline-flex) */
		flex-wrap: wrap;
		justify-content: center; /* center the words */
		column-gap: 0.5ch; /* horizontal space between words */
		row-gap: 0.12em; /* <-- controls the line gap (tweak) */
		line-height: 1; /* tighten baseline space */
	}

	/* The line-break element that forces a new row without adding height */
	.mobile-two-line .flex-break {
		flex-basis: 100%;
		width: 0;
		height: 0; /* no extra vertical space */
	}

	/* (Optional) Make it only apply on small screens */
	@media (max-width: 768px) {
		.mobile-two-line {
			row-gap: 0.12em;
			line-height: 1;
		}
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
		font-weight: 600;
		color: white;
	}

	/* CTA glow button */
	.glow-btn {
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
			rgba(255, 255, 255, 0.5) 0%,
			rgba(255, 255, 255, 0.2) 30%,
			rgba(255, 255, 255, 0) 60%,
			transparent 100%
		);
		filter: blur(3.5px);
	}
	.glow-btn[data-hover='true']::after {
		opacity: 1;
	}

	* {
		user-select: none;
	}
	::selection {
		background: transparent;
	}
</style>
