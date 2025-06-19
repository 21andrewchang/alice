<script>
	import { onMount } from 'svelte';
	import * as d3 from 'd3';

	let element;

	// Load local JSON from your "static" folder (place graph.json in /static)
	async function loadData() {
		return await fetch('/graph.json').then((r) => r.json());
	}

	function chart(data) {
		const width = 928;
		const height = 680;
		const color = d3.scaleOrdinal(d3.schemeCategory10);

		const links = data.links.map((d) => ({ ...d }));
		const nodes = data.nodes.map((d) => ({ ...d }));

		const simulation = d3
			.forceSimulation(nodes)
			.force(
				'link',
				d3.forceLink(links).id((d) => d.id)
			)
			.force('charge', d3.forceManyBody())
			.force('x', d3.forceX())
			.force('y', d3.forceY());

		const svg = d3
			.create('svg')
			.attr('width', width)
			.attr('height', height)
			.attr('viewBox', [-width / 2, -height / 2, width, height])
			.style('max-width', '100%');

		const link = svg
			.append('g')
			.attr('stroke', '#999')
			.attr('stroke-opacity', 0.6)
			.selectAll('line')
			.data(links)
			.join('line')
			.attr('stroke-width', (d) => Math.sqrt(d.value));

		const node = svg
			.append('g')
			.attr('stroke', '#fff')
			.attr('stroke-width', 1.5)
			.selectAll('circle')
			.data(nodes)
			.join('circle')
			.attr('r', 5)
			.attr('fill', (d) => color(d.group))
			.call(d3.drag().on('start', dragstarted).on('drag', dragged).on('end', dragended));

		node.append('title').text((d) => d.id);

		simulation.on('tick', () => {
			link
				.attr('x1', (d) => d.source.x)
				.attr('y1', (d) => d.source.y)
				.attr('x2', (d) => d.target.x)
				.attr('y2', (d) => d.target.y);
			node.attr('cx', (d) => d.x).attr('cy', (d) => d.y);
		});

		function dragstarted(event) {
			if (!event.active) simulation.alphaTarget(0.3).restart();
			event.subject.fx = event.subject.x;
			event.subject.fy = event.subject.y;
		}
		function dragged(event) {
			event.subject.fx = event.x;
			event.subject.fy = event.y;
		}
		function dragended(event) {
			if (!event.active) simulation.alphaTarget(0);
			event.subject.fx = null;
			event.subject.fy = null;
		}

		return svg.node();
	}

	onMount(async () => {
		const data = await loadData();
		const svgNode = chart(data);
		element.appendChild(svgNode);
	});
</script>

<div bind:this={element} class="h-[680px] w-full"></div>
