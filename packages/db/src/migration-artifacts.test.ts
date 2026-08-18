import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const migrationsDirectory = fileURLToPath(
  new URL('../migrations/', import.meta.url),
);

describe('reviewed migration artifacts', () => {
  it('keeps generated SQL executable and the handwritten constraint layer present', async () => {
    const migrationFiles = (await readdir(migrationsDirectory))
      .filter((file) => file.endsWith('.sql'))
      .sort();
    const migrations = await Promise.all(
      migrationFiles.map((file) =>
        readFile(new URL(`../migrations/${file}`, import.meta.url), 'utf8'),
      ),
    );
    const sql = migrations.join('\n');

    expect(sql).not.toMatch(/\$\d+/u);
    for (const requiredConstraint of [
      'analyses_validate_write',
      'analysis_events_monotonic_sequence',
      'card_data_snapshots_provenance_complete',
      'deck_revisions_immutable',
      'pod_members_report_revision',
      'policy_versions_provenance_complete',
      'source_sync_runs_state_transition',
    ]) {
      expect(sql).toContain(requiredConstraint);
    }
  });

  it('has a journal entry and snapshot for every SQL migration', async () => {
    const journal = JSON.parse(
      await readFile(
        new URL('../migrations/meta/_journal.json', import.meta.url),
        'utf8',
      ),
    ) as { entries: Array<{ tag: string }> };
    const files = await readdir(migrationsDirectory);

    for (const entry of journal.entries) {
      expect(files).toContain(`${entry.tag}.sql`);
      await expect(
        readFile(
          new URL(
            `../migrations/meta/${entry.tag.slice(0, 4)}_snapshot.json`,
            import.meta.url,
          ),
          'utf8',
        ),
      ).resolves.toContain('"dialect": "postgresql"');
    }
  });
});
