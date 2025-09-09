import type { PageLoad } from './$types';

// Eagerly import all markdown files and use their frontmatter
const allPosts = import.meta.glob('/src/lib/posts/*.md', { eager: true });

type MDModule = {
	metadata: { title: string; date: string; excerpt?: string };
	default: unknown;
};

export const load: PageLoad = async () => {
	const posts = Object.entries(allPosts)
		.map(([path, mod]) => {
			const m = mod as MDModule;
			const slug = path.split('/').pop()!.replace('.md', '');
			return { slug, ...m.metadata };
		})
		.sort((a, b) => +new Date(b.date) - +new Date(a.date));

	return { posts };
};
