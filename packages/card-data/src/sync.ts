import { blockedSources } from './index.js';

console.log(
  JSON.stringify({
    enabledSources: [],
    skippedSources: blockedSources.map(({ source }) => source),
    status: 'no-source-approved',
  }),
);
