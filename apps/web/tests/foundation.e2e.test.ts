import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('serves the SSR foundation with no automatically detectable axe violations', async ({
  page,
}) => {
  const response = await page.goto('/');

  expect(response?.status()).toBe(200);
  expect(response?.headers()['content-security-policy']).toContain(
    "default-src 'none'",
  );
  expect(response?.headers()['content-security-policy']).toContain(
    "frame-ancestors 'none'",
  );
  await expect(
    page.getByRole('heading', { name: /Measure the deck/i, level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByText('Scanner results are not live yet'),
  ).toBeVisible();

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
});

test('exposes a non-cacheable process liveness response', async ({
  request,
}) => {
  const response = await request.get('/health/live');

  expect(response.status()).toBe(200);
  expect(response.headers()['cache-control']).toContain('no-store');
  expect(response.headers()['access-control-allow-origin']).toBeUndefined();
  expect(await response.json()).toEqual({ status: 'ok' });
});
