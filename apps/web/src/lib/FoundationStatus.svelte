<script lang="ts">
  const foundations = [
    'SvelteKit server rendering',
    'Separate Node worker',
    'Deterministic package boundary',
    'PostgreSQL development service',
  ];
</script>

<section aria-labelledby="foundation-heading" class="status-card">
  <div>
    <p class="eyebrow">Foundation status</p>
    <h2 id="foundation-heading">The application shell is running</h2>
  </div>
  <ul aria-label="Available foundation capabilities">
    {#each foundations as foundation (foundation)}
      <li>
        <span aria-hidden="true">✓</span>
        {foundation}
      </li>
    {/each}
  </ul>
</section>

<style>
  .status-card {
    display: grid;
    gap: 1.5rem;
    padding: clamp(1.25rem, 4vw, 2rem);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-medium);
    background: var(--color-surface-raised);
    box-shadow: var(--shadow-raised);
  }

  .eyebrow {
    margin: 0 0 0.4rem;
    color: var(--color-accent-strong);
    font-weight: 750;
    letter-spacing: 0.09em;
    text-transform: uppercase;
  }

  h2 {
    margin: 0;
    font-size: clamp(1.35rem, 4vw, 2rem);
    line-height: 1.1;
  }

  ul {
    display: grid;
    gap: 0.75rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  li {
    display: flex;
    gap: 0.65rem;
    align-items: center;
    color: var(--color-ink-muted);
  }

  li span {
    display: grid;
    width: 1.5rem;
    height: 1.5rem;
    flex: none;
    place-items: center;
    border-radius: 999px;
    background: var(--color-accent);
    color: var(--color-accent-ink);
    font-weight: 800;
  }

  @media (min-width: 48rem) {
    .status-card {
      grid-template-columns: minmax(0, 1fr) minmax(18rem, 0.8fr);
      align-items: center;
    }
  }
</style>
