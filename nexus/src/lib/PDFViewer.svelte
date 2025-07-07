<script>
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	
	export let pdfUrl = '';
	export let onClose = () => {};
	export let initialScale = 1.2;
   
	let pdfDoc = null;
	let pdfjsLib = null;
	let scale = initialScale;
	let pageNum = 1;
	let totalPages = 0;
	let canvasEl;
	let dark = false;
	let isLoading = true;
	let errorMessage = '';

	onMount(async () => {
		if (browser && pdfUrl) {
			await loadPdfFromUrl();
		}
	});
  
	async function loadPdfFromUrl() {
		try {
			isLoading = true;
			errorMessage = '';
			console.log('Loading PDF from URL:', pdfUrl);
			
			// Dynamic import of PDF.js only in browser
			const pdfjs = await import('pdfjs-dist');
			pdfjsLib = pdfjs;
			
			// Set up worker
			try {
				pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
			} catch {
				pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@5.3.31/build/pdf.worker.min.mjs';
			}
			
			pdfDoc = await pdfjsLib.getDocument(pdfUrl).promise;
			totalPages = pdfDoc.numPages;
			pageNum = 1;
			scale = initialScale;
			await renderPage();
			isLoading = false;
		} catch (error) {
			console.error('Error loading PDF:', error);
			errorMessage = 'Failed to load PDF: ' + (error.message || error.toString());
			isLoading = false;
		}
	}

	async function loadFile(event) {
		const file = event.target.files[0];
		if (!file || !browser) return;
		try {
			if (!pdfjsLib) {
				const pdfjs = await import('pdfjs-dist');
				pdfjsLib = pdfjs;
			}
			
			const buffer = await file.arrayBuffer();
			pdfDoc = await pdfjsLib.getDocument({ data: buffer }).promise;
			totalPages = pdfDoc.numPages;
			pageNum = 1;
			scale = initialScale;
			await renderPage();
		} catch (error) {
			console.error('Error loading file:', error);
			errorMessage = 'Failed to load file: ' + (error.message || error.toString());
		}
	}
   
	async function renderPage() {
		if (!pdfDoc || !canvasEl || !pdfjsLib) return;
		try {
			const page = await pdfDoc.getPage(pageNum);
			const viewport = page.getViewport({ scale });
			canvasEl.width = viewport.width;
			canvasEl.height = viewport.height;
			await page.render({ canvasContext: canvasEl.getContext('2d'), viewport }).promise;
		} catch (error) {
			console.error('Error rendering page:', error);
			errorMessage = 'Failed to render page: ' + (error.message || error.toString());
		}
	}
  
	function zoom(delta) {
		if (!pdfDoc) return;
		scale = Math.min(3, Math.max(0.2, scale + delta));
		renderPage();
	}

	function nextPage() {
		if (!pdfDoc || pageNum >= totalPages) return;
		pageNum++;
		renderPage();
	}

	function prevPage() {
		if (!pdfDoc || pageNum <= 1) return;
		pageNum--;
		renderPage();
	}
   
	function toggleDark() {
		dark = !dark;
	}

	function handleWheel(event) {
		if (event.ctrlKey || event.metaKey) {
			event.preventDefault();
			const delta = event.deltaY > 0 ? -0.1 : 0.1;
			zoom(delta);
		}
	}
</script>
  
<style>
	:global(:root) {
		--bg: #1e1e1e;
		--fg: #f0f0f0;
		--bar: #2d2d2d;
		--btn-hover: #3a3a3a;
	}
	.container {
		height: 100%;
		display: flex;
		flex-direction: column;
		background: var(--bg);
		color: var(--fg);
	}
	.toolbar {
		background: var(--bar);
		color: var(--fg);
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem 1rem;
		border-bottom: 1px solid #333;
	}
	.toolbar input { 
		color: var(--fg); 
		background: var(--bg);
		border: 1px solid #444;
		padding: 0.25rem;
		border-radius: 4px;
	}
	.toolbar button {
		background: none;
		border: none;
		color: var(--fg);
		margin-left: 0.5rem;
		padding: 0.3rem 0.5rem;
		cursor: pointer;
		border-radius: 4px;
	}
	.toolbar button:hover { background: var(--btn-hover); }
	.toolbar button:disabled { opacity: 0.5; cursor: not-allowed; }
	.viewer {
		flex: 1;
		overflow: auto;
		padding: 1rem;
		display: flex;
		justify-content: center;
		align-items: flex-start;
	}
	.canvas-container {
		display: inline-block;
		cursor: grab;
	}
	.canvas-container:active {
		cursor: grabbing;
	}
	.dark canvas { filter: invert(1) hue-rotate(180deg); }
	canvas { 
		display: block;
		box-shadow: 0 4px 8px rgba(0,0,0,0.3);
	}
	.loading, .error {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		height: 100%;
		text-align: center;
		gap: 1rem;
	}
	.error {
		color: #ff6b6b;
	}
	.spinner {
		border: 2px solid #333;
		border-top: 2px solid #5B8DF2;
		border-radius: 50%;
		width: 24px;
		height: 24px;
		animation: spin 1s linear infinite;
	}
	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}
</style>
  
{#if browser}
<div class="container">
	<div class="toolbar">
		<div class="left">
			<span>PDF Viewer</span>
			<input type="file" accept="application/pdf" on:change={loadFile} />
		</div>
		<div class="center">
			{#if pdfDoc}
				<button on:click={prevPage} disabled={pageNum <= 1}>←</button>
				<span>{pageNum} / {totalPages}</span>
				<button on:click={nextPage} disabled={pageNum >= totalPages}>→</button>
			{/if}
		</div>
		<div class="right">
			<button on:click={() => zoom(-0.1)} disabled={!pdfDoc}>−</button>
			<span>{Math.round(scale * 100)}%</span>
			<button on:click={() => zoom(0.1)} disabled={!pdfDoc}>+</button>
			<button on:click={toggleDark}>🌓</button>
			<button on:click={onClose}>✕</button>
		</div>
	</div>
	
	<div class="viewer" class:dark on:wheel={handleWheel}>
		{#if isLoading}
			<div class="loading">
				<div class="spinner"></div>
				<div>Loading PDF...</div>
			</div>
		{:else if errorMessage}
			<div class="error">
				<div>⚠️</div>
				<div>{errorMessage}</div>
			</div>
		{:else}
			<div class="canvas-container">
				<canvas bind:this={canvasEl}></canvas>
			</div>
		{/if}
	</div>
</div>
{:else}
	<div class="container">
		<div class="loading">
			<div class="spinner"></div>
			<div>Loading PDF viewer...</div>
		</div>
	</div>
{/if}
  