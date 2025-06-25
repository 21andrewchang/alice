<script>
	import { onMount } from 'svelte';
	import * as d3 from 'd3';

	let element;
	let tooltipEl;
	let selectedNode = null;
	let learnedNodes = new Set();

	async function loadData() {
		return fetch('/cnn.json').then((r) => r.json());
	}

	function selectNode(node) {
		selectedNode = node;
		learnedNodes.add(node.id);
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

	function updateNodeStyles() {
		if (nodeSel) {
			nodeSel
				.attr('fill', (d) => learnedNodes.has(d.id) ? '#5B8DF2' : '#4D5072') // node-learned : node-base
				.attr('stroke', (d) => learnedNodes.has(d.id) ? '#5B8DF2' : '#3A3F59') // Same color glow : border
				.attr('stroke-width', (d) => learnedNodes.has(d.id) ? 3 : 1.5)
				.style('filter', (d) => learnedNodes.has(d.id) ? 'drop-shadow(0 0 8px #5B8DF2)' : null);
		}
	}

	function chart(data) {
		const width = 928;
		const height = 680;

		// Purple color scale for nodes
		const nodeColor = d3.scaleSequential().domain([1, 5]).interpolator(d3.interpolatePurples);

		// Light gray connections
		const linkColor = d3
			.scaleOrdinal()
			.domain(['prerequisite', 'advance', 'lateral'])
			.range(['#8B93C3', '#8B93C3', '#8B93C3']); // All connections light gray (text-primary)

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
			});

		svg.call(zoom);

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
			.attr('r', 8)
			.attr('fill', '#4D5072') // node-base (Circuit Slate)
			.attr('stroke', '#3A3F59') // border-color (Neon Grid Gray)
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

		return svg.node();
	}

	onMount(async () => {
		const data = await loadData();
		element.innerHTML = '';
		element.appendChild(chart(data));
	});
</script>

<!-- Cyberpunk theme main container with side-by-side layout -->
<main class="relative h-screen w-screen flex" style="background-color: #0D0D0D; color: #B3B3B3;">
	<!-- Tooltip -->
	<div
		bind:this={tooltipEl}
		class="pointer-events-none absolute hidden rounded p-2 text-sm shadow-lg z-50"
		style="background-color: #2A2A2A; border: 1px solid #333333;"
	></div>

	<!-- Graph container - left side or full width -->
	<div class="{selectedNode ? 'w-1/2' : 'w-full'} h-full transition-all duration-300" style="border-right: 1px solid #333333;">
		<div bind:this={element} class="h-full w-full"></div>
	</div>

	<!-- Node Preview panel - right side -->
	{#if selectedNode}
		<div class="w-1/2 h-full p-6 overflow-y-auto" style="background-color: #2A2A2A;">
			<div class="mb-4">
				<h2 class="text-2xl font-bold mb-2" style="color: #5B8DF2;">{selectedNode.label}</h2>
				<div class="flex items-center gap-2 mb-4">
					<span class="text-sm" style="color: #B3B3B3;">Difficulty: {selectedNode.difficulty}/5</span>
					<div class="flex">
						{#each Array(selectedNode.difficulty) as _}
							<div class="w-2 h-2 rounded-full mr-1" style="background-color: #5B8DF2;"></div>
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

			<div class="flex gap-3">
				<button
					on:click={() => toggleLearned(selectedNode.id)}
					class="px-4 py-2 rounded-lg transition-colors"
					style="background-color: {learnedNodes.has(selectedNode.id) ? '#8060D0' : '#5B8DF2'}; 
					       color: {learnedNodes.has(selectedNode.id) ? '#A9AEED' : '#0D0D0D'};"
				>
					{learnedNodes.has(selectedNode.id) ? 'Mark as Unlearned' : 'Mark as Learned'}
				</button>
				<button
					on:click={() => selectedNode = null}
					class="px-4 py-2 rounded-lg transition-colors"
					style="background-color: #8060D0; color: #A9AEED;"
				>
					Close
				</button>
			</div>
		</div>
	{/if}
</main>
