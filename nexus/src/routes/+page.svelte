<script>
	import { onMount } from 'svelte';
	import * as d3 from 'd3';

	let element;
	let tooltipEl;

	async function loadData() {
		return fetch('/cnn.json').then((r) => r.json());
	}

	function chart(data) {
		const width = 928;
		const height = 680;

		// Color scales
		const difficultyColor = d3.scaleSequential().domain([1, 5]).interpolator(d3.interpolateBlues);

		const linkColor = d3
			.scaleOrdinal()
			.domain(['prerequisite', 'advance', 'lateral'])
			.range(['#3182bd', '#31a354', '#e6550d']);

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

		// Create SVG
		const svg = d3
			.create('svg')
			.attr('width', '100%')
			.attr('height', '100%')
			.attr('viewBox', [-width / 2, -height / 2, width, height])
			.attr('preserveAspectRatio', 'xMidYMid meet');

		// Draw links
		svg
			.append('g')
			.attr('stroke-opacity', 0.6)
			.selectAll('line')
			.data(links)
			.join('line')
			.attr('stroke-width', (d) => Math.sqrt(d.value))
			.attr('stroke', (d) => linkColor(d.relation));

		// Draw nodes & attach hover events
		const nodeSel = svg
			.append('g')
			.attr('stroke', '#fff')
			.attr('stroke-width', 1.5)
			.selectAll('circle')
			.data(nodes)
			.join('circle')
			.attr('r', 5)
			.attr('fill', (d) => difficultyColor(d.difficulty))
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
			});

		// Tick update
		simulation.on('tick', () => {
			svg
				.selectAll('line')
				.attr('x1', (d) => d.source.x)
				.attr('y1', (d) => d.source.y)
				.attr('x2', (d) => d.target.x)
				.attr('y2', (d) => d.target.y);
			svg
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

<main class="relative h-screen w-screen">
	<!-- Tooltip div, hidden by default -->
	<div
		bind:this={tooltipEl}
		class="pointer-events-none absolute hidden rounded border border-gray-300 bg-white p-1 text-xs shadow"
	></div>

	<!-- Graph container fills the rest -->
	<div bind:this={element} class="h-full w-full"></div>
</main>
