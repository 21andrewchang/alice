<script>
	import { onMount } from 'svelte';
	import * as d3 from 'd3';

	let element;
	let tooltipEl;
	let selectedNode = null;
	let pdfLoading = false;
	let showPdfFrame = false;
	let learnedNodes = new Set();
	
	// Idle animation variables
	let simulation;
	let idleTime = 0;
	let idleAnimationId;
	


	async function loadData() {
		return fetch('/believable_acting.json').then((r) => r.json());
	}

	function selectNode(node) {
		selectedNode = node;
		learnedNodes.add(node.id);
		
		// Zoom in and center on the selected node
		if (zoomBehavior && svgElement) {
			const scale = 2; // Zoom scale factor
			const [x, y] = [node.x || 0, node.y || 0]; // Node position
			
			// Get the current container dimensions
			const containerWidth = 928;
			const containerHeight = 680;
			
			// SVG viewBox is centered at (0,0), so we need to account for that
			// When side panel is open, we want to center in the left half
			const visibleWidth = containerWidth / 2; // Left half for graph
			
			// Calculate target position in SVG coordinates (viewBox is centered)
			// We want the node to appear at 1/4 from left edge and 1/3 from top
			const targetX = -containerWidth / 4 + visibleWidth / 2; // Center of left half
			const targetY = -containerHeight / 2 + containerHeight / 3; // 1/3 from top
			
			// Create transform to move the node to the target position
			const transform = d3.zoomIdentity
				.translate(targetX - x * scale, targetY - y * scale)
				.scale(scale);
			
			// Apply zoom transform with smooth transition
			d3.select(svgElement)
				.transition()
				.duration(750)
				.call(zoomBehavior.transform, transform);
		}
		
		// For PDFs, delay iframe creation to avoid lag
		if (node.type === 'paper' && node.url) {
			pdfLoading = true;
			showPdfFrame = false;
			// Delay iframe creation slightly to let panel open smoothly
			setTimeout(() => {
				showPdfFrame = true;
			}, 100);
		}
		
		// Re-render to show glow effect
		updateNodeStyles();
	}

	function toggleLearned(nodeId) {
		if (learnedNodes.has(nodeId)) {
			learnedNodes.delete(nodeId);
		} else {
			learnedNodes.add(nodeId);
		}
		updateNodeStyles();
	}

	let nodeSel; // Store node selection for updates
	let zoomBehavior; // Store zoom behavior for programmatic control
	let svgElement; // Store SVG element reference

	function getDomainColor(domain) {
		const domainColors = {
			'math': '#5B8DF2',          // Electric Pulse
			'tech': '#73DACA',          // Cyber Teal  
			'sciences': '#BA6FFF',      // Cosmic Violet
			'humanities': '#F88951',    // Sunset Amber
			'art': '#F7768E',           // Rose Bloom
			'research-papers': '#BFCAF3' // Papyrus
		};
		return domainColors[domain] || '#3A5A8F'; // Default to Desaturated Electric Pulse
	}

	function updateNodeStyles() {
		if (nodeSel) {
			nodeSel
				.attr('fill', (d) => {
					if (d.type === 'paper') {
						return learnedNodes.has(d.id) ? '#BFCAF3' : '#8A9BB8'; // Dimmer papyrus for unlearned papers
					}
					const baseColor = getDomainColor(d.domain || 'tech');
					return learnedNodes.has(d.id) ? baseColor : dimColor(baseColor); // Dimmer for unlearned nodes
				})
				.attr('stroke', (d) => {
					if (d.type === 'paper') {
						return learnedNodes.has(d.id) ? '#BFCAF3' : '#8A9BB8'; // Matching stroke for papers
					}
					const baseColor = getDomainColor(d.domain || 'tech');
					return learnedNodes.has(d.id) ? baseColor : dimColor(baseColor); // Matching stroke, dimmed for unlearned
				})
				.attr('stroke-width', (d) => learnedNodes.has(d.id) ? 3 : 1.5)
				.style('filter', (d) => {
					if (d.type === 'paper') return learnedNodes.has(d.id) ? 'drop-shadow(0 0 6px #BFCAF3)' : null;
					const domainColor = getDomainColor(d.domain || 'tech');
					return learnedNodes.has(d.id) ? `drop-shadow(0 0 6px ${domainColor})` : null;
				});
		}
	}

	// Helper function to dim colors for unlearned nodes
	function dimColor(color) {
		// Convert hex to RGB, reduce brightness, convert back
		const hex = color.replace('#', '');
		const r = parseInt(hex.substr(0, 2), 16);
		const g = parseInt(hex.substr(2, 2), 16);
		const b = parseInt(hex.substr(4, 2), 16);
		
		// Reduce brightness by ~40%
		const dimR = Math.round(r * 0.6);
		const dimG = Math.round(g * 0.6);
		const dimB = Math.round(b * 0.6);
		
		return `#${dimR.toString(16).padStart(2, '0')}${dimG.toString(16).padStart(2, '0')}${dimB.toString(16).padStart(2, '0')}`;
	}

	function chart(data) {
		const width = 928;
		const height = 680;

		// Purple color scale for nodes
		const nodeColor = d3.scaleSequential().domain([1, 5]).interpolator(d3.interpolatePurples);

		// Pure gray connections
		const linkColor = d3
			.scaleOrdinal()
			.domain(['prerequisite', 'advance', 'lateral'])
			.range(['#333333', '#333333', '#333333']); // All connections pure gray

		// Clone data
		const nodes = data.nodes.map((d) => ({ ...d }));
		const links = data.links.map((d) => ({ ...d }));

		// Map central relations
		const centralId = 0;
		const relationMap = {};
		links.forEach((l) => {
			if (l.source === centralId) relationMap[l.target] = l.relation;
			else if (l.target === centralId) relationMap[l.source] = l.relation;
		});

		// Simulation with clustering
		const simulation = d3
			.forceSimulation(nodes)
			.force(
				'link',
				d3
					.forceLink(links)
					.id((d) => d.id)
					.distance(100)
			)
			.force('charge', d3.forceManyBody().strength(-200))
			.force('center', d3.forceCenter(0, 0))
			.force(
				'x',
				d3
					.forceX((d) => {
						const r = relationMap[d.id];
						if (r === 'prerequisite') return -width / 4;
						if (r === 'advance') return width / 4;
						return 0;
					})
					.strength(0.2)
			)
			.force(
				'y',
				d3
					.forceY((d) => {
						const r = relationMap[d.id];
						return r === 'lateral' ? height / 4 : 0;
					})
					.strength(0.2)
			);

		// Create SVG with zoom behavior
		const svg = d3
			.create('svg')
			.attr('width', '100%')
			.attr('height', '100%')
			.attr('viewBox', [-width / 2, -height / 2, width, height])
			.attr('preserveAspectRatio', 'xMidYMid meet');

		// Add zoom behavior
		const zoom = d3.zoom()
			.scaleExtent([0.1, 10])
			.on('zoom', (event) => {
				g.attr('transform', event.transform);
				
				// Show/hide text labels based on zoom level
				const scale = event.transform.k;
				const showLabels = scale >= 1.5; // Show labels when zoomed to 1.5x or more
				
				g.selectAll('text')
					.style('opacity', showLabels ? 1 : 0);
			});

		svg.call(zoom);
		
		// Store references for programmatic zoom control
		zoomBehavior = zoom;
		svgElement = svg.node();

		// Add solid background rectangle to SVG
		svg.append('rect')
			.attr('x', -width / 2)
			.attr('y', -height / 2)
			.attr('width', width)
			.attr('height', height)
			.attr('fill', '#080808');

		// Main group for all graph elements
		const g = svg.append('g');

		// Draw links
		g
			.append('g')
			.attr('stroke-opacity', 0.6)
			.selectAll('line')
			.data(links)
			.join('line')
			.attr('stroke-width', (d) => Math.sqrt(d.value || 1))
			.attr('stroke', (d) => linkColor(d.relation));

		// Draw nodes & attach events
		nodeSel = g
			.append('g')
			.selectAll('circle')
			.data(nodes)
			.join('circle')
			.attr('r', (d) => d.type === 'paper' ? 12 : 8) // Larger radius for research papers
			.attr('fill', (d) => d.type === 'paper' ? '#BFCAF3' : getDomainColor(d.domain || 'tech')) // Papyrus for papers, domain colors for others
			.attr('stroke', (d) => d.type === 'paper' ? '#BFCAF3' : getDomainColor(d.domain || 'tech')) // Matching stroke for both
			.attr('stroke-width', 1.5)
			.attr('cursor', 'pointer')
			.call(d3.drag().on('start', dragstarted).on('drag', dragged).on('end', dragended))
			.on('mouseover', (event, d) => {
				d3.select(tooltipEl).classed('hidden', false).text(d.label);
			})
			.on('mousemove', (event) => {
				d3.select(tooltipEl)
					.style('left', event.pageX + 10 + 'px')
					.style('top', event.pageY + 10 + 'px');
			})
			.on('mouseout', () => {
				d3.select(tooltipEl).classed('hidden', true);
			})
			.on('click', (event, d) => {
				event.stopPropagation();
				selectNode(d);
			});

		// Add text labels for nodes (excluding papers)
		const textSel = g
			.append('g')
			.selectAll('text')
			.data(nodes)
			.join('text')
			.attr('text-anchor', 'middle')
			.attr('dy', '0.35em')
			.attr('font-size', '6px')
			.attr('font-family', 'Arial, sans-serif')
			.attr('fill', '#333333')
			.attr('pointer-events', 'none')
			.style('opacity', 0) // Start hidden
			.text(d => d.label);

		// Tick update
		simulation.on('tick', () => {
			g
				.selectAll('line')
				.attr('x1', (d) => d.source.x)
				.attr('y1', (d) => d.source.y)
				.attr('x2', (d) => d.target.x)
				.attr('y2', (d) => d.target.y);
			g
				.selectAll('circle')
				.attr('cx', (d) => d.x)
				.attr('cy', (d) => d.y);
			g
				.selectAll('text')
				.attr('x', (d) => d.x)
				.attr('y', (d) => d.y + (d.type === 'paper' ? 26 : 20)); // Position labels farther below paper nodes
		});

		function dragstarted(e) {
			if (!e.active) simulation.alphaTarget(0.3).restart();
			e.subject.fx = e.subject.x;
			e.subject.fy = e.subject.y;
		}
		function dragged(e) {
			e.subject.fx = e.x;
			e.subject.fy = e.y;
		}
		function dragended(e) {
			if (!e.active) simulation.alphaTarget(0);
			e.subject.fx = null;
			e.subject.fy = null;
		}

		// Store simulation reference
		window.simulation = simulation;

		return svg.node();
	}



	onMount(async () => {
		const data = await loadData();
		element.innerHTML = '';
		element.appendChild(chart(data));
	});
</script>

<!-- Cyberpunk theme main container with side-by-side layout -->
<main class="relative h-screen w-screen flex" style="background-color: #080808; color: #B3B3B3;">
	<!-- Tooltip -->
	<div
		bind:this={tooltipEl}
		class="pointer-events-none absolute hidden rounded p-2 text-sm shadow-lg z-50"
		style="background-color: #080808; border: 1px solid #333333;"
	></div>

	<!-- Graph container - left side or full width -->
	<div class="{selectedNode ? 'w-1/2' : 'w-full'} h-full transition-all duration-150">
		<div bind:this={element} class="h-full w-full"></div>
	</div>

	<!-- Node Preview panel - right side -->
	{#if selectedNode}
		<div class="w-1/2 h-full" style="background-color: #080808;">
			<div class="h-full p-6">
				<div class="h-full rounded-2xl overflow-hidden" style="background-color: #111111;">
					<div class="h-full overflow-hidden">
				{#if selectedNode.type === 'paper' && selectedNode.url}
					<!-- PDF display for papers -->
					<div class="h-full flex flex-col">
						<div class="flex items-center justify-between p-6">
							<h2 class="text-2xl font-bold" style="color: #BFCAF3;">{selectedNode.label}</h2>
							<button
								on:click={() => selectedNode = null}
								class="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-600 transition-colors"
								aria-label="Close"
							>
								✕
							</button>
						</div>
						
						<div class="flex-1">
							<iframe 
								src="{selectedNode.url}#navpanes=0&scrollbar=0"
								class="w-full h-full border-0"
								title="PDF Viewer"
							></iframe>
						</div>
					</div>
				{:else}
					<!-- Regular node display -->
					<div class="p-6 h-full overflow-y-auto">
						<div class="mb-4">
							<div class="flex items-center justify-between mb-4">
								<h2 class="text-2xl font-bold" style="color: {getDomainColor(selectedNode.domain)};">{selectedNode.label}</h2>
								<button
									on:click={() => selectedNode = null}
									class="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-600 transition-colors"
									aria-label="Close"
								>
									✕
								</button>
							</div>
							<div class="flex items-center gap-2 mb-4">
								<span class="text-sm" style="color: #B3B3B3;">Difficulty: {selectedNode.difficulty}/5</span>
								<div class="flex">
									{#each Array(selectedNode.difficulty) as _}
										<div class="w-2 h-2 rounded-full mr-1" style="background-color: {getDomainColor(selectedNode.domain)};"></div>
									{/each}
									{#each Array(5 - selectedNode.difficulty) as _}
										<div class="w-2 h-2 rounded-full mr-1" style="background-color: #3A3F59;"></div>
									{/each}
								</div>
							</div>
						</div>

						<div class="mb-6">
							<h3 class="text-lg font-semibold mb-2" style="color: #B3B3B3;">Description</h3>
							<p class="leading-relaxed" style="color: #B3B3B3;">{selectedNode.description}</p>
						</div>
					</div>
				{/if}
					</div>
				</div>
			</div>
		</div>
	{/if}
</main>
