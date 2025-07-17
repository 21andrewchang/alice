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
		// Convert LaTeX math blocks ($...$ to <div> with math styling)
		.replace(/\$\$([\s\S]*?)\$\$/g, '<div class="bg-gray-900 p-4 rounded mb-4 overflow-x-auto text-center" style="border: 1px solid #333333;"><span style="color: #E0E0E0; font-family: \'Times New Roman\', serif; font-size: 1.1em;">$1</span></div>')
		// Convert inline LaTeX math ($...$ to <span> with math styling)
		.replace(/\$([^$\n]+?)\$/g, '<span style="color: #E0E0E0; font-family: \'Times New Roman\', serif; font-style: italic;">$1</span>')
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
			const color = node.type === 'paper' ? '#BFCAF3' : getNodeDomainColor(node.domain || 'tech');
			
			// Get node status to determine visual representation
			if (nodeStatusService.isMastered(nodeId)) {
				// Mastered: colored text with glow effect and mastery indicator
				return `<span class="cursor-pointer hover:opacity-80 transition-all duration-200 node-link" 
					data-node-id="${nodeId}" 
					style="color: ${color}; font-weight: 600; text-shadow: 0 0 4px ${color}80;">
					${text} <span style="font-size: 0.8em; vertical-align: super;">✓</span>
				</span>`;
			} else if (nodeStatusService.isVisited(nodeId)) {
				// Visited: just colored text, no box
				return `<span class="cursor-pointer hover:opacity-80 transition-all duration-200 node-link" 
					data-node-id="${nodeId}" 
					style="color: ${color}; font-weight: 500;">
					${text}
				</span>`;
			} else {
				// Not visited: box style
				return `<span class="cursor-pointer hover:opacity-80 transition-all duration-200 node-link" 
					data-node-id="${nodeId}" 
					style="display: inline-flex; align-items: center; background: ${color}18; border: 1px solid ${color}4D; border-radius: 5px; padding: 0px 3px; margin: 2px 0; color: ${color}; font-weight: 500;">
					${text}
				</span>`;
			}
		}
		return text;
	});
}