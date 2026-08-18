import type { Handle } from '@sveltejs/kit';

import { getWebConfiguration } from '$lib/server/config.js';

// Load and validate private configuration before serving the first request.
getWebConfiguration();

export const handle: Handle = async ({ event, resolve }) => resolve(event);
