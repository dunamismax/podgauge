import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),
    csp: {
      mode: 'auto',
      directives: {
        'base-uri': ['none'],
        'connect-src': ['self'],
        'default-src': ['none'],
        'font-src': ['self'],
        'form-action': ['self'],
        'frame-ancestors': ['none'],
        'img-src': ['self'],
        'object-src': ['none'],
        'script-src': ['self'],
        'style-src': ['self'],
      },
    },
  },
};

export default config;
