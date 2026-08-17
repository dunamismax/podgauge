<script lang="ts">
  import { resolve } from '$app/paths';
  import FoundationStatus from '$lib/FoundationStatus.svelte';

  const dimensions = [
    'Mana',
    'Access',
    'Cohesion',
    'Control',
    'Recovery',
    'Conversion',
  ];
</script>

<svelte:head>
  <title>PodGauge — Measure the deck. Match the table.</title>
  <meta
    name="description"
    content="PodGauge is building evidence-backed Commander deck analysis."
  />
</svelte:head>

<a class="skip-link" href="#main-content">Skip to content</a>

<header>
  <a class="brand" href={resolve('/')} aria-label="PodGauge home">PodGauge</a>
  <span class="phase">Pre-alpha</span>
</header>

<main id="main-content">
  <section class="hero" aria-labelledby="page-heading">
    <p class="kicker">Commander analysis, with receipts.</p>
    <h1 id="page-heading">Measure the deck.<br />Match the table.</h1>
    <p class="lede">
      PodGauge is becoming an open-source, evidence-backed way to understand
      deck capability, official brackets, table fit, and uncertainty without
      reducing a Commander deck to one unexplained number.
    </p>
    <div class="dimension-list" aria-label="Deckprint dimensions">
      {#each dimensions as dimension (dimension)}
        <span>{dimension}</span>
      {/each}
    </div>
  </section>

  <FoundationStatus />

  <section class="notice" aria-labelledby="not-live-heading">
    <h2 id="not-live-heading">Scanner results are not live yet</h2>
    <p>
      This first foundation serves a real SSR application and worker, but it
      does not score or import decks. Unsupported conclusions will remain
      unknown until their contracts, fixtures, and calibration evidence exist.
    </p>
    <a href="https://github.com/dunamismax/podgauge"
      >Follow the build on GitHub</a
    >
  </section>
</main>

<footer>
  <p>
    Unofficial Fan Content. Not approved or endorsed by Wizards of the Coast.
  </p>
</footer>

<style>
  :global(*) {
    box-sizing: border-box;
  }

  .skip-link {
    position: fixed;
    z-index: 10;
    top: 0.75rem;
    left: 0.75rem;
    padding: 0.75rem 1rem;
    transform: translateY(-180%);
    border-radius: var(--radius-small);
    background: var(--color-accent-strong);
    color: var(--color-accent-ink);
  }

  .skip-link:focus {
    transform: translateY(0);
  }

  header,
  main,
  footer {
    width: min(72rem, 100%);
    margin-inline: auto;
    padding-inline: var(--space-page);
  }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 5rem;
  }

  .brand {
    color: var(--color-ink);
    font-size: 1.15rem;
    font-weight: 850;
    letter-spacing: -0.03em;
    text-decoration: none;
  }

  .phase {
    padding: 0.4rem 0.7rem;
    border: 1px solid var(--color-border);
    border-radius: 999px;
    color: var(--color-ink-muted);
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  main {
    display: grid;
    gap: clamp(3rem, 8vw, 7rem);
    padding-block: clamp(3rem, 8vw, 7rem);
  }

  .hero {
    max-width: 58rem;
  }

  .kicker {
    margin: 0 0 1rem;
    color: var(--color-accent-strong);
    font-weight: 750;
  }

  h1 {
    max-width: 12ch;
    margin: 0;
    font-size: clamp(3rem, 11vw, 7.5rem);
    font-weight: 850;
    letter-spacing: -0.075em;
    line-height: 0.88;
  }

  .lede {
    max-width: var(--measure-copy);
    margin: clamp(1.75rem, 4vw, 3rem) 0 0;
    color: var(--color-ink-muted);
    font-size: clamp(1.1rem, 2.8vw, 1.4rem);
    line-height: 1.6;
  }

  .dimension-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 2rem;
  }

  .dimension-list span {
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--color-border);
    border-radius: 999px;
    background: var(--color-surface);
    color: var(--color-ink-muted);
    font-size: 0.9rem;
  }

  .notice {
    max-width: var(--measure-copy);
  }

  .notice h2 {
    margin: 0 0 1rem;
    font-size: clamp(1.5rem, 4vw, 2.5rem);
    letter-spacing: -0.035em;
  }

  .notice p {
    color: var(--color-ink-muted);
    line-height: 1.7;
  }

  .notice a {
    display: inline-flex;
    min-height: 2.75rem;
    align-items: center;
    margin-top: 0.5rem;
    color: var(--color-accent-strong);
    font-weight: 750;
    text-underline-offset: 0.25rem;
  }

  footer {
    padding-block: 2rem;
    border-top: 1px solid var(--color-border);
    color: var(--color-ink-muted);
    font-size: 0.85rem;
  }
</style>
