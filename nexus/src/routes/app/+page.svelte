<script lang="ts">
	import Challenge from '../../components/Challenge.svelte';
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	import { cubicOut, cubicIn } from 'svelte/easing';
	import * as d3 from 'd3';
	import PaginatedContent from '../../components/PaginatedContent.svelte';
	import RankRevealModal from '../../components/RankRevealModal.svelte';
	import { supabase } from '$lib/supabaseClient';
	import { recommendedNodeStore } from '$lib/suggestionSystem';
	import { initializeSuggestionSystem } from '$lib/suggestionSystemInit';
	import {
		nodeStatusService,
		getNodeVisualState,
		calculateLinkVisualState,
		getDomainColor as getNodeDomainColor
	} from '$lib/nodeStatus';
	import { getSuggestionService } from '$lib/suggestionSystem';
	import { writable } from 'svelte/store';

	let challengeOpen = false;
	let challengeNode;
	let shouldShowOnboarding = false;
	let userBracket: string = '–';

	let startMs = 0;
	let elapsedMs = 0;
	let ticker: number | undefined;

	async function loadUserFromDb() {
		const { data: sessionData } = await supabase.auth.getSession();
		let user = sessionData.session?.user;
		console.log('user session', user);
		if (user) {
			const { data: userData, error } = await supabase
				.from('users')
				.select('bracket, recommendation')
				.eq('id', user?.id);
			console.log('user data', userData);
			if (error) {
				console.error('Error loading profile:', error);
			} else {
				userBracket = userData[0]?.bracket;
			}
		}
	}
	async function loadVisitedFromDb() {
		const { data: sessionData } = await supabase.auth.getSession();
		let user = sessionData.session?.user;
		if (user) {
			const { data, error } = await supabase
				.from('user_nodes')
				.select('node_id, exp, mastery')
				.eq('user_id', user?.id);

			if (error) {
				console.error('Error loading visited nodes:', error);
			} else {
				data.forEach((r) =>
					nodeStatusService.markAsVisited({ nodeId: r.node_id, mastery: r.mastery, exp: r.exp })
				);
			}
		}
	}
	async function addNodeToDB(node) {
		const existingStatus = nodeStatusService.getNodeStatus(node.id);
		if (existingStatus.mastery !== null) {
			// already visited (or inserted), just return the enriched node
			return {
				...node,
				exp: existingStatus.exp,
				mastery: existingStatus.mastery
			};
		}
		nodeStatusService.updateNodeStatus(node.id, {
			exp: 0,
			mastery: 0
		});
		updateNodeStyles();
		const { data: sessionData } = await supabase.auth.getSession();
		let user = sessionData.session?.user;
		if (!user) throw new Error('Not signed in');

		const { data, error } = await supabase.from('user_nodes').insert({
			user_id: user.id,
			node_id: node.id,
			exp: 0,
			mastery: 0
		});
		if (error) console.error(error);
		return {
			...node,
			exp: 0,
			mastery: 0
		};
	}

	function openChallenge(node: Node) {
		challengeOpen = true;
		challengeNode = node;
		startMs = performance.now();
		elapsedMs = 0;
		ticker = window.setInterval(() => {
			elapsedMs = performance.now() - startMs; // reactive var → UI can show it
		}, 1000);
	}
	async function updateNode(nodeId: string, exp: number) {
		const { data: session } = await supabase.auth.getSession();
		let user = session.session?.user;
		if (!user) throw new Error('Not signed in');
		const { data, error } = await supabase.functions.invoke('updateNodeProgress', {
			body: {
				node_id: nodeId,
				exp: exp,
				user_id: user.id
			}
		});
		console.log('data from edge function: ', data);
		if (data?.newBracket) {
			userBracket = data.newBracket;
		}
		nodeStatusService.updateNodeStatus(nodeId, {
			exp: data.newExp,
			mastery: data.newMastery
		});

		nodeStack = nodeStack.map((n) =>
			n.id === nodeId ? { ...n, exp: data.newExp, mastery: data.newMastery } : n
		);
		updateNodeStyles();
		if (error) console.error(error);
		return !error;
	}

	async function closeChallenge(e) {
		updateNode(challengeNode.id, e.expEarned);
		challengeOpen = false;
		if (ticker) clearInterval(ticker);
		const total = performance.now() - startMs;
		console.log('Updating mastery for: ', challengeNode.label);
		console.log('Exp Earned: ', e.expEarned);
		console.log('Challenge time (hh:mm:ss):', formatTime(total));
	}

	// helper
	function formatTime(ms: number) {
		const s = Math.floor(ms / 1000);
		const h = Math.floor(s / 3600);
		const m = Math.floor((s % 3600) / 60);
		const sec = s % 60;
		return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
	}

	const userProfileStore = writable(getSuggestionService().getUserProfile());

	let mergedGraph: { nodes: any[]; links: any[] } = { nodes: [], links: [] };
	let mergedGraphLoaded = false;

	function updateUserProfileDebug() {
		const suggestionService = getSuggestionService();
		const userProfile = suggestionService.getUserProfile();
		userProfileStore.set(userProfile);
	}

	// Listen for node visit events (assuming you have a function or event for this)
	//SUGGESTIONS
	function onNodeVisited(nodeId: string) {
		const suggestionService = getSuggestionService();
		suggestionService.updateAfterNodeVisit(nodeId);
		updateUserProfileDebug();
	}

	async function loadMergedGraph() {
		try {
			const res = await fetch('/glicko.json');
			if (res.ok) {
				mergedGraph = await res.json();
				mergedGraphLoaded = true;
				updateUserProfileDebug();
			}
		} catch {}
	}

	let element: any;
	let tooltipEl: any;

	function selectNode(node: any) {
		// Add to stack instead of setting selectedNode
		addToNodeStack(node);
		// Center the graph on the selected node
		centerGraphOnNode(node);
		updateNodeStyles();
	}

	let nodeSel: any; // Store node selection for updates
	let linkSel: any; // Store link selection for updates
	let textSel: any; // Store text selection for updates
	let zoomBehavior: any; // Store zoom behavior for programmatic control
	let svgElement: any; // Store SVG element reference
	let focusedNode: any = null; // Currently focused node for dimming effect
	let connectedNodes = new Set(); // Set of nodes connected to focused node
	let graphData: any = null; // Store graph data for connection analysis
	let nodeStack: any[] = []; // Stack of open nodes for layered interface
	let navigationHistory: any[] = []; // Chronological order of node clicks (for breadcrumb)

	// Always use sequential shooting stars
	const useSequentialShootingStars = true;

	let showRankModal = false;
	let rankNodesVisited = 0;

	// Store last calculated rank for inline display
	let userRank: { tier: string; division: number | null } = { tier: '', division: null };

	let userEmail = '';
	let sessionObj = null;

	if (typeof window !== 'undefined') {
		try {
			// Supabase v2 stores the session as a JSON string under this key
			const sessionStr = window.localStorage.getItem('supabase.auth.token');
			if (sessionStr) {
				sessionObj = JSON.parse(sessionStr);
				// The structure is { currentSession: { user: { email: ... } } }
				userEmail = sessionObj?.currentSession?.user?.email || '';
			}
		} catch (e) {
			userEmail = '';
		}
	}
	if (!userEmail) userEmail = 'user@email.com'; // fallback placeholder

	async function handleLogout() {
		await supabase.auth.signOut();
		window.location.href = '/';
	}

	function updateNodeStyles() {
		if (nodeSel) {
			nodeSel
				.transition()
				.duration(300)
				.attr('fill', (d: any) => {
					// Get visual state using new calculation functions
					const visualState = getNodeVisualState(d.id, d.domain || 'tech', d.type || 'concept');
					let baseColor = visualState.baseColor;

					// Apply focus dimming by darkening color much more aggressively
					if (focusedNode && !connectedNodes.has(d.id)) {
						return veryDimColor(baseColor); // Very dark for unconnected nodes
					}
					return baseColor;
				})
				.attr('stroke', (d: any) => {
					// Get visual state using new calculation functions
					const visualState = getNodeVisualState(d.id, d.domain || 'tech', d.type || 'concept');
					let baseColor = visualState.strokeColor;

					// Apply focus dimming by darkening color much more aggressively
					if (focusedNode && !connectedNodes.has(d.id)) {
						return veryDimColor(baseColor); // Very dark for unconnected nodes
					}
					return baseColor;
				})
				.attr('stroke-width', (d: any) => {
					// Get visual state using new calculation functions
					const visualState = getNodeVisualState(d.id, d.domain || 'tech', d.type || 'concept');
					let baseWidth = visualState.strokeWidth;

					// Reduce stroke width for focused-out nodes
					if (focusedNode && !connectedNodes.has(d.id)) {
						return Math.max(0.5, baseWidth * 0.5); // Thinner stroke for dimmed nodes
					}
					return baseWidth;
				})
				.style('filter', (d: any) => {
					// Only show glow on nodes that aren't dimmed by focus
					if (focusedNode && !connectedNodes.has(d.id)) {
						return null; // No glow for focused-out nodes
					}

					// Get visual state using new calculation functions
					const visualState = getNodeVisualState(d.id, d.domain || 'tech', d.type || 'concept');
					return visualState.glowEffect;
				});
		}

		// Update link opacity and glow effects based on focus and visited status
		if (linkSel) {
			linkSel
				.transition()
				.duration(300)
				.style('opacity', (d: any) => {
					if (!focusedNode) return 1; // No focus, show all links

					// Show links that connect to the focused node or between connected nodes
					const sourceConnected = connectedNodes.has(d.source.id || d.source);
					const targetConnected = connectedNodes.has(d.target.id || d.target);
					if (sourceConnected || targetConnected) {
						return 1; // Full opacity for connected links
					}
					return 0.05; // Very dim for other links
				})
				.style('filter', (d: any) => {
					// Use new link visual state calculation functions
					const sourceNode = graphData?.nodes?.find(
						(n: { id: string | number }) => n.id === (d.source.id || d.source)
					);
					const targetNode = graphData?.nodes?.find(
						(n: { id: string | number }) => n.id === (d.target.id || d.target)
					);

					const linkState = calculateLinkVisualState(
						d.source.id || d.source,
						d.target.id || d.target,
						sourceNode?.domain || 'tech',
						sourceNode?.type || 'concept'
					);

					// Enhanced glow for mastered connections
					if (linkState.glowEffect) {
						return `drop-shadow(0 0 8px ${linkState.glowEffect.match(/#[0-9A-Fa-f]{6}/)?.[0] || '#73DACA'}) drop-shadow(0 0 4px ${linkState.glowEffect.match(/#[0-9A-Fa-f]{6}/)?.[0] || '#73DACA'})`;
					}

					return null; // No glow for non-mastered connections
				})
				.attr('stroke-width', (d: any) => {
					// Use new link visual state calculation functions
					const sourceNode = graphData?.nodes?.find(
						(n: { id: string | number }) => n.id === (d.source.id || d.source)
					);
					const linkState = calculateLinkVisualState(
						d.source.id || d.source,
						d.target.id || d.target,
						sourceNode?.domain || 'tech',
						sourceNode?.type || 'concept'
					);

					// Use calculated stroke width, but scale with link value
					const baseWidth = Math.sqrt(d.value || 1);
					return linkState.strokeWidth > 1.5 ? baseWidth * 1.5 : baseWidth;
				});
		}

		// Update text styling based on focus
		if (textSel) {
			textSel
				.transition()
				.duration(300)
				.attr('font-size', (d: any) => {
					// Make text larger for connected nodes when focused
					if (focusedNode && connectedNodes.has(d.id)) {
						return '8px'; // Larger font for connected nodes
					}
					return '6px'; // Normal font size
				})
				.attr('fill', (d: any) => {
					if (!focusedNode) {
						return '#CCCCCC'; // Lighter default text when no focus
					}

					if (connectedNodes.has(d.id)) {
						return '#F0F0F0'; // Very bright text for connected nodes
					} else {
						return '#444444'; // Light gray text for unconnected nodes
					}
				});
		}
	}

	// Helper function to very aggressively dim colors for focused-out nodes using RGB
	function veryDimColor(color: any) {
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

	function chart(data: any) {
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
		const nodes = data.nodes.map((d: any) => ({ ...d }));
		console.log('nodes: ', nodes);
		const links = data.links.map((d: any) => ({ ...d }));

		// Map central relations
		const centralId = 0;
		const relationMap: Record<string, string> = {};
		links.forEach((l: any) => {
			if (l.source === centralId) relationMap[l.target as string] = l.relation;
			else if (l.target === centralId) relationMap[l.source as string] = l.relation;
		});

		// Simulation with domain-aware clustering
		const simulation = d3
			.forceSimulation(nodes)
			.force(
				'link',
				d3
					.forceLink(links)
					.id((d: any) => d.id)
					.distance(100)
			)
			.force('charge', d3.forceManyBody().strength(-200))
			.force('center', d3.forceCenter(0, 0))
			.force(
				'x',
				d3
					.forceX((d: any) => {
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
					.strength((d: any) => {
						// Stronger positioning force for math domain to separate from tech
						return d.domain === 'math' ? 0.15 : 0.1;
					})
			)
			.force(
				'y',
				d3
					.forceY((d: any) => {
						const r = relationMap[d.id];

						// Math domain gets slight downward offset for visual separation
						if (d.domain === 'math') {
							return height / 6; // Slight downward positioning
						}

						return r === 'lateral' ? height / 4 : 0;
					})
					.strength((d: any) => {
						return d.domain === 'math' ? 0.12 : 0.1;
					})
			)
			.force(
				'collide',
				d3
					.forceCollide()
					.radius((d: any) => {
						const base = d.type === 'paper' ? 12 : 8;
						return base + 20;
					})
					.strength(0.8)
			);

		// Create SVG with zoom behavior
		const svg = d3
			.create('svg')
			.attr('width', '100%')
			.attr('height', '100%')
			.attr('viewBox', [-width / 2, -height / 2, width, height])
			.attr('preserveAspectRatio', 'xMidYMid meet');

		// Add zoom behavior
		const zoom = d3
			.zoom()
			.scaleExtent([0.1, 10])
			.on('zoom', (event) => {
				g.attr('transform', event.transform);

				// Smooth fade-in text labels based on zoom level
				const scale = event.transform.k;
				const fadeStartZoom = 0.8; // Start fading in at 0.8x zoom
				const fadeEndZoom = 1.5; // Full brightness at 1.5x zoom

				let opacity = 0;
				if (scale >= fadeEndZoom) {
					opacity = 1; // Full brightness
				} else if (scale >= fadeStartZoom) {
					// Smooth transition from 0 to 1
					opacity = (scale - fadeStartZoom) / (fadeEndZoom - fadeStartZoom);
				}

				// Update text opacity and colors, respecting focus state
				svg.selectAll('text').each(function (d: any) {
					const textElement = d3.select(this);
					textElement.style('opacity', opacity);

					// Only update color if no node is focused, otherwise let updateNodeStyles handle it
					if (!focusedNode) {
						// Calculate brightness based on opacity for default state
						const minBrightness = 0x22; // #222222
						const maxBrightness = 0xf0; // #F0F0F0
						const brightness = Math.round(
							minBrightness + (maxBrightness - minBrightness) * opacity
						);
						const textColor = `#${brightness.toString(16).padStart(2, '0').repeat(3)}`;
						textElement.attr('fill', textColor);
					} else {
						// When focused, use the focus-based colors from updateNodeStyles
						if (connectedNodes.has(d.id)) {
							textElement.attr('fill', '#F0F0F0'); // Very bright text for connected nodes
						} else {
							textElement.attr('fill', '#444444'); // Dim text for unconnected nodes
						}
					}
				});

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
		svg
			.append('rect')
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
			.attr('stroke-width', (d: any) => Math.sqrt(d.value || 1))
			.attr('stroke', (d: any) => linkColor(d.relation))
			.attr('stroke-opacity', 0.22); // More transparent

		// Add shooting star effects for prerequisite links
		const prerequisiteLinks = links.filter((link) => link.relation === 'prerequisite');

		prerequisiteLinks.forEach((link: any, index: number) => {
			// Create gradient for each shooting star
			const gradientId = `shooting-star-gradient-${index}`;
			const gradient = svg
				.append('defs')
				.append('linearGradient')
				.attr('id', gradientId)
				.attr('gradientUnits', 'userSpaceOnUse');

			// Create gradient stops for shooting star effect (much longer trail)
			gradient
				.append('stop')
				.attr('offset', '0%')
				.attr('stop-color', '#ffffff')
				.attr('stop-opacity', 0);

			gradient
				.append('stop')
				.attr('offset', '10%')
				.attr('stop-color', '#ffffff')
				.attr('stop-opacity', 0.5);

			gradient
				.append('stop')
				.attr('offset', '50%')
				.attr('stop-color', '#ffffff')
				.attr('stop-opacity', 0.9);

			gradient
				.append('stop')
				.attr('offset', '90%')
				.attr('stop-color', '#ffffff')
				.attr('stop-opacity', 0.5);

			gradient
				.append('stop')
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
			.attr('r', (d: any) => (d.type === 'paper' ? 12 : 8)) // Larger radius for research papers
			.attr('fill', (d: any) => {
				// Use new visual state calculation functions
				const visualState = getNodeVisualState(d.id, d.domain || 'tech', d.type || 'concept');
				return visualState.baseColor;
			})
			.attr('stroke', (d: any) => {
				// Use new visual state calculation functions
				const visualState = getNodeVisualState(d.id, d.domain || 'tech', d.type || 'concept');
				return visualState.strokeColor;
			})
			.attr('stroke-width', (d: any) => {
				// Use new visual state calculation functions
				const visualState = getNodeVisualState(d.id, d.domain || 'tech', d.type || 'concept');
				return visualState.strokeWidth;
			})
			.style('filter', (d: any) => {
				// Use new visual state calculation functions
				const visualState = getNodeVisualState(d.id, d.domain || 'tech', d.type || 'concept');
				return visualState.glowEffect;
			})
			.attr('cursor', 'pointer')
			.call(d3.drag().on('start', dragstarted).on('drag', dragged).on('end', dragended))
			.on('mouseover', (event, d: any) => {
				// Only show tooltip if zoom level is below text threshold (labels not visible)
				if (!window.currentZoomScale || window.currentZoomScale < 1.5) {
					d3.select(tooltipEl).classed('hidden', false).text(d.label);
				}

				// Scale up the hovered node
				d3.select(event.target)
					.transition()
					.duration(150)
					.attr('r', (d: any) => (d.type === 'paper' ? 12 : 8) * 1.15); // 15% bigger
			})
			.on('mousemove', (event) => {
				d3.select(tooltipEl)
					.style('left', event.pageX + 10 + 'px')
					.style('top', event.pageY + 10 + 'px');
			})
			.on('mouseout', (event, d: any) => {
				// Always hide tooltip on mouseout
				d3.select(tooltipEl).classed('hidden', true);

				// Scale back down to original size
				d3.select(event.target)
					.transition()
					.duration(150)
					.attr('r', d.type === 'paper' ? 12 : 8); // Back to original size
			})
			.on('click', (event, d: any) => {
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
			.attr('dy', '0.1em')
			.attr('font-size', '4px')
			.attr('font-family', 'Arial, sans-serif')
			.attr('fill', '#CCCCCC') // Updated to match the new default color
			.attr('pointer-events', 'none')
			.style('opacity', 0); // Start hidden

		textSel = g
			.selectAll('text')
			.data(nodes)
			.join('text')
			/* …your attrs… */
			.text((d) => {
				const MAX = 30;
				return d.label.length > MAX ? d.label.slice(0, MAX - 1) + '…' : d.label;
			})
			// then add a native SVG tooltip so the full title is on hover:
			.append('title')
			.text((d) => d.label);

		// Tick update
		simulation.on('tick', () => {
			// Update regular links
			g.selectAll('line.regular-link')
				.attr('x1', (d: any) => d.source.x)
				.attr('y1', (d: any) => d.source.y)
				.attr('x2', (d: any) => d.target.x)
				.attr('y2', (d: any) => d.target.y);

			// Update shooting star links
			prerequisiteLinks.forEach((link: any) => {
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

			g.selectAll('circle')
				.attr('cx', (d: any) => d.x)
				.attr('cy', (d: any) => d.y);
			g.selectAll('text')
				.attr('x', (d: any) => d.x)
				.attr('y', (d: any) => d.y + (d.type === 'paper' ? 26 : 20)); // Position labels farther below paper nodes
		});

		function dragstarted(e: any) {
			if (!e.active) simulation.alphaTarget(0.3).restart();
			e.subject.fx = e.subject.x;
			e.subject.fy = e.subject.y;
		}
		function dragged(e: any) {
			e.subject.fx = e.x;
			e.subject.fy = e.y;
		}
		function dragended(e: any) {
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

	function startShootingStarAnimation(prerequisiteLinks: any) {
		// Build dependency graph for sequential mode
		let linkDelays = new Map();

		if (useSequentialShootingStars) {
			const nodeDependencies = new Map();
			const nodeDependents = new Map();

			// Initialize maps
			prerequisiteLinks.forEach((link: any) => {
				const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
				const targetId = typeof link.target === 'object' ? link.target.id : link.target;

				// Track what each node depends on
				if (!nodeDependencies.has(targetId)) {
					nodeDependencies.set(targetId, new Set());
				}
				nodeDependencies.get(targetId).add(sourceId);

				// Track what depends on each node
				if (!nodeDependents.has(sourceId)) {
					nodeDependents.set(sourceId, new Set());
				}
				nodeDependents.get(sourceId).add(targetId);
			});

			// Find nodes with no prerequisites (fundamental nodes)
			const fundamentalNodes = new Set();
			prerequisiteLinks.forEach((link: any) => {
				const sourceId = typeof link.source === 'object' ? link.source.id : link.source;

				// If source has no dependencies, it's fundamental
				if (!nodeDependencies.has(sourceId)) {
					fundamentalNodes.add(sourceId);
				}
			});

			// Create animation sequence: each link gets a delay based on its position in the dependency chain
			const visitedNodes = new Set();
			const nodeLevels = new Map();

			// Calculate levels for each node (0 = fundamental, 1 = depends on level 0, etc.)
			function calculateLevels() {
				const queue = [...fundamentalNodes];
				queue.forEach((nodeId) => {
					nodeLevels.set(nodeId, 0);
					visitedNodes.add(nodeId);
				});

				while (queue.length > 0) {
					const currentId = queue.shift();
					const currentLevel = nodeLevels.get(currentId);

					// Process dependents of current node
					const dependents = nodeDependents.get(currentId) || new Set();
					dependents.forEach((dependentId) => {
						// Check if all dependencies of this dependent are processed
						const dependencies = nodeDependencies.get(dependentId) || new Set();
						const allDependenciesProcessed = Array.from(dependencies).every((depId) =>
							visitedNodes.has(depId)
						);

						if (allDependenciesProcessed && !visitedNodes.has(dependentId)) {
							nodeLevels.set(dependentId, currentLevel + 1);
							visitedNodes.add(dependentId);
							queue.push(dependentId);
						}
					});
				}
			}

			calculateLevels();

			// Calculate delays recursively based on when each node receives ALL its prerequisites
			function calculateLinkDelay(link: any) {
				const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
				const sourcePrerequisites = nodeDependencies.get(sourceId) || new Set();

				if (sourcePrerequisites.size === 0) {
					// Source has no prerequisites - start immediately
					return 0;
				} else {
					// Source has prerequisites - wait for ALL of them to complete
					let maxPrerequisiteCompletionTime = 0;

					sourcePrerequisites.forEach((prereqId) => {
						// Find the link that goes TO this prerequisite
						const prereqLink = prerequisiteLinks.find((l) => {
							const lTargetId = typeof l.target === 'object' ? l.target.id : l.target;
							return lTargetId === prereqId;
						});

						if (prereqLink) {
							// Recursively calculate when this prerequisite link completes
							const prereqStartDelay = calculateLinkDelay(prereqLink);
							const prereqCompletionTime = prereqStartDelay + 1.5; // 1.5s animation time (matches the original)
							maxPrerequisiteCompletionTime = Math.max(
								maxPrerequisiteCompletionTime,
								prereqCompletionTime
							);
						}
					});

					return maxPrerequisiteCompletionTime;
				}
			}

			// Calculate delays for all links
			prerequisiteLinks.forEach((link: any) => {
				const delay = calculateLinkDelay(link);
				linkDelays.set(link, delay);
			});
		}

		function animate() {
			const currentTime = Date.now() * 0.001; // Current time in seconds

			prerequisiteLinks.forEach((link: any, index: number) => {
				if (link.gradient) {
					// Only animate if no node is focused OR this link is directly connected to the focused node
					const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
					const targetId = typeof link.target === 'object' ? link.target.id : link.target;
					const shouldAnimate =
						!focusedNode || sourceId === focusedNode.id || targetId === focusedNode.id;

					if (shouldAnimate) {
						let time, rawProgress;

						if (useSequentialShootingStars) {
							// Sequential mode: use delays based on dependency chain
							const delay = linkDelays.get(link) || 0;
							const cycleTime = 2.0; // 2 second cycle per link (1.5s animation + 0.5s pause)
							const adjustedTime = (currentTime - delay) % cycleTime;

							// Only animate if we're past the delay
							if (adjustedTime >= 0) {
								rawProgress = adjustedTime < 1.5 ? adjustedTime / 1.5 : 1; // 1.5s animation, 0.5s pause
							} else {
								// Before delay, show no shooting star
								link.gradient.selectAll('stop').attr('offset', (d, i) => {
									if (i === 0) return '0%';
									if (i === 1) return '0%';
									if (i === 2) return '0%';
									if (i === 3) return '0%';
									if (i === 4) return '0%';
									return '0%';
								});
								return;
							}
						} else {
							// Parallel mode: original behavior
							time = (Date.now() * 0.002) % 2; // 2 second cycle (1.5s animation + 0.5s pause)
							rawProgress = time < 1.5 ? time / 1.5 : 1; // Animation for first 1.5s, then hold at end
						}

						// Apply dramatic easing curve for "zip" effect: very slow -> current speed -> very slow
						const progress =
							rawProgress < 0.2
								? Math.pow(rawProgress / 0.2, 4) * 0.1 // Very slow start (quartic ease - covers 5% of distance)
								: rawProgress < 0.8
									? 0.05 + ((rawProgress - 0.2) / 0.6) * 0.8 // Current speed middle section (covers 90% of distance)
									: 0.95 + Math.pow((rawProgress - 0.8) / 0.2, 4) * 0.1; // Very slow end (quartic ease - covers 5% of distance)

						// Update gradient stops with centered positions
						link.gradient.selectAll('stop').attr('offset', (d, i) => {
							if (i === 0) return Math.max(0, progress * 120 - 20) + '%';
							if (i === 1) return Math.max(0, progress * 120 - 7.5) + '%'; // 45% before center
							if (i === 2) return Math.max(0, Math.min(100, progress * 120 - 5)) + '%'; // Center
							if (i === 3) return Math.min(100, progress * 120 - 2.5) + '%'; // 55% after center
							if (i === 4) return Math.min(100, progress * 120) + '%';
							return '0%';
						});
					} else {
						// Stop animation by setting a static state (no shooting star visible)
						link.gradient.selectAll('stop').attr('offset', (d, i) => {
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
	function slugify(text: any) {
		return text
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/(^-|-$)/g, '');
	}

	// Function to extract all section headers and their IDs from content
	export function extractSectionHeaders(content: any) {
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
	function parseNodeLinks(content: any) {
		// First, parse markdown
		let processedContent = content
			// Convert headers (#### to h4, ### to h3, ## to h2, # to h1) with IDs
			.replace(
				/^#### (.+)$/gm,
				(m: any, t: any) =>
					`<h4 id="${slugify(t)}" class="text-base font-semibold mb-2 mt-3" style="color: #D0D0D0;">${t}</h4>`
			)
			.replace(
				/^### (.+)$/gm,
				(m: any, t: any) =>
					`<h3 id="${slugify(t)}" class="text-lg font-semibold mb-2 mt-4" style="color: #E0E0E0;">${t}</h3>`
			)
			.replace(
				/^## (.+)$/gm,
				(m: any, t: any) =>
					`<h2 id="${slugify(t)}" class="text-xl font-bold mb-3 mt-6" style="color: #F0F0F0;">${t}</h2>`
			)
			.replace(
				/^# (.+)$/gm,
				(m: any, t: any) =>
					`<h1 id="${slugify(t)}" class="text-2xl font-bold mb-4 mt-8" style="color: #FFFFFF;">${t}</h1>`
			)
			// Convert bold text (**text** to <strong>)
			.replace(/\*\*(.+?)\*\*/g, '<strong style="color: #FFFFFF;">$1</strong>')
			// Convert italic text (*text* to <em>)
			.replace(/\*(.+?)\*/g, '<em style="color: #CCCCCC;">$1</em>')
			// Convert LaTeX math blocks ($$...$$ to <div> with math styling)
			.replace(
				/\$\$([\s\S]*?)\$\$/g,
				'<div class="bg-gray-900 p-4 rounded mb-4 overflow-x-auto text-center" style="border: 1px solid #333333;"><span style="color: #E0E0E0; font-family: \'Times New Roman\', serif; font-size: 1.1em;">$$1</span></div>'
			)
			// Convert inline LaTeX math ($...$ to <span> with math styling)
			.replace(
				/\$([^$\n]+?)\$/g,
				'<span style="color: #E0E0E0; font-family: \'Times New Roman\', serif; font-style: italic;">$$1</span>'
			)
			// Convert code blocks (```math to <pre><code>)
			.replace(
				/```math\n([\s\S]*?)\n```/g,
				'<pre class="bg-gray-900 p-3 rounded mb-3 overflow-x-auto"><code style="color: #E0E0E0; font-family: monospace;">$1</code></pre>'
			)
			// Convert inline code (`code` to <code>)
			.replace(
				/`([^`]+)`/g,
				'<code class="bg-gray-800 px-1 rounded" style="color: #E0E0E0; font-family: monospace;">$1</code>'
			)
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
		return processedContent.replace(
			/<node id="(\d+)">([^<]+)<\/node>/g,
			(match: any, id: any, text: any) => {
				const nodeId = parseInt(id);
				const node = graphData?.nodes?.find((n: { id: string | number }) => n.id === nodeId);
				if (node) {
					const color =
						node.type === 'paper' ? '#BFCAF3' : getNodeDomainColor(node.domain || 'tech');

					// Get node status to determine visual representation
					if (nodeStatusService.isMastered(nodeId)) {
						// Mastered: plain text (no underline)
						return `<span
						  class="cursor-pointer transition-colors duration-200 node-link"
						  data-node-id="${nodeId}"
						  style="font-weight: 500; color: inherit;"
						  onmouseover="this.style.color='${color}'"
						  onmouseout="this.style.color='';"
						>${text}</span>`;
					} else if (nodeStatusService.isVisited(nodeId)) {
						// Visited: underlined text
						return `<span
								class="cursor-pointer hover:opacity-80 transition-all duration-200 node-link"
								data-node-id="${nodeId}"
								style="color: ${color}; font-weight: 500; text-decoration: underline;"
							  >${text}</span>`;
					} else {
						// Not visited: boxed style
						return `<span
							class="cursor-pointer hover:opacity-80 transition-all duration-200 node-link"
							data-node-id="${nodeId}"
							style="
							  display: inline-flex;
							  align-items: center;
							  background: ${color}18;
							  border: 1px solid ${color}4D;
							  border-radius: 5px;
							  padding: 2px 3px;
							  color: ${color};
							  font-weight: 500;
							"
						  >${text}</span>`;
					}
				}
				return text;
			}
		);
	}

	// Function to select a node by ID (for node links)
	function selectNodeById(nodeId: any) {
		console.log('[DEBUG] selectNodeById called with nodeId:', nodeId);
		// Get the live node from the simulation with current x,y coordinates
		if (typeof window !== 'undefined' && window.simulation) {
			const liveNodes = window.simulation.nodes();
			const liveNode = liveNodes.find((n) => n.id === nodeId);

			if (liveNode) {
				// Mark the node as visited immediately
				console.log('[DEBUG] Marking node as visited:', nodeId);
				nodeStatusService.markAsVisited(nodeId);
				onNodeVisited(nodeId); // Call SuggestionService logic

				// Add to the stack first (same order as selectNode)
				addToNodeStack(liveNode);
				updateNodeStyles();
				// Then center the graph on the selected node
				centerGraphOnNode(liveNode);

				// --- MVP Recommendation Logic ---
				if (recommendedNode && recommendedNode.node && nodeId === recommendedNode.node.id) {
					console.log('[DEBUG] Clicked recommended node:', nodeId);
					if (
						window.suggestionService &&
						typeof window.suggestionService.generateRecommendation === 'function'
					) {
						console.log('[DEBUG] Generating new recommendation...');
						window.suggestionService.generateRecommendation();
					}
				} else {
					console.log('[DEBUG] Clicked non-recommended node:', nodeId);
				}
			}
		}
	}

	// Function to center the graph on a specific node (restored original logic)
	function centerGraphOnNode(node: any) {
		if (zoomBehavior && svgElement) {
			const scale = 1.6;
			const [x, y] = [node.x || 0, node.y || 0]; // Node position

			// Get the current container dimensions
			const containerWidth = 928;
			const containerHeight = 680;

			// Instead of centering in the middle, center in the open area on the left
			// Target position: 1/4 from left, vertically centered
			const targetX = -containerWidth / 4; // 1/4 from left edge
			const targetY = 0; // Vertically centered

			// Create transform to move the node to the target position
			const transform = d3.zoomIdentity
				.translate(targetX - x * scale, targetY - y * scale)
				.scale(scale);

			// Apply zoom transform with smooth transition
			d3.select(svgElement).transition().duration(750).call(zoomBehavior.transform, transform);
		}
	}

	//TODO :: Nodes are just not adding in at all anymore
	//MARKED NODES AS VISIT -> AddNodeToDB IS NOT ADDING IT IN
	async function addToNodeStack(node: any) {
		focusedNode = node;
		connectedNodes.clear();
		connectedNodes.add(node.id);

		// Find all directly connected nodes
		if (graphData) {
			graphData.links.forEach((link) => {
				if (link.source.id === node.id || link.source === node.id) {
					connectedNodes.add(link.target.id || link.target);
				}
				if (link.target.id === node.id || link.target === node.id) {
					connectedNodes.add(link.source.id || link.source);
				}
			});
		}

		//TODO :: Instead of using existing node status service, migrate to supabase
		let formattedNode = await addNodeToDB(node);
		onNodeVisited(node.id);

		// HISTORY
		const existingIndex = navigationHistory.findIndex((n) => n.id === node.id);
		if (existingIndex !== -1) {
			navigationHistory = navigationHistory.slice(0, existingIndex + 1);
		} else {
			navigationHistory = [...navigationHistory, node];
		}

		nodeStack = nodeStack.filter((n) => n.id !== node.id);
		nodeStack = [...nodeStack, formattedNode];
	}

	// Function to remove a node from the stack
	function removeFromStack(nodeId: any) {
		nodeStack = nodeStack.filter((n) => n.id !== nodeId);

		// Remove from navigation history as well
		navigationHistory = navigationHistory.filter((n) => n.id !== nodeId);

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
				graphData.links.forEach((link) => {
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

	function navigateToStackIndex(index: any) {
		if (index >= 0 && index < navigationHistory.length) {
			// Get the selected node from navigation history
			const selectedNode = navigationHistory[index];

			// Don't truncate history - just focus on the selected node
			// Make sure the selected node is at the top of the stack
			nodeStack = nodeStack.filter((n) => n.id !== selectedNode.id);
			nodeStack = [...nodeStack, selectedNode];

			// Focus on the selected node
			focusedNode = selectedNode;
			connectedNodes.clear();
			connectedNodes.add(selectedNode.id);

			// Find connected nodes for the selected node
			if (graphData) {
				graphData.links.forEach((link) => {
					if (link.source.id === selectedNode.id || link.source === selectedNode.id) {
						connectedNodes.add(link.target.id || link.target);
					}
					if (link.target.id === selectedNode.id || link.target === selectedNode.id) {
						connectedNodes.add(link.source.id || link.source);
					}
				});
			}

			// Center the graph on the selected node
			centerGraphOnNode(selectedNode);

			// Update node styles
			updateNodeStyles();
		}
	}

	// Function to toggle between sequential and parallel shooting stars
	function toggleShootingStarMode() {
		// This function is no longer needed as shooting stars are always sequential
		console.log('Shooting star mode is always sequential.');
	}

	// Make function available globally for onclick handlers (client-side only)
	if (typeof window !== 'undefined') {
		window.selectNodeById = selectNodeById;
	}

	let recommendedNode = null;

	recommendedNodeStore.subscribe((node) => {
		recommendedNode = node;
	});

	onMount(async () => {
		await loadVisitedFromDb();
		await loadUserFromDb();
		await loadMergedGraph();
		initializeSuggestionSystem();

		element.innerHTML = '';
		element.appendChild(chart(mergedGraph));

		updateNodeStyles();
		updateUserProfileDebug();

		const handleNodeLinkClick = (event: MouseEvent) => {
			const target = (event.target as HTMLElement).closest('.node-link');
			if (target?.dataset.nodeId) {
				selectNodeById(parseInt(target.dataset.nodeId));
			}
		};
		document.addEventListener('click', handleNodeLinkClick);

		// 6. Any other broadcast listeners
		window.addEventListener('nodeVisited', updateUserProfileDebug);
		window.addEventListener('nodeStatusUpdated', updateUserProfileDebug);
		const unsubRec = recommendedNodeStore.subscribe(updateUserProfileDebug);

		// Cleanup all listeners when component unmounts
		return () => {
			document.removeEventListener('click', handleNodeLinkClick);
			window.removeEventListener('nodeVisited', updateUserProfileDebug);
			window.removeEventListener('nodeStatusUpdated', updateUserProfileDebug);
			unsubRec();
		};
	});

	function handleNextStepClick() {
		if (recommendedNode && window.selectNodeById) {
			// Use the local selectNodeById function instead of window.selectNodeById
			selectNodeById(recommendedNode.node.id);
			if (typeof window !== 'undefined') {
				window.sessionStorage.setItem('hideNextStepBox', 'true');
			}
		}
	}

	let userProfileClicked = false;
	function handleUserProfileClick() {
		handleLogout();
		userProfileClicked = true;
		setTimeout(() => {
			userProfileClicked = false;
		}, 100);
	}
	const bracketColors = {
		beginner: '#9CA3AF',
		intermediate: '#E0AF67',
		advanced: '#BA9AF7',
		expert: '#F7768E'
	};

	function hexToRgba(hex: string, alpha: number) {
		const r = parseInt(hex.slice(1, 3), 16);
		const g = parseInt(hex.slice(3, 5), 16);
		const b = parseInt(hex.slice(5, 7), 16);
		return `rgba(${r}, ${g}, ${b}, ${alpha})`;
	}
	// whenever userBracket changes, this will update
	$: borderColor = bracketColors[userBracket] || '#333333';
	$: borderColorAlpha = hexToRgba(borderColor, 0.3);
	$: currentHistoryIndex = navigationHistory.findIndex((n) => n.id === focusedNode?.id);

	function prevStack() {
		if (currentHistoryIndex > 0) {
			navigateToStackIndex(currentHistoryIndex - 1);
		}
	}
	function nextStack() {
		if (currentHistoryIndex < navigationHistory.length - 1) {
			navigateToStackIndex(currentHistoryIndex + 1);
		}
	}
</script>

<div class="fixed top-4 left-4 z-50 flex flex-row gap-2">
	<div
		class="user-profile-debug flex cursor-pointer items-center gap-2 rounded-sm px-4 py-2"
		style="
    background-color: rgba(0,0,0,.95);
    border: 2px solid {borderColorAlpha};
    backdrop-filter: blur(10px);
  "
		on:click={handleUserProfileClick}
	>
		<p
			class="flex items-center gap-x-2 text-xs font-semibold capitalize"
			style="color: {borderColor}; "
		>
			{userBracket}
		</p>
	</div>
	{#if recommendedNode && recommendedNode.node}
		<div
			class="next-step-glow flex items-center gap-2 rounded-sm px-4 py-2 text-xs"
			style="background-color: rgba(0,0,0,.95); border:2px solid #222; backdrop-filter: blur(10px);"
		>
			<span class="font-semibold text-neutral-50">Next Step:</span>
			<span
				class="node-link cursor-pointer transition-all duration-200 hover:opacity-80"
				data-node-id={recommendedNode.node.id}
				style="color: {recommendedNode.node.type === 'paper'
					? '#BFCAF3'
					: getNodeDomainColor(
							recommendedNode.node.domain
						)}; font-weight:500; text-decoration:underline;"
			>
				{recommendedNode.node.label}
			</span>
		</div>
	{/if}
</div>

<main class="relative flex h-screen w-screen" style="background-color: #080808; color: #B3B3B3;">
	<RankRevealModal
		show={showRankModal}
		nodesVisited={rankNodesVisited}
		calculatedRank={userRank}
		onClose={() => {
			showRankModal = false;
		}}
	/>
	<div
		bind:this={tooltipEl}
		class="pointer-events-none absolute z-50 hidden rounded p-2 text-sm shadow-lg"
		style="background-color: #080808; border: 1px solid #333333;"
	></div>

	<!-- {#if navigationHistory.length > 0} -->
	<!-- 	<div class="absolute top-4 left-4 z-50"> -->
	<!-- 		<div -->
	<!-- 			class="flex items-center gap-2 rounded-lg px-4 py-2" -->
	<!-- 			style="background-color: rgba(17, 17, 17, 0.9); border: 1px solid #333333; backdrop-filter: blur(10px);" -->
	<!-- 		> -->
	<!-- 			{#each navigationHistory as node, index (node.id)} -->
	<!-- 				{#if index > 0} -->
	<!-- 					<span class="text-sm" style="color: #666666;">→</span> -->
	<!-- 				{/if} -->
	<!-- 				<button -->
	<!-- 					on:click={() => navigateToStackIndex(index)} -->
	<!-- 					class="cursor-pointer text-sm font-medium transition-colors hover:underline" -->
	<!-- 					style="color: {node.type === 'paper' ? '#BFCAF3' : getNodeDomainColor(node.domain)};" -->
	<!-- 				> -->
	<!-- 					{node.label} -->
	<!-- 				</button> -->
	<!-- 			{/each} -->
	<!-- 		</div> -->
	<!-- 	</div> -->
	<!-- {/if} -->

	{#if typeof window !== 'undefined'}
		<!-- Graph container - always full width -->
		<div class="h-full w-full">
			<div bind:this={element} class="h-full w-full"></div>
		</div>
	{:else}
		<div class="flex h-full w-full items-center justify-center text-gray-500"></div>
	{/if}

	{#if nodeStack.length > 0}
		<div class="pointer-events-none fixed inset-0" style="z-index: 50;">
			{#each nodeStack as node, index (node.id)}
				<div
					in:fly={{ x: 300, duration: 250, easing: cubicOut }}
					out:fly={{ x: 300, duration: 200, easing: cubicIn }}
					class="node-view-panel pointer-events-auto absolute transition-all duration-300"
					style="
						top: 0;
						right: 0;
						bottom: 0;
						width: 50%;
						z-index: {10 + index};
						background-color: transparent;
					"
				>
					<div class="h-full p-4">
						<div
							class="h-full overflow-auto rounded-sm shadow-lg"
							style="background-color: rgba(0,0,0,0.6); backdrop-filter: blur(16px); border: 1px solid #222;"
						>
							<div class="h-full overflow-hidden">
								<PaginatedContent
									{node}
									{parseNodeLinks}
									onClose={() => removeFromStack(node.id)}
									nodesVisited={nodeStatusService.getAllStatuses().size}
									on:challenge={(e) => openChallenge(e.detail.node)}
									on:prevNode={prevStack}
									on:nextNode={nextStack}
								/>
							</div>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
	{#if challengeOpen}
		<Challenge on:finish={(e) => closeChallenge(e.detail)} {challengeNode} />
	{/if}
</main>

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

	/* Node View panel styles for proper positioning */
	.node-view-panel {
		position: absolute;
		top: 0;
		right: 0;
		width: 100%;
		height: 100%;
		z-index: 10;
		background: #0a0a0a;
	}

	/* Glow animation for Next Step box */
	.next-step-glow {
		animation: nextStepGlow 1s;
	}
	@keyframes nextStepGlow {
		0% {
			box-shadow: 0 0 0px 0px #7f9cf5;
		}
		20% {
			box-shadow: 0 0 16px 6px #7f9cf5;
		}
		60% {
			box-shadow: 0 0 16px 6px #7f9cf5;
		}
		100% {
			box-shadow: 0 0 0px 0px #7f9cf5;
		}
	}

	.user-profile-debug.clicked {
		background: #b00 !important;
		color: #fff;
	}
</style>
