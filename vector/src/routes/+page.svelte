<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { blur } from 'svelte/transition';
	import vectorUrl from '$lib/assets/vector.svg?url';

	const NAMES = ['zuck', 'musk', 'jobs', 'bezos', 'huang'];
	const longest = Math.max(...NAMES.map((n) => n.length));
	const colWidth = longest + 1;

	let text = '';
	let i = 0,
		char = 0,
		typing = true;

	const TYPE_MS = 90,
		DELETE_MS = 60,
		HOLD_MS = 2000,
		GAP_MS = 250;

	let t: number | null = null;
	let joinRequested = false;
	let joinCompleted = false;

	function tick() {
		if (joinCompleted) return;
		const current = NAMES[i];
		if (typing) {
			if (char < current.length) {
				text = current.slice(0, ++char);
				t = window.setTimeout(tick, TYPE_MS);
			} else {
				typing = false;
				const delay = joinRequested ? DELETE_MS : HOLD_MS;
				t = window.setTimeout(tick, delay);
			}
		} else {
			if (char > 0) {
				text = current.slice(0, --char);
				t = window.setTimeout(tick, DELETE_MS);
			} else {
				if (joinRequested) {
					text = '';
					joinCompleted = true;
					t = null;
					return;
				}
				typing = true;
				i = (i + 1) % NAMES.length;
				t = window.setTimeout(tick, GAP_MS);
			}
		}
	}

	function requestJoin() {
		if (joinRequested || joinCompleted) return;
		joinRequested = true;
		if (t !== null) {
			window.clearTimeout(t);
		}
		tick();
	}

	onMount(tick);
	onDestroy(() => {
		if (t !== null) window.clearTimeout(t);
	});
</script>

<div class="flex h-screen w-full flex-col items-center justify-center gap-6 bg-yellow-50 px-6">
	<div class="flex w-full max-w-md flex-col items-start gap-6">
		<div class="flex flex-row items-center gap-3">
			<img src={vectorUrl} alt="vector" class="h-8 w-8" />
			<div class="font-mono text-4xl">vector</div>
		</div>

		<div class="w-full font-mono text-lg text-black/70">
			<div class="headline flex items-baseline" aria-live="polite">
				<span class="prefix mr-1">become the next</span>
				<span class="type-box text-black/90">
					{#if joinCompleted}
						<input
							in:blur={{ duration: 300 }}
							type="email"
							class="waitlist-input"
							placeholder="your email"
						/>
					{:else}
						<span class="typed">{text}</span>
					{/if}
				</span>
			</div>
		</div>

		<button class="self-center rounded-lg bg-black px-4 pb-1" on:click={requestJoin}>
			<text class="text-xs text-yellow-50">join waitlist</text>
		</button>
	</div>
</div>

<style>
	.headline {
		column-gap: 0.5ch;
		white-space: nowrap;
	}

	.type-box {
		width: 100%;
		display: inline-flex;
		align-items: baseline;
		white-space: nowrap;
		overflow: hidden;
		position: relative;
	}

	.typed {
		/* gutter for caret */
		padding-right: 1px; /* no top/bottom padding */
		padding-bottom: 1px;
		border-right: 0.07em solid currentColor;
		line-height: 1em; /* caret = text height */
		display: inline-block; /* baseline aligns reliably */
		animation: caret-blink 1s step-end infinite;
	}

	.waitlist-input {
		width: 100%;
		border: none;
		background: transparent;
		padding: 0;
		font: inherit;
		color: color-mix(in srgb, black 60%, transparent);
	}

	.waitlist-input:focus {
		outline: none;
		border-bottom-color: black;
		color: black;
	}

	.waitlist-input::placeholder {
		color: color-mix(in srgb, black 35%, transparent);
	}

	/* keep your keyframes */
	@keyframes caret-blink {
		0%,
		20%,
		100% {
			border-right-color: currentColor;
		}
		50% {
			border-right-color: color-mix(in oklab, currentColor 0%, transparent);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.typed {
			animation: none;
		}
	}
</style>
