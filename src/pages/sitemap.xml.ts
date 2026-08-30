/* Static sitemap. Hand-rolled rather than pulling in @astrojs/sitemap, since
   the route set is known here and the dependency would add a build step for
   about twenty lines of XML. */
import type { APIRoute } from 'astro';
import { TOOLS, SITE } from '../lib/site';
import { STATES } from '@data/states';
import { METROS } from '@data/metros';

export const GET: APIRoute = () => {
  const today = new Date().toISOString().slice(0, 10);
  const urls: Array<{ loc: string; priority: string }> = [
    { loc: '/', priority: '1.0' },
    { loc: '/tools', priority: '0.8' },
    { loc: '/closing-costs', priority: '0.8' },
    { loc: '/affordability', priority: '0.8' },
    { loc: '/methodology', priority: '0.4' },
    { loc: '/privacy', priority: '0.2' },
    { loc: '/terms', priority: '0.2' },
    ...TOOLS.map((t) => ({ loc: `/tools/${t.slug}`, priority: '0.9' })),
    ...STATES.map((s) => ({ loc: `/closing-costs/${s.slug}`, priority: '0.7' })),
    ...METROS.map((m) => ({ loc: `/affordability/${m.slug}`, priority: '0.7' })),
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>
    <loc>${SITE.url}${u.loc}</loc>
    <lastmod>${today}</lastmod>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
