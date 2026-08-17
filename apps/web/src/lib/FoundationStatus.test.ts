// @vitest-environment jsdom

import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

import FoundationStatus from './FoundationStatus.svelte';

describe('FoundationStatus', () => {
  it('announces the runnable foundation through semantic content', () => {
    render(FoundationStatus);

    expect(
      screen.getByRole('heading', { name: 'The application shell is running' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('list', { name: 'Available foundation capabilities' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Separate Node worker')).toBeVisible();
  });
});
