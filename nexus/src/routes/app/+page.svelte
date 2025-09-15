<script lang="ts">
	import { scale } from 'svelte/transition';
	import Challenge from '../../components/Challenge.svelte';
	import BracketProgress from '../../components/BracketProgress.svelte';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { cubicOut, cubicIn } from 'svelte/easing';
	import * as d3 from 'd3';
	import PaginatedContent from '../../components/PaginatedContent.svelte';
	import RankRevealModal from '../../components/RankRevealModal.svelte';
	import { supabase } from '$lib/supabaseClient';
	import { initializeSuggestionSystem } from '$lib/suggestionSystemInit';
	import {
		nodeStatusService,
		getNodeVisualState,
		calculateLinkVisualState,
		getDomainColor as getNodeDomainColor
	} from '$lib/nodeStatus';
	import { userProfile } from '$lib/userProfileStore';

	let showContent = false;

	$: if (!tutorialExpanded) showContent = false;

	function handleTutorialTransitionEnd(e: TransitionEvent) {
		// only care about the end of the size transition
		if (e.propertyName !== 'width' && e.propertyName !== 'height') return;
		if (tutorialExpanded) {
			// now that expansion is done, reveal content
			showContent = true;
		} else {
			showContent = false;
		}
	}

	let tutorialExpanded = false;
	let slideIndex = 0;
	const tutorialSlides = [
		{
			title: 'The Nexus',
			body: `The graph in the center is called The Nexus. The circles are Nodes, which can either be Research Papers or Foundational Knowlege. You can zoom in and out with scroll and pan by clicking and dragging.`
		},
		{
			title: 'Nodes',
			body: `Clicking a Node in the graph or through a link opens the Node's detailed view on the right. The graph centers the Node and focuses it's connections on the left. If you don’t see something you’re interested in, use the form on the right to request it.`
		},
		{
			title: 'Your First Node',
			body: `The "Next Step" box in the top left shows your first recommendation. Clicking the link to the topic opens the Node View for it.`
		},
		{
			title: 'Mastery',
			body: `Mastery represents your understanding of a Node. You can challenge your current Mastery at any time by clicking the button in the bottom right of the Node. Answering questions correct will give you EXP. When you get 100 EXP, you level up that Node's mastery`
		},
		{
			title: 'Skill Bracket',
			body: `All your mastery levels are accumulated to determine your skill bracket. You can check your progress towards the next skill bracket by clicking your current bracket in the top left`
		}
	];

	function prevSlide() {
		if (slideIndex > 0) slideIndex--;
	}
	function nextSlide() {
		if (slideIndex < tutorialSlides.length - 1) slideIndex++;
	}
	function closeTutorial() {
		tutorialExpanded = false;
		slideIndex = 0;
	}
	let mergedGraphLoaded = false;
	let challengeOpen = false;
	let challengeNode: Node | null;

	let userBracket = '';
	let savedRecommendationId: number | null = null;
	let recommendedNode: any = null;

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
	let borderColor = '#333333';
	$: borderColorAlpha = hexToRgba(borderColor, 0.3);

	const unsubscribe = userProfile.subscribe(({ bracket, recommendation }) => {
		if (bracket) userBracket = bracket;
		console.log('bracket from store', userBracket);
		borderColor = bracketColors[userBracket] ?? '#333333';
		if (recommendation != null) savedRecommendationId = recommendation;
		if (mergedGraphLoaded) {
			const node = mergedGraph.nodes.find((n: any) => n.id === savedRecommendationId);
			if (node) {
				recommendedNode = { node };
				showContent = true;
				tutorialExpanded = true;
			}
		}
	});

	async function loadUserFromDb() {
		const { data: sessionData } = await supabase.auth.getSession();
		const user = sessionData.session?.user;
		if (user) {
			const { data: userData, error } = await supabase
				.from('users')
				.select('bracket, recommendation')
				.eq('id', user.id)
				.limit(1);

			if (error) {
				console.error('Error loading profile:', error);
			} else if (userData && userData.length > 0) {
				tutorialExpanded = false;

				userBracket = userData[0]?.bracket;
				const rec = userData[0]?.recommendation;
				if (rec != null) {
					savedRecommendationId = rec;
					if (mergedGraphLoaded) {
						const node = mergedGraph.nodes.find((n: any) => n.id === savedRecommendationId);
						if (node) {
							recommendedNode = { node };
						}
					}
				}
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
	}

	const bracketToNodeIds: Record<string, number[]> = {
		beginner: [5, 17, 6, 2, 20],
		intermediate: [8, 13, 0, 19, 15, 14, 3, 18, 1, 7],
		advanced: [24, 23, 4, 11, 12, 22],
		expert: [10, 9, 21]
	};

	function pickRandom<T>(arr: T[]) {
		return arr[Math.floor(Math.random() * arr.length)];
	}
	async function newRecommendation(userId: string) {
		if (!mergedGraphLoaded) return;

		const bucket = bracketToNodeIds[userBracket] || [];
		let candidates = bucket
			.map((id) => mergedGraph.nodes.find((n: any) => n.id === id))
			.filter(Boolean)
			.filter((n: any) => {
				const status = nodeStatusService.getNodeStatus(n.id);
				return !status || status.mastery === 0;
			});

		// Fallback: if none in current bracket, try all bracketed nodes
		if (candidates.length === 0) {
			const allBucketed = Object.values(bracketToNodeIds)
				.flat()
				.map((id) => mergedGraph.nodes.find((n: any) => n.id === id))
				.filter(Boolean)
				.filter((n: any) => {
					const status = nodeStatusService.getNodeStatus(n.id);
					return !status || status.mastery === 0;
				});
			candidates = allBucketed;
		}

		// Last resort: anything in graph with no mastery
		if (candidates.length === 0) {
			candidates = mergedGraph.nodes.filter((n: any) => {
				const status = nodeStatusService.getNodeStatus(n.id);
				return !status || status.mastery === 0;
			});
		}

		if (candidates.length === 0) {
			return;
		}

		const choice = pickRandom(candidates);
		savedRecommendationId = choice.id;
		recommendedNode = { node: choice };

		const { error: upsertErr } = await supabase.from('users').upsert(
			{
				id: userId,
				recommendation: savedRecommendationId
			},
			{ onConflict: 'id' }
		);

		if (upsertErr) {
			console.error('Failed to persist recommendation to users table:', upsertErr);
		}
	}
	async function refreshBracketProgress() {
		try {
			const res = await getBracketProgress(userBracket as Bracket); // the helper we wrote earlier
			masteryCounts = res.counts; // { M1, M2, M3 } if you want to show elsewhere
			progress = res.progress; // { earned, total, requiredLevel, next }
		} catch (e) {
			console.error('Failed to refresh bracket progress', e);
		}
	}

	async function updateNode(nodeId: string, exp: number) {
		const prevStatus = nodeStatusService.getNodeStatus(nodeId) || { mastery: null };
		const prevMastery = prevStatus.mastery;
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
		if (data?.newBracket) {
			userBracket = data.newBracket;
			borderColor = bracketColors[userBracket] ?? '#333333';
		}
		nodeStatusService.updateNodeStatus(nodeId, {
			exp: data.newExp,
			mastery: data.newMastery
		});

		nodeStack = nodeStack.map((n) =>
			n.id === nodeId ? { ...n, exp: data.newExp, mastery: data.newMastery } : n
		);
		updateNodeStyles();
		const masteryChanged = data?.newMastery != null && data.newMastery !== prevMastery;

		if (masteryChanged || data?.newBracket) {
			await refreshBracketProgress();
		}
		if (masteryChanged) {
			await newRecommendation(user.id);
		}
		if (error) console.error(error);
		return !error;
	}

	async function closeChallenge(e) {
		await updateNode(challengeNode.id, e.expEarned);
		challengeOpen = false;
	}

	let mergedGraph: { nodes: any[]; links: any[] } = { nodes: [], links: [] };

	// Listen for node visit events (assuming you have a function or event for this)
	//SUGGESTIONS
	function onNodeVisited(nodeId: string) {
		console.log('node visited: ', nodeId);
	}

	async function loadMergedGraph() {
		try {
			const res = await fetch('/glicko.json');
			if (res.ok) {
				mergedGraph = await res.json();
				mergedGraphLoaded = true;
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
		const { error } = await supabase.auth.signOut();
		if (error) {
			console.error('Error signing out:', error.message);
			return;
		}

		// 2) Force-clear any residual storage key (just in case)
		localStorage.removeItem('supabase.auth.token');

		// 3) Redirect using SvelteKit's goto (safer than window.location)
		goto('/', { replaceState: true });
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
				.attr('stroke-width', (d: any) => {
					const linkState = calculateLinkVisualState(
						d.source.id || d.source,
						d.target.id || d.target
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

	let isPickingConnection = false;
	let node_connection: number | null = null;
	let node_connection_label = '';

	function selectNodeConnection() {
		showNodeModal = false;
		isPickingConnection = true;
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
		const links = data.links.map((d: any) => ({ ...d }));

		// Map central relations
		const centralId = 0;
		const relationMap: Record<string, string> = {};
		links.forEach((l: any) => {
			if (l.source === centralId) relationMap[l.target as string] = l.relation;
			else if (l.target === centralId) relationMap[l.source as string] = l.relation;
		});

		const anchors: Record<string, [number, number]> = {
			physics: [-width / 2.8, height / 6], // bottom-left (your original intent)
			ai: [-width / 4.2, -height / 8], // upper-left (separate from math)
			math: [-width / 5.0, height / 5], // lower-left middle (optional)
			hardware: [width / 4.0, -height / 10], // right/top-right
			tech: [width / 6.0, 0], // near center-right
			biology: [width / 5.0, height / 6],
			chemistry: [width / 5.0, -height / 6],
			default: [0, 0]
		};

		function anchorX(d: any) {
			return anchors[d.domain]?.[0] ?? anchors.default[0];
		}
		function anchorY(d: any) {
			return anchors[d.domain]?.[1] ?? anchors.default[1];
		}

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
			.force('x', d3.forceX((d: any) => anchorX(d)).strength(0.08))
			.force('y', d3.forceY((d: any) => anchorY(d)).strength(0.08))
			.force(
				'collide',
				d3
					.forceCollide()
					.radius((d: any) => {
						const base = d.type === 'topic' ? 16 : 8;
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
			.attr('r', (d: any) => (d.domain === 'topic' ? 16 : 8)) // Larger radius for research papers
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
					.attr('r', (d: any) => (d.domain === 'topic' ? 16 : 8) * 1.15); // 15% bigger
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
					.attr('r', d.domain === 'topic' ? 16 : 8); // Back to original size
			})
			.on('click', (event, d: any) => {
				event.stopPropagation();
				if (isPickingConnection) {
					console.log('selected node: ', d);
					node_connection = d.id;
					node_connection_label = d.label;
					console.log(node_connection);
					console.log(node_connection_label);
					isPickingConnection = false;
					showNodeModal = true;
					return;
				}
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
				.attr('y', (d: any) => d.y + (d.domain === 'topic' ? 26 : 20)); // Position labels farther below paper nodes
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
					`<h4 id="${slugify(t)}" class="text-base font-semibold" style="color: #D0D0D0;">${t}</h4>`
			)
			.replace(
				/^### (.+)$/gm,
				(m: any, t: any) =>
					`<h3 id="${slugify(t)}" class="text-lg font-semibold" style="color: #E0E0E0;">${t}</h3>`
			)
			.replace(
				/^## (.+)$/gm,
				(m: any, t: any) =>
					`<h2 id="${slugify(t)}" class="text-xl font-bold" style="color: #F0F0F0;">${t}</h2>`
			)
			.replace(
				/^# (.+)$/gm,
				(m: any, t: any) =>
					`<h1 id="${slugify(t)}" class="text-2xl font-bold" style="color: #FFFFFF;">${t}</h1>`
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
		if (typeof window !== 'undefined') {
			const liveNodes = window.simulation.nodes();
			const liveNode = liveNodes.find((n) => n.id === nodeId);
			console.log('live node: ', liveNode);
			if (liveNode) {
				nodeStatusService.markAsVisited(nodeId);
				onNodeVisited(nodeId);
				addToNodeStack(liveNode);
				updateNodeStyles();
				centerGraphOnNode(liveNode);
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

			// Instead of centering in the middle, center in the open area on the left
			// Target position: 1/4 from left, vertically centered
			const targetX = -containerWidth / 4 - 20; // 1/4 from left edge
			const targetY = -50; // Vertically centered

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
	type Bracket = 'beginner' | 'intermediate' | 'advanced' | 'expert';

	const bracketRules: Record<Bracket, { level: number; count: number; next: Bracket | null }> = {
		beginner: { level: 1, count: 5, next: 'intermediate' },
		intermediate: { level: 2, count: 5, next: 'advanced' },
		advanced: { level: 3, count: 5, next: 'expert' },
		expert: { level: 0, count: 0, next: null }
	};

	async function countAtLeast(level: number, userId: string): Promise<number> {
		const { count, error } = await supabase
			.from('user_nodes')
			.select('node_id', { head: true, count: 'exact' })
			.eq('user_id', userId)
			.gte('mastery', level);
		if (error) throw error;
		return count ?? 0;
	}

	export async function getMasteryCounts(): Promise<{ M1: number; M2: number; M3: number }> {
		const { data: sessionData } = await supabase.auth.getSession();
		const userId = sessionData.session?.user?.id;
		if (!userId) throw new Error('Not signed in');

		const [m1, m2, m3] = await Promise.all([
			countAtLeast(1, userId),
			countAtLeast(2, userId),
			countAtLeast(3, userId)
		]);

		return { M1: m1, M2: m2, M3: m3 };
	}

	// derive progress for the current bracket (for BracketProgress)
	export async function getBracketProgress(userBracket: Bracket) {
		const counts = await getMasteryCounts();

		const rule = bracketRules[userBracket];
		if (!rule || !rule.next) {
			return {
				counts, // raw counts for M1/M2/M3 if you want to show them
				progress: {
					earned: rule?.count ?? 0,
					total: rule?.count ?? 0,
					requiredLevel: 0,
					next: null
				}
			};
		}

		const key = `M${rule.level}` as 'M1' | 'M2' | 'M3';
		const earned = Math.min(counts[key] ?? 0, rule.count); // clamp to total

		return {
			counts, // { M1, M2, M3 }
			progress: {
				earned, // 0..5 for your progress bar
				total: rule.count, // always 5 per your rules
				requiredLevel: rule.level, // 1/2/3
				next: rule.next // 'intermediate' | 'advanced' | 'expert'
			}
		};
	}
	let masteryCounts = { M1: 0, M2: 0, M3: 0 };
	let progress = { earned: 0, total: 5, requiredLevel: 1, next: 'intermediate' as Bracket | null };

	async function loadGraphFromDb() {
		const { data: nodes, error: nErr } = await supabase
			.from('nodes')
			.select('id,label,domain,description,type,difficulty')
			.order('id', { ascending: true });
		if (nErr) throw nErr;

		const { data: links, error: lErr } = await supabase.from('links').select('source,target');
		if (lErr) throw lErr;
		console.log(nodes);

		mergedGraph = {
			nodes,
			links: links.map((l) => ({
				source: l.source,
				target: l.target,
				relation: 'prerequisite',
				value: 1
			}))
		};
		console.log(mergedGraph);
		mergedGraphLoaded = true;
	}

	onMount(async () => {
		// await loadMergedGraph();
		await loadGraphFromDb();
		await loadVisitedFromDb();
		await loadUserFromDb();
		const res = await getBracketProgress(userBracket as Bracket);
		masteryCounts = res.counts;
		progress = res.progress;
		const key = userBracket.toString().trim().toLowerCase();
		borderColor = bracketColors[key] ?? '#333333';
		initializeSuggestionSystem();

		element.innerHTML = '';
		element.appendChild(chart(mergedGraph));

		updateNodeStyles();

		const handleNodeLinkClick = (event: MouseEvent) => {
			const target = (event.target as HTMLElement).closest('.node-link');
			if (target?.dataset.nodeId) {
				selectNodeById(parseInt(target.dataset.nodeId));
			}
		};
		document.addEventListener('click', handleNodeLinkClick);

		return () => {
			document.removeEventListener('click', handleNodeLinkClick);
		};
	});

	$: currentHistoryIndex = navigationHistory.findIndex((n) => n.id === focusedNode?.id);
	let showProgress = false;
	function handleUserProfileClick() {
		showProgress = !showProgress;
	}

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
	let node_title = '';
	let node_content = '';
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

	const domainOptions = ['math', 'ai', 'tech', 'hardware', 'topic'];

	let node_domain: string = 'math';
	let showRequestModal = false;
	let showNodeModal = false;
	let requestedTopic = '';
	let node_is_source: boolean = true;

	async function submitNewNode() {
		try {
			const { data: sessionData } = await supabase.auth.getSession();
			const user = sessionData.session?.user;

			if (!user) {
				alert('Please sign in to add a new node');
				return;
			}
			const { data, error } = await supabase
				.from('nodes')
				.insert({
					label: node_title,
					description: node_content,
					domain: node_domain,
					difficulty: 0,
					type: 'content'
				})
				.select('id')
				.single();

			if (error) {
				console.error(error);
			}

			const newId = data?.id;
			console.log('new id:', newId);

			if (newId && node_connection != null) {
				const source = node_is_source ? newId : node_connection;
				const target = node_is_source ? node_connection : newId;

				const { error: linkError } = await supabase
					.from('links')
					.insert({ source, target })
					.single();

				if (linkError) throw linkError;
			}
			node_title = '';
			node_content = '';
			node_connection = null;
			node_connection_label = '';
			node_is_source = true;
			showNodeModal = false;
		} catch (e) {
			console.error(e);
			alert('Could not submit right now. Try again later.');
		}
	}
	async function submitTopicRequest() {
		try {
			const { data: sessionData } = await supabase.auth.getSession();
			const user = sessionData.session?.user;

			if (!user) {
				alert('Please sign in to request a topic.');
				return;
			}

			const { error } = await supabase.from('requests').insert({
				created_by: user.id,
				request: requestedTopic
			});

			if (error) throw error;

			requestedTopic = '';
			showRequestModal = false;
			alert('Thanks! Your topic request was submitted.');
		} catch (e) {
			console.error(e);
			alert('Could not submit right now. Try again later.');
		}
	}
</script>

<div class="fixed top-4 left-4 z-50 grid w-fit grid-cols-[auto_auto] gap-2">
	<div class="flex flex-row gap-2">
		{#if userBracket && borderColorAlpha && borderColor}
			<button
				class="flex cursor-pointer items-center gap-2 rounded-sm bg-black/30 px-4 py-2"
				style=" border: 1px solid {borderColorAlpha};"
				on:click={handleUserProfileClick}
			>
				<p
					class="flex items-center gap-x-2 text-xs font-semibold capitalize select-none"
					style="color: {borderColor};"
				>
					{userBracket}
				</p>
			</button>
		{/if}

		{#if recommendedNode && recommendedNode.node}
			<div
				class="flex items-center gap-2 rounded-sm bg-black/30 px-4 py-2 text-xs select-none"
				style="border:1px solid #222; backdrop-filter: blur(10px);"
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
	{#if showProgress}
		<div
			class="col-span-2 flex items-center gap-2 rounded-sm px-4 py-2 text-xs"
			style="background-color: rgba(0,0,0,.95); border:1px solid #222; backdrop-filter: blur(10px);"
			in:scale={{ start: 0.9, duration: 200 }}
			out:scale={{ start: 0.9, duration: 200 }}
		>
			<BracketProgress {userBracket} mastery={progress.earned} total={progress.total} />
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

	{#if typeof window !== 'undefined'}
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
	<div class="fab-row pointer-events-none">
		<div
			class="tutorial-container pointer-events-auto border border-neutral-800"
			class:expanded={tutorialExpanded}
			on:click={() => {
				if (!tutorialExpanded) tutorialExpanded = true;
			}}
			on:transitionend={handleTutorialTransitionEnd}
			aria-label="Tutorial"
		>
			{#if !tutorialExpanded}
				<!-- Collapsed circle -->
				<div class="circle px-1 py-1 text-neutral-600 transition hover:text-neutral-200">
					<span aria-hidden="true">?</span>
				</div>
			{:else}
				<div class="panel flex h-full flex-col">
					{#if showContent}
						<div class="panel-inner flex h-full flex-col">
							<div class="panel-header">
								<div class="panel-title">{tutorialSlides[slideIndex].title}</div>
								<button
									class="close"
									aria-label="Close tutorial"
									on:click|stopPropagation={closeTutorial}
								>
									×
								</button>
							</div>
							<div class="panel-body flex-1 overflow-auto">
								<div class="step-indicator">Step {slideIndex + 1} of {tutorialSlides.length}</div>
								<div class="slide-content">{tutorialSlides[slideIndex].body}</div>
							</div>
							<div class="panel-footer sticky bottom-0 flex justify-between bg-black/50">
								<button on:click={prevSlide} disabled={slideIndex === 0} class="nav-btn">
									← Previous
								</button>
								<div class="spacer"></div>
								{#if slideIndex === tutorialSlides.length - 1}
									<button
										on:click|stopPropagation={closeTutorial}
										class="nav-btn"
										aria-label="Finish tutorial"
									>
										Done ✓
									</button>
								{:else}
									<button on:click={nextSlide} class="nav-btn">Next →</button>
								{/if}
							</div>
						</div>
					{/if}
				</div>
			{/if}
		</div>
		<button
			type="button"
			class="pointer-events-auto inline-flex items-center rounded-full border border-neutral-800/80 bg-black/20 px-2 py-1
            font-medium text-neutral-500 backdrop-blur-md transition
            hover:text-white focus:outline-none"
			aria-label="Add Node"
			title="Add Node"
			on:click={() => (showNodeModal = true)}
		>
			<span class="text-[10px]">Add Node</span>
		</button>
		<button
			type="button"
			class="pointer-events-auto inline-flex items-center rounded-full border border-neutral-800/80 bg-black/20 px-2 py-1
            font-medium text-neutral-500 backdrop-blur-md transition
            hover:text-white focus:outline-none"
			aria-label="Request a topic"
			title="Request a topic"
			on:click={() => (showRequestModal = true)}
		>
			<span class="text-[10px]">Request Topic</span>
		</button>
		<button
			type="button"
			class="pointer-events-auto inline-flex items-center rounded-full border border-red-500/40 bg-black/20 px-2 py-1
            font-medium text-red-800 backdrop-blur-md transition
            hover:text-red-500 focus:outline-none"
			aria-label="Request a topic"
			title="Log out"
			on:click={handleLogout}
		>
			<span class="text-[10px]">Log out</span>
		</button>
	</div>

	{#if showNodeModal}
		<div class="fixed inset-0 z-[80] flex items-center justify-center p-4">
			<div
				class="absolute inset-0 bg-black/60"
				on:click={() => (showNodeModal = false)}
				in:fade={{ duration: 180, easing: cubicOut }}
				out:fade={{ duration: 140, easing: cubicIn }}
			/>
			<div
				class="relative z-10 flex max-h-[80vh] w-full max-w-lg flex-col justify-center overflow-auto rounded-md border border-white/10 bg-black/30 backdrop-blur-2xl"
				style="-webkit-backdrop-filter: blur(24px);"
				transition:scale={{ start: 0.9, duration: 200, easing: cubicOut }}
			>
				<div class="p-6 pb-0">
					<h3 class="mb-2 text-xl font-semibold text-neutral-50">Add Node</h3>
					<div class="mb-2">
						<div class="flex flex-wrap gap-2">
							{#each domainOptions as d}
								{#key d}
									<button
										type="button"
										on:click={() => (node_domain = d)}
										class="rounded-full px-3 py-1 text-xs font-medium transition-all"
										style="
							border: 1px solid {domainColors[d]};
							color: {domainColors[d]};
							background: {hexToRgba(domainColors[d], node_domain === d ? 0.25 : 0.0)};
							box-shadow: {node_domain === d ? `0 0 0 2px ${hexToRgba(domainColors[d], 0.15)}` : 'none'};
						  "
									>
										{d[0].toUpperCase() + d.slice(1)}
									</button>
								{/key}
							{/each}
						</div>
					</div>
					<textarea
						class="mt-1 w-full resize-y rounded-md border border-neutral-800 bg-neutral-900/70 p-2
               text-sm text-neutral-100 placeholder-neutral-600 outline-none
               focus:border-neutral-600 focus:ring-0"
						rows="1"
						bind:value={node_title}
						placeholder="Node Title"
					/>
					<textarea
						class="mt-1 w-full resize-y rounded-md border border-neutral-800 bg-neutral-900/70 p-2
               text-sm text-neutral-100 placeholder-neutral-600 outline-none
               focus:border-neutral-600 focus:ring-0"
						rows="1"
						bind:value={node_content}
						placeholder="Node Content"
					/>
					<div class="mt-2 flex items-center justify-between gap-2">
						<div class="flex min-w-0 items-center gap-2 text-xs">
							{#if node_connection != null}
								<span class="shrink-0 font-medium text-neutral-100"
									>{node_title ? node_title : 'Unnamed Node'}</span
								>
								<button
									type="button"
									class="arrow-toggle inline-flex items-center justify-center rounded-full
               border border-neutral-800 px-2 py-1 text-neutral-100
               transition hover:bg-white/10 active:scale-95"
									on:click={() => (node_is_source = !node_is_source)}
									aria-label={node_is_source
										? 'New → Selected (click to flip)'
										: 'Selected → New (click to flip)'}
									disabled={node_connection == null}
								>
									{node_is_source ? '→' : '←'}
								</button>

								<span
									class="truncate font-medium text-neutral-100"
									title={node_connection_label}
									style="max-width: 14rem;"
								>
									{node_connection_label}
								</span>
							{:else}
								<span class="opacity-60">Pick a node to connect (optional)</span>
							{/if}
						</div>

						<!-- Right: pick/change connected node -->
						<button
							type="button"
							class="rounded-full border border-neutral-800 px-3 py-1 text-xs font-medium text-neutral-100 transition-all
           hover:bg-white/5"
							on:click={selectNodeConnection}
						>
							{node_connection ? 'Change connection' : 'Select node'}
						</button>
					</div>
				</div>
				<div class="mt-3 h-px w-full bg-neutral-800/80"></div>
				<div class="mt-3 mr-3 mb-3 flex justify-end gap-2">
					<button
						type="button"
						class="rounded-full border bg-neutral-200 px-3 py-1.5 text-xs font-medium
                 text-black hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
						on:click={submitNewNode}
						disabled={!node_title.trim()}
					>
						Submit
					</button>
				</div>
			</div>
		</div>
	{/if}
	{#if showRequestModal}
		<div class="fixed inset-0 z-[80] flex items-center justify-center p-4">
			<div
				class="absolute inset-0 bg-black/60"
				on:click={() => (showRequestModal = false)}
				in:fade={{ duration: 180, easing: cubicOut }}
				out:fade={{ duration: 140, easing: cubicIn }}
			/>
			<div
				class="relative z-10 flex max-h-[80vh] w-full max-w-lg flex-col justify-center overflow-auto rounded-md border-[2px] border-white/10 bg-black/70 p-6 backdrop-blur-2xl"
				style="-webkit-backdrop-filter: blur(24px);"
				transition:scale={{ start: 0.9, duration: 200, easing: cubicOut }}
			>
				<h3 class="mb-2 text-xl font-semibold text-neutral-50">Request a Topic</h3>
				<textarea
					class="mt-1 w-full resize-y rounded-md border border-neutral-800 bg-neutral-900/70 p-2
               text-sm text-neutral-100 placeholder-neutral-600 outline-none
               focus:border-neutral-600 focus:ring-0"
					rows="4"
					bind:value={requestedTopic}
					placeholder="What would you like to learn next?"
				/>
				<div class="mt-3 flex justify-end gap-2">
					<button
						type="button"
						class="rounded-md border border-neutral-800 px-3 py-1.5 text-sm text-neutral-200 hover:bg-white/5"
						on:click={() => (showRequestModal = false)}
					>
						Cancel
					</button>
					<button
						type="button"
						class="rounded-md border border-neutral-700 bg-white/10 px-3 py-1.5 text-sm
                 text-white hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
						on:click={submitTopicRequest}
						disabled={!requestedTopic.trim()}
					>
						Submit
					</button>
				</div>
			</div>
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

	.fab-row {
		position: fixed;
		left: 16px;
		bottom: 16px;
		z-index: 70;
		display: flex;
		align-items: flex-end;
		gap: 12px;
	}
	.tutorial-container {
		/* removed: position, bottom, left */
		overflow: hidden;
		cursor: pointer;
		transition:
			width 0.2s ease,
			height 0.2s ease,
			border-radius 0.35s ease,
			box-shadow 0.35s ease,
			padding 0.35s ease;
		width: 25px;
		height: 25px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: system-ui, sans-serif;
		color: #e0e0e0;
		box-shadow: 0 6px 20px -4px rgba(0, 0, 0, 0.5);
		background: rgba(0, 0, 0, 0.08);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
	}

	.tutorial-container.expanded {
		width: 340px;
		height: 300px;
		border-radius: 10px;
		cursor: default;
		padding: 12px;
		display: flex;
		flex-direction: column;
		background: rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
	}

	.circle {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: medium;
		font-size: 10px;
		user-select: none;
	}

	.panel {
		display: flex;
		flex-direction: column;
		height: 100%;
	}

	.panel-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 6px;
	}

	.panel-title {
		font-size: 14px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.close {
		background: transparent;
		border: none;
		color: #ccc;
		font-size: 18px;
		line-height: 1;
		cursor: pointer;
	}

	.panel-body {
		flex: 1;
		overflow-y: auto;
		padding: 4px 0;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.step-indicator {
		font-size: 11px;
		opacity: 0.7;
	}

	.slide-content {
		flex: 1;
		font-size: 13px;
		line-height: 1.4;
		white-space: pre-wrap;
	}

	.panel-footer {
		display: flex;
		gap: 8px;
		align-items: center;
		padding-top: 4px;
	}

	.nav-btn {
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.12);
		padding: 6px 12px;
		border-radius: 6px;
		font-size: 12px;
		cursor: pointer;
		min-width: 80px;
	}

	.nav-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.spacer {
		flex: 1;
	}
</style>
