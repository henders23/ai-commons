import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// The site URL is used for canonical links, Open Graph tags and the sitemap.
export default defineConfig({
  site: 'https://ai-commons-for-eap.vercel.app',
  trailingSlash: 'never',
  build: { format: 'file' },
  integrations: [sitemap()],
});
