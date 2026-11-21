import { test } from '@playwright/test';
import { SEED_USER, login } from './helpers';

/**
 * Captures the key screens for docs/screens. Run with:
 *   SCREENSHOTS=1 npx playwright test e2e/screenshots.spec.ts
 */
test.describe('documentation screenshots', () => {
  test.skip(process.env.SCREENSHOTS !== '1', 'Set SCREENSHOTS=1 to capture screens.');

  const screens: Array<{ name: string; path: string }> = [
    { name: 'feed', path: '/' },
    { name: 'explore', path: '/explore' },
    { name: 'profile', path: '/@seeduser1' },
    { name: 'upload', path: '/upload' },
    { name: 'settings', path: '/settings' },
  ];

  for (const theme of ['dark', 'light'] as const) {
    test(`captures ${theme} screens`, async ({ page }, testInfo) => {
      await page.addInitScript((value) => {
        localStorage.setItem('kiddo-theme', value);
      }, theme);
      await login(page, SEED_USER.email, SEED_USER.password);

      for (const screen of screens) {
        await page.goto(screen.path);
        await page.waitForTimeout(1_200);
        await page.screenshot({
          path: `../../docs/screens/${screen.name}-${theme}-${testInfo.project.name}.png`,
          fullPage: false,
        });
      }

      await page.goto('/');
      await page
        .getByRole('button', { name: /^Comments,/ })
        .first()
        .click();
      await page.waitForTimeout(600);
      await page.screenshot({
        path: `../../docs/screens/comments-${theme}-${testInfo.project.name}.png`,
        fullPage: false,
      });
    });
  }
});
