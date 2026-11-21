import { and, eq } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { videoIdParamSchema } from '@reel/shared';
import { users, videos } from '../../db/schema.js';
import { mediaUrl } from '../../lib/storage-keys.js';
import { publicFeedVisibility } from '../../lib/visibility.js';

const TITLE_MAX = 90;
const DESCRIPTION_MAX = 160;

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function truncate(value: string, max: number): string {
  const trimmed = value.trim();
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

interface ShareMetadata {
  title: string;
  description: string;
  imageUrl: string | null;
}

function renderPage(meta: ShareMetadata, canonicalUrl: string): string {
  const title = escapeHtml(meta.title);
  const description = escapeHtml(meta.description);
  const canonical = escapeHtml(canonicalUrl);
  const image = meta.imageUrl ? escapeHtml(meta.imageUrl) : null;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${description}">
<link rel="canonical" href="${canonical}">
<meta property="og:site_name" content="Kiddo">
<meta property="og:type" content="video.other">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:url" content="${canonical}">
${image ? `<meta property="og:image" content="${image}">\n<meta property="og:image:alt" content="${title}">` : ''}
<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${description}">
${image ? `<meta name="twitter:image" content="${image}">` : ''}
<meta http-equiv="refresh" content="0; url=${canonical}">
</head>
<body>
<p>Opening this video on Kiddo… <a href="${canonical}">Continue</a></p>
<script>window.location.replace(${JSON.stringify(canonicalUrl)});</script>
</body>
</html>`;
}

/**
 * Server-rendered share page with Open Graph tags for link previews. Browsers
 * are redirected to the app; crawlers read the meta tags.
 */
export const sharePlugin: FastifyPluginAsyncZod = async (app) => {
  // The body is HTML, so it is sent directly instead of through a JSON response
  // schema (validation still runs on the route params).
  app.get(
    '/s/:id',
    {
      schema: {
        description: 'Share link with Open Graph metadata for public videos',
        params: videoIdParamSchema,
      },
    },
    async (request, reply) => {
      const [row] = await app.db
        .select({
          id: videos.id,
          caption: videos.caption,
          thumbnailKey: videos.thumbnailKey,
          authorName: users.displayName,
          authorUsername: users.username,
        })
        .from(videos)
        .innerJoin(users, eq(users.id, videos.ownerId))
        .where(and(eq(videos.id, request.params.id), publicFeedVisibility()))
        .limit(1);

      const canonicalUrl = `${app.config.APP_URL.replace(/\/$/, '')}/video/${request.params.id}`;
      const generic: ShareMetadata = {
        title: 'Watch a video on Kiddo',
        description: 'Short videos, big fun. Join Kiddo to watch and create.',
        imageUrl: null,
      };

      if (!row) {
        return reply
          .type('text/html; charset=utf-8')
          .header('cache-control', 'public, max-age=60')
          .send(renderPage(generic, canonicalUrl));
      }

      const caption = row.caption.trim();
      const title = caption
        ? truncate(`${caption} — @${row.authorUsername}`, TITLE_MAX)
        : `${row.authorName} (@${row.authorUsername}) on Kiddo`;
      const description = caption
        ? truncate(`${caption} — watch ${row.authorName} on Kiddo.`, DESCRIPTION_MAX)
        : `Watch ${row.authorName} (@${row.authorUsername}) on Kiddo.`;

      return reply
        .type('text/html; charset=utf-8')
        .header('cache-control', 'public, max-age=60')
        .send(
          renderPage(
            {
              title,
              description,
              imageUrl: row.thumbnailKey ? mediaUrl(app, row.thumbnailKey) : null,
            },
            canonicalUrl,
          ),
        );
    },
  );
};
