<script>
	import { onMount } from 'svelte';
	import * as d3 from 'd3';

	let element;
	let tooltipEl;
	// selectedNode replaced with nodeStack system
	// pdfLoading and showPdfFrame removed - handled per node now
	let learnedNodes = new Set();
	
	// Idle animation variables
	let simulation;
	let idleTime = 0;
	let idleAnimationId;
	


	async function loadData() {
		return fetch('/merged_graph.json').then((r) => r.json());
	}

	function selectNode(node) {
		// Add to stack instead of setting selectedNode
		addToNodeStack(node);
		
		// Center the graph on the selected node
		centerGraphOnNode(node);
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
	let linkSel; // Store link selection for updates
	let textSel; // Store text selection for updates
	let zoomBehavior; // Store zoom behavior for programmatic control
	let svgElement; // Store SVG element reference
	let focusedNode = null; // Currently focused node for dimming effect
	let connectedNodes = new Set(); // Set of nodes connected to focused node
	let graphData = null; // Store graph data for connection analysis
	let nodeStack = []; // Stack of open nodes for layered interface

	let activeSectionId = null;

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
				.transition()
				.duration(300)
				.attr('fill', (d) => {
					// Determine base color (learned vs unlearned)
					let baseColor;
					if (d.type === 'paper') {
						baseColor = learnedNodes.has(d.id) ? '#BFCAF3' : '#8A9BB8';
					} else {
						const domainColor = getDomainColor(d.domain || 'tech');
						baseColor = learnedNodes.has(d.id) ? domainColor : dimColor(domainColor);
					}
					
					// Apply focus dimming by darkening color much more aggressively
					if (focusedNode && !connectedNodes.has(d.id)) {
						return veryDimColor(baseColor); // Very dark for unconnected nodes
					}
					return baseColor;
				})
				.attr('stroke', (d) => {
					// Determine base stroke color (learned vs unlearned)
					let baseColor;
					if (d.type === 'paper') {
						baseColor = learnedNodes.has(d.id) ? '#BFCAF3' : '#8A9BB8';
					} else {
						const domainColor = getDomainColor(d.domain || 'tech');
						baseColor = learnedNodes.has(d.id) ? domainColor : dimColor(domainColor);
					}
					
					// Apply focus dimming by darkening color much more aggressively
					if (focusedNode && !connectedNodes.has(d.id)) {
						return veryDimColor(baseColor); // Very dark for unconnected nodes
					}
					return baseColor;
				})
				.attr('stroke-width', (d) => {
					// Reduce stroke width for focused-out nodes
					let baseWidth = learnedNodes.has(d.id) ? 3 : 1.5;
					if (focusedNode && !connectedNodes.has(d.id)) {
						return Math.max(0.5, baseWidth * 0.5); // Thinner stroke for dimmed nodes
					}
					return baseWidth;
				})
				.style('filter', (d) => {
					// Only show glow on learned nodes that aren't dimmed by focus
					if (focusedNode && !connectedNodes.has(d.id)) {
						return null; // No glow for focused-out nodes
					}
					if (d.type === 'paper') return learnedNodes.has(d.id) ? 'drop-shadow(0 0 6px #BFCAF3)' : null;
					const domainColor = getDomainColor(d.domain || 'tech');
					return learnedNodes.has(d.id) ? `drop-shadow(0 0 6px ${domainColor})` : null;
				});
		}
		
		// Update link opacity based on focus
		if (linkSel) {
			linkSel
				.transition()
				.duration(300)
				.style('opacity', (d) => {
					if (!focusedNode) return 1; // No focus, show all links
					
					// Show links that connect to the focused node or between connected nodes
					const sourceConnected = connectedNodes.has(d.source.id || d.source);
					const targetConnected = connectedNodes.has(d.target.id || d.target);
					if (sourceConnected || targetConnected) {
						return 1; // Full opacity for connected links
					}
					return 0.05; // Very dim for other links
				});
		}
		
		// Update text styling based on focus
		if (textSel) {
			textSel
				.transition()
				.duration(300)
				.attr('font-size', (d) => {
					// Make text larger for connected nodes when focused
					if (focusedNode && connectedNodes.has(d.id)) {
						return '8px'; // Larger font for connected nodes
					}
					return '6px'; // Normal font size
				})
				.attr('fill', (d) => {
					if (!focusedNode) {
						return '#333333'; // Default gray text when no focus
					}
					
					if (connectedNodes.has(d.id)) {
						return '#CCCCCC'; // Light gray text for connected nodes
					} else {
						return '#444444'; // Dimmed but still visible text for unconnected nodes
					}
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

	// Helper function to very aggressively dim colors for focused-out nodes using RGB
	function veryDimColor(color) {
		// Convert hex to RGB, reduce brightness aggressively, convert back
		const hex = color.replace('#', '');
		const r = parseInt(hex.substr(0, 2), 16);
		const g = parseInt(hex.substr(2, 2), 16);
		const b = parseInt(hex.substr(4, 2), 16);
		
		// Reduce brightness by ~75% (keep 25% of original)
		const dimR = Math.round(r * 0.25);
		const dimG = Math.round(g * 0.25);
		const dimB = Math.round(b * 0.25);
		
		return `#${dimR.toString(16).padStart(2, '0')}${dimG.toString(16).padStart(2, '0')}${dimB.toString(16).padStart(2, '0')}`;
	}

	function chart(data) {
		const width = 928;
		const height = 680;

		// Store graph data for connection analysis
		graphData = data;

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

		// Simulation with domain-aware clustering
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
						// Domain-based positioning with relation override
						const r = relationMap[d.id];
						
						// Math domain gets extra leftward positioning (deeper prerequisites)
						if (d.domain === 'math') {
							return -width / 2.5; // Math concepts go further left
						}
						
						// Standard relation-based positioning for other domains
						if (r === 'prerequisite') return -width / 4;
						if (r === 'advance') return width / 4;
						return 0;
					})
					.strength((d) => {
						// Stronger positioning force for math domain to separate from tech
						return d.domain === 'math' ? 0.15 : 0.1;
					})
			)
			.force(
				'y',
				d3
					.forceY((d) => {
						const r = relationMap[d.id];
						
						// Math domain gets slight downward offset for visual separation
						if (d.domain === 'math') {
							return height / 6; // Slight downward positioning
						}
						
						return r === 'lateral' ? height / 4 : 0;
					})
					.strength((d) => {
						return d.domain === 'math' ? 0.12 : 0.1;
					})
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
				
				// Store zoom level for tooltip logic
				window.currentZoomScale = scale;
			});

		svg.call(zoom);
		
		// Store references for programmatic zoom control
		zoomBehavior = zoom;
		svgElement = svg.node();
		
		// Add click handler to clear focus when clicking on empty space
		svg.on('click', () => {
			focusedNode = null;
			connectedNodes.clear();
			updateNodeStyles();
		});

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
		const linkGroup = g.append('g').attr('stroke-opacity', 0.6);
		
		// Regular links
		linkSel = linkGroup
			.selectAll('line.regular-link')
			.data(links)
			.join('line')
			.attr('class', 'regular-link')
			.attr('stroke-width', (d) => Math.sqrt(d.value || 1))
			.attr('stroke', (d) => linkColor(d.relation));
		
		// Add shooting star effects for prerequisite links
		const prerequisiteLinks = links.filter(link => link.relation === 'prerequisite');
		
		prerequisiteLinks.forEach((link, index) => {
			// Create gradient for each shooting star
			const gradientId = `shooting-star-gradient-${index}`;
			const gradient = svg.append('defs').append('linearGradient')
				.attr('id', gradientId)
				.attr('gradientUnits', 'userSpaceOnUse');
			
			// Create gradient stops for shooting star effect (much longer trail)
			gradient.append('stop')
				.attr('offset', '0%')
				.attr('stop-color', '#ffffff')
				.attr('stop-opacity', 0);
			
			gradient.append('stop')
				.attr('offset', '10%')
				.attr('stop-color', '#ffffff')
				.attr('stop-opacity', 0.5);
				
			gradient.append('stop')
				.attr('offset', '50%')
				.attr('stop-color', '#ffffff')
				.attr('stop-opacity', 0.9);
				
			gradient.append('stop')
				.attr('offset', '90%')
				.attr('stop-color', '#ffffff')
				.attr('stop-opacity', 0.5);
			
			gradient.append('stop')
				.attr('offset', '100%')
				.attr('stop-color', '#ffffff')
				.attr('stop-opacity', 0);
			
			// Create shooting star line (overlay on regular edge)
			const starLine = linkGroup
				.append('line')
				.attr('class', 'star-line')
				.attr('stroke-width', Math.sqrt(link.value || 1)) // Same thickness as regular edge
				.attr('stroke', `url(#${gradientId})`)
				.attr('opacity', 0.5);
			
			// Store references
			link.starLine = starLine;
			link.gradientId = gradientId;
			link.gradient = gradient;
		});

		// Draw nodes & attach events
		nodeSel = g
			.append('g')
			.selectAll('circle')
			.data(nodes)
			.join('circle')
			.attr('r', (d) => d.type === 'paper' ? 12 : 8) // Larger radius for research papers
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
			.attr('stroke-width', 1.5)
			.attr('cursor', 'pointer')
			.call(d3.drag().on('start', dragstarted).on('drag', dragged).on('end', dragended))
			.on('mouseover', (event, d) => {
				// Only show tooltip if zoom level is below text threshold (labels not visible)
				if (!window.currentZoomScale || window.currentZoomScale < 1.5) {
					d3.select(tooltipEl).classed('hidden', false).text(d.label);
				}
				
				// Scale up the hovered node
				d3.select(event.target)
					.transition()
					.duration(150)
					.attr('r', (d.type === 'paper' ? 12 : 8) * 1.15); // 15% bigger
			})
			.on('mousemove', (event) => {
				d3.select(tooltipEl)
					.style('left', event.pageX + 10 + 'px')
					.style('top', event.pageY + 10 + 'px');
			})
			.on('mouseout', (event, d) => {
				// Always hide tooltip on mouseout
				d3.select(tooltipEl).classed('hidden', true);
				
				// Scale back down to original size
				d3.select(event.target)
					.transition()
					.duration(150)
					.attr('r', d.type === 'paper' ? 12 : 8); // Back to original size
			})
			.on('click', (event, d) => {
				event.stopPropagation();
				selectNode(d);
			});

		// Add text labels for nodes (excluding papers)
		textSel = g
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
			// Update regular links
			g
				.selectAll('line.regular-link')
				.attr('x1', (d) => d.source.x)
				.attr('y1', (d) => d.source.y)
				.attr('x2', (d) => d.target.x)
				.attr('y2', (d) => d.target.y);
			
			// Update shooting star links
			prerequisiteLinks.forEach(link => {
				if (link.starLine && link.gradient) {
					// Update gradient coordinates
					link.gradient
						.attr('x1', link.source.x)
						.attr('y1', link.source.y)
						.attr('x2', link.target.x)
						.attr('y2', link.target.y);
					
					// Update shooting star line
					link.starLine
						.attr('x1', link.source.x)
						.attr('y1', link.source.y)
						.attr('x2', link.target.x)
						.attr('y2', link.target.y);
				}
			});
			
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

		// Start shooting star animation
		startShootingStarAnimation(prerequisiteLinks);

		return svg.node();
	}

	function startShootingStarAnimation(prerequisiteLinks) {
		function animate() {
			prerequisiteLinks.forEach((link, index) => {
				if (link.gradient) {
					// Only animate if no node is focused OR this link is directly connected to the focused node
					const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
					const targetId = typeof link.target === 'object' ? link.target.id : link.target;
					const shouldAnimate = !focusedNode || 
						sourceId === focusedNode.id || 
						targetId === focusedNode.id;
					
					if (shouldAnimate) {
						// Animate with "zip" easing - slow, fast, slow (with 0.5s pause)
						const time = (Date.now() * 0.002) % 2; // 2 second cycle (1.5s animation + 0.5s pause)
						const rawProgress = time < 1.5 ? time / 1.5 : 1; // Animation for first 1.5s, then hold at end
						
						// Apply dramatic easing curve for "zip" effect: very slow -> current speed -> very slow
						const progress = rawProgress < 0.2 
							? Math.pow(rawProgress / 0.2, 4) * 0.10 // Very slow start (quartic ease - covers 5% of distance)
							: rawProgress < 0.8 
							? 0.05 + (rawProgress - 0.2) / 0.6 * 0.8 // Current speed middle section (covers 90% of distance)
							: 0.95 + Math.pow((rawProgress - 0.8) / 0.2, 4) * 0.1; // Very slow end (quartic ease - covers 5% of distance)
						
						// Move the centered gradient along the line
						const centerPos = (progress * 120 - 10) + '%'; // Move from -10% to 110%
						const startPos = (progress * 120 - 15) + '%';  // 5% before center
						const endPos = (progress * 120 - 5) + '%';     // 5% after center
						
						// Update gradient stops with centered positions
						link.gradient.selectAll('stop')
							.attr('offset', (d, i) => {
								if (i === 0) return Math.max(0, progress * 120 - 20) + '%';
								if (i === 1) return Math.max(0, progress * 120 - 7.5) + '%'; // 45% before center
								if (i === 2) return Math.max(0, Math.min(100, progress * 120 - 5)) + '%'; // Center
								if (i === 3) return Math.min(100, progress * 120 - 2.5) + '%'; // 55% after center  
								if (i === 4) return Math.min(100, progress * 120) + '%';
								return '0%';
							});
					} else {
						// Stop animation by setting a static state (no shooting star visible)
						link.gradient.selectAll('stop')
							.attr('offset', (d, i) => {
								if (i === 0) return '0%';
								if (i === 1) return '0%';
								if (i === 2) return '0%';
								if (i === 3) return '0%';
								if (i === 4) return '0%';
								return '0%';
							});
					}
				}
			});
			
			requestAnimationFrame(animate);
		}
		animate();
	}



	// Helper to slugify header text for IDs
	function slugify(text) {
		return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
	}

	// Function to extract all section headers and their IDs from content
	export function extractSectionHeaders(content) {
		const headers = [];
		const headerRegex = /^(####|###|##|#) (.+)$/gm;
		let match;
		while ((match = headerRegex.exec(content)) !== null) {
			const level = match[1].length;
			const text = match[2];
			headers.push({
				level,
				text,
				id: slugify(text)
			});
		}
		return headers;
	}

	// Function to parse node links and markdown in content
	function parseNodeLinks(content) {
		// First, parse markdown
		let processedContent = content
			// Convert headers (#### to h4, ### to h3, ## to h2, # to h1) with IDs
			.replace(/^#### (.+)$/gm, (m, t) => `<h4 id="${slugify(t)}" class="text-base font-semibold mb-2 mt-3" style="color: #D0D0D0;">${t}</h4>`)
			.replace(/^### (.+)$/gm, (m, t) => `<h3 id="${slugify(t)}" class="text-lg font-semibold mb-2 mt-4" style="color: #E0E0E0;">${t}</h3>`)
			.replace(/^## (.+)$/gm, (m, t) => `<h2 id="${slugify(t)}" class="text-xl font-bold mb-3 mt-6" style="color: #F0F0F0;">${t}</h2>`)
			.replace(/^# (.+)$/gm, (m, t) => `<h1 id="${slugify(t)}" class="text-2xl font-bold mb-4 mt-8" style="color: #FFFFFF;">${t}</h1>`)
			// Convert bold text (**text** to <strong>)
			.replace(/\*\*(.+?)\*\*/g, '<strong style="color: #FFFFFF;">$1</strong>')
			// Convert italic text (*text* to <em>)
			.replace(/\*(.+?)\*/g, '<em style="color: #CCCCCC;">$1</em>')
			// Convert LaTeX math blocks ($$...$$ to <div> with math styling)
			.replace(/\$\$([\s\S]*?)\$\$/g, '<div class="bg-gray-900 p-4 rounded mb-4 overflow-x-auto text-center" style="border: 1px solid #333333;"><span style="color: #E0E0E0; font-family: \'Times New Roman\', serif; font-size: 1.1em;">$$1</span></div>')
			// Convert inline LaTeX math ($...$ to <span> with math styling)
			.replace(/\$([^$\n]+?)\$/g, '<span style="color: #E0E0E0; font-family: \'Times New Roman\', serif; font-style: italic;">$$1</span>')
			// Convert code blocks (```math to <pre><code>)
			.replace(/```math\n([\s\S]*?)\n```/g, '<pre class="bg-gray-900 p-3 rounded mb-3 overflow-x-auto"><code style="color: #E0E0E0; font-family: monospace;">$1</code></pre>')
			// Convert inline code (`code` to <code>)
			.replace(/`([^`]+)`/g, '<code class="bg-gray-800 px-1 rounded" style="color: #E0E0E0; font-family: monospace;">$1</code>')
			// Convert lists (- item to <li>)
			.replace(/^- (.+)$/gm, '<li class="ml-4 mb-1">$1</li>')
			// Wrap consecutive <li> elements in <ul>
			.replace(/(<li[^>]*>.*<\/li>)/gs, '<ul class="mb-3">$1</ul>')
			// Convert numbered lists (1. item to <li>)
			.replace(/^\d+\. (.+)$/gm, '<li class="ml-4 mb-1">$1</li>')
			// Convert line breaks to <br>
			.replace(/\n\n/g, '<br><br>')
			.replace(/\n/g, '<br>');

		// Then, parse node links
		return processedContent.replace(/<node id="(\d+)">([^<]+)<\/node>/g, (match, id, text) => {
			const nodeId = parseInt(id);
			const node = graphData?.nodes?.find(n => n.id === nodeId);
			if (node) {
				const color = node.type === 'paper' ? '#BFCAF3' : getDomainColor(node.domain || 'tech');
				return `<span 
					class="cursor-pointer hover:opacity-80 transition-all duration-200" 
					style="display: inline-flex; align-items: center; background: ${color}18; border: 1px solid ${color}4D; border-radius: 5px; padding: 0px 3px; margin: 2px 0; color: ${color}; font-weight: 500;"
					onclick="selectNodeById(${nodeId})"
				>${text}</span>`;
			}
			return text;
		});
	}

	// Function to select a node by ID (for node links)
	function selectNodeById(nodeId) {
		// Get the live node from the simulation with current x,y coordinates
		if (typeof window !== 'undefined' && window.simulation) {
			const liveNodes = window.simulation.nodes();
			const liveNode = liveNodes.find(n => n.id === nodeId);
			
			if (liveNode) {
				// Add to the stack first (same order as selectNode)
				addToNodeStack(liveNode);
				
				// Then center the graph on the selected node
				centerGraphOnNode(liveNode);
			}
		}
	}

	// Function to center the graph on a specific node (restored original logic)
	function centerGraphOnNode(node) {
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
	}

	// Function to add a node to the stack
	function addToNodeStack(node) {
		// Focus on the node for graph effects
		focusedNode = node;
		connectedNodes.clear();
		connectedNodes.add(node.id);
		
		// Find all directly connected nodes
		if (graphData) {
			graphData.links.forEach(link => {
				if (link.source.id === node.id || link.source === node.id) {
					connectedNodes.add(link.target.id || link.target);
				}
				if (link.target.id === node.id || link.target === node.id) {
					connectedNodes.add(link.source.id || link.source);
				}
			});
		}
		
		// Mark as learned
		learnedNodes.add(node.id);
		
		// Add to stack (remove if already exists to avoid duplicates)
		nodeStack = nodeStack.filter(n => n.id !== node.id);
		nodeStack = [...nodeStack, node];
		
		// Update node styles
		updateNodeStyles();
	}

	// Function to remove a node from the stack
	function removeFromStack(nodeId) {
		nodeStack = nodeStack.filter(n => n.id !== nodeId);
		
		// If stack is empty, clear focus
		if (nodeStack.length === 0) {
			focusedNode = null;
			connectedNodes.clear();
		} else {
			// Focus on the top node in the stack
			const topNode = nodeStack[nodeStack.length - 1];
			focusedNode = topNode;
			connectedNodes.clear();
			connectedNodes.add(topNode.id);
			
			// Find connected nodes for the top node
			if (graphData) {
				graphData.links.forEach(link => {
					if (link.source.id === topNode.id || link.source === topNode.id) {
						connectedNodes.add(link.target.id || link.target);
					}
					if (link.target.id === topNode.id || link.target === topNode.id) {
						connectedNodes.add(link.source.id || link.source);
					}
				});
			}
			
			// Center the graph on the new top node
			centerGraphOnNode(topNode);
		}
		
		updateNodeStyles();
	}

	// Make function available globally for onclick handlers (client-side only)
	if (typeof window !== 'undefined') {
		window.selectNodeById = selectNodeById;
	}

	onMount(async () => {
		const data = await loadData();
		element.innerHTML = '';
		element.appendChild(chart(data));
	});
</script>

<!-- CSS Animations for shooting stars -->
<style>
	@keyframes shooting-star-0 {
		0% { 
			mask-position: -100% 0;
			-webkit-mask-position: -100% 0;
		}
		100% { 
			mask-position: 100% 0;
			-webkit-mask-position: 100% 0;
		}
	}
	
	@keyframes shooting-star-1 {
		0% { 
			mask-position: -100% 0;
			-webkit-mask-position: -100% 0;
		}
		100% { 
			mask-position: 100% 0;
			-webkit-mask-position: 100% 0;
		}
	}
	
	@keyframes shooting-star-2 {
		0% { 
			mask-position: -100% 0;
			-webkit-mask-position: -100% 0;
		}
		100% { 
			mask-position: 100% 0;
			-webkit-mask-position: 100% 0;
		}
	}
</style>

<!-- Cyberpunk theme main container with side-by-side layout -->
<main class="relative h-screen w-screen flex" style="background-color: #080808; color: #B3B3B3;">
	<!-- Tooltip -->
	<div
		bind:this={tooltipEl}
		class="pointer-events-none absolute hidden rounded p-2 text-sm shadow-lg z-50"
		style="background-color: #080808; border: 1px solid #333333;"
	></div>

	<!-- Graph container - left side or full width -->
	<div class="{nodeStack.length > 0 ? 'w-1/2' : 'w-full'} h-full transition-all duration-150">
		<div bind:this={element} class="h-full w-full"></div>
	</div>

	<!-- Stacked Node Preview panels - right side -->
	{#if nodeStack.length > 0}
		<div class="w-1/2 h-full relative" style="background-color: rgba(8, 8, 8, 0.0);">
			{#each nodeStack as node, index (node.id)}
				<div 
					class="absolute inset-0 transition-all duration-300"
					style="
						top: 0;
						left: 0;
						right: {index * 18}px;
						bottom: 0;
						z-index: {10 + index};
					"
				>
					<div class="h-full p-6">
						<div 
							class="h-full rounded-2xl overflow-hidden shadow-lg"
							style="background-color: #111111; border: 1px solid #333333;"
						>
							<div class="h-full overflow-hidden">
								{#if node.type === 'paper' && node.content}
									<!-- Custom formatted content for papers -->
									<div class="h-full flex flex-col">
										<div class="flex items-center justify-between p-6">
											<h2 class="text-2xl font-bold" style="color: #BFCAF3;">{node.label}</h2>
											<button
												on:click={() => removeFromStack(node.id)}
												class="w-8 h-8 rounded-full flex items-center justify-center text-[#333333] hover:text-white hover:text-[#3F3F3F] transition-colors"
												aria-label="Close"
											>
												✕
											</button>
										</div>
										
										<div class="flex-1 overflow-y-auto">
											<div class="px-6 pb-6">
												<!-- Link to original paper -->
												{#if node.content.original_paper_url}
													<div class="mb-6 p-4 rounded-lg" style="background-color: #1a1a1a; border: 1px solid #333333;">
														<div class="flex items-center gap-3">
															<div class="w-8 h-8 rounded-full flex items-center justify-center" style="background-color: #BFCAF3; color: #111111;">
																📄
															</div>
															<div>
																<div class="font-medium" style="color: #BFCAF3;">Original Paper</div>
																<a 
																	href="{node.content.original_paper_url}" 
																	target="_blank" 
																	rel="noopener noreferrer"
																	class="text-sm hover:underline"
																	style="color: #888888;"
																>
																	View on arXiv →
																</a>
															</div>
														</div>
													</div>
												{/if}

												<!-- Abstract -->
												{#if node.content.abstract}
													<div class="mb-6">
														<h3 class="text-lg font-semibold mb-3" style="color: #BFCAF3;">Abstract</h3>
														<div class="leading-relaxed" style="color: #B3B3B3;">
															{@html parseNodeLinks(node.content.abstract)}
														</div>
													</div>
												{/if}

												<!-- Introduction -->
												{#if node.content.introduction}
													<div class="mb-6">
														<h3 class="text-lg font-semibold mb-3" style="color: #BFCAF3;">Introduction</h3>
														<div class="leading-relaxed whitespace-pre-line" style="color: #B3B3B3;">
															{@html parseNodeLinks(node.content.introduction)}
														</div>
													</div>
												{/if}

												<!-- Model Architecture -->
												{#if node.content.model_architecture}
													<div class="mb-6">
														<h3 class="text-lg font-semibold mb-3" style="color: #BFCAF3;">Model Architecture</h3>
														<div class="leading-relaxed whitespace-pre-line" style="color: #B3B3B3;">
															{@html parseNodeLinks(node.content.model_architecture)}
														</div>
													</div>
												{/if}

												<!-- Why Self-Attention -->
												{#if node.content.why_self_attention}
													<div class="mb-6">
														<h3 class="text-lg font-semibold mb-3" style="color: #BFCAF3;">Why Self-Attention</h3>
														<div class="leading-relaxed whitespace-pre-line" style="color: #B3B3B3;">
															{@html parseNodeLinks(node.content.why_self_attention)}
														</div>
													</div>
												{/if}

												<!-- Training -->
												{#if node.content.training}
													<div class="mb-6">
														<h3 class="text-lg font-semibold mb-3" style="color: #BFCAF3;">Training</h3>
														<div class="leading-relaxed whitespace-pre-line" style="color: #B3B3B3;">
															{@html parseNodeLinks(node.content.training)}
														</div>
													</div>
												{/if}

												<!-- Results -->
												{#if node.content.results}
													<div class="mb-6">
														<h3 class="text-lg font-semibold mb-3" style="color: #BFCAF3;">Results</h3>
														<div class="leading-relaxed whitespace-pre-line" style="color: #B3B3B3;">
															{@html parseNodeLinks(node.content.results)}
														</div>
													</div>
												{/if}

												<!-- Conclusion -->
												{#if node.content.conclusion}
													<div class="mb-6">
														<h3 class="text-lg font-semibold mb-3" style="color: #BFCAF3;">Conclusion</h3>
														<div class="leading-relaxed whitespace-pre-line" style="color: #B3B3B3;">
															{@html parseNodeLinks(node.content.conclusion)}
														</div>
													</div>
												{/if}
											</div>
										</div>
									</div>
								{:else if node.type === 'paper' && node.url}
									<!-- PDF display for papers without formatted content -->
									<div class="h-full flex flex-col">
										<div class="flex items-center justify-between p-6">
											<h2 class="text-2xl font-bold" style="color: #BFCAF3;">{node.label}</h2>
											<button
												on:click={() => removeFromStack(node.id)}
												class="w-8 h-8 rounded-full flex items-center justify-center text-[#333333] hover:text-white hover:text-[#3F3F3F] transition-colors"
												aria-label="Close"
											>
												✕
											</button>
										</div>
										
										<div class="flex-1">
											<iframe 
												src="{node.url}#navpanes=0&scrollbar=0"
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
												<h2 class="text-2xl font-bold" style="color: {getDomainColor(node.domain)};">{node.label}</h2>
												<button
													on:click={() => removeFromStack(node.id)}
													class="w-8 h-8 rounded-full flex items-center justify-center text-[#333333] hover:text-white hover:text-[#3F3F3F] transition-colors"
													aria-label="Close"
												>
													✕
												</button>
											</div>
											<div class="flex items-center gap-2 mb-4">
												<span class="text-sm" style="color: #B3B3B3;">Difficulty: {node.difficulty}/5</span>
												<div class="flex">
													{#each Array(node.difficulty) as _}
														<div class="w-2 h-2 rounded-full mr-1" style="background-color: {getDomainColor(node.domain)};"></div>
													{/each}
													{#each Array(5 - node.difficulty) as _}
														<div class="w-2 h-2 rounded-full mr-1" style="background-color: #3A3F59;"></div>
													{/each}
												</div>
											</div>
										</div>

										<div class="mb-6">
											<h3 class="text-lg font-semibold mb-2" style="color: #B3B3B3;">Description</h3>
											<p class="leading-relaxed" style="color: #B3B3B3;">{node.description}</p>
										</div>
									</div>
								{/if}
							</div>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</main>
