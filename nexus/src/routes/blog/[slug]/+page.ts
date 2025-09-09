import type { PageLoad } from './$types';

const modules = import.meta.glob('/src/lib/posts/*.md');

export const load: PageLoad = async ({ params }) => {
	const match = Object.entries(modules).find(([path]) =>
		path.endsWith(`/${params.slug}.md`)
	);

	if (!match) {
		return { status: 404, error: new Error('Post not found') } as any;
	}

	const mod: any = await match[1]();
	return {
		component: mod.default,
		metadata: mod.metadata
	};
};
