import { expect, test } from '@playwright/test';
import { recordTestVideo, signupAndVerify, uniqueAccount } from './helpers';

test.describe('upload pipeline', () => {
  test.skip(({ project }) => project.name === 'mobile', 'The upload flow runs once per run.');

  test('signs up, verifies, uploads and watches a video', async ({ page }) => {
    const account = await signupAndVerify(page, uniqueAccount());
    const video = await recordTestVideo(page);
    const caption = `e2e upload ${Date.now()}`;

    await page.goto('/upload');
    await page.locator('input[type="file"]').setInputFiles(video);
    await expect(page.getByText(video.name)).toBeVisible();
    await page.getByLabel('Caption').fill(caption);
    await page.getByRole('button', { name: 'Upload video' }).click();

    await expect(page.getByText('Processing your video')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Your video is live')).toBeVisible({ timeout: 180_000 });

    await page.getByRole('link', { name: 'Watch video' }).click();
    await expect(page).toHaveURL(/\/video\//);

    const like = page.getByRole('button', { name: /^Like,/ }).first();
    await like.click();
    await expect(like).toHaveAttribute('aria-pressed', 'true');

    await page
      .getByRole('button', { name: /^Comments,/ })
      .first()
      .click();
    const dialog = page.getByRole('dialog');
    const comment = `first! ${Date.now()}`;
    await dialog.getByLabel('Add a comment').fill(comment);
    await dialog.getByRole('button', { name: 'Post' }).click();
    await expect(dialog.getByText(comment)).toBeVisible();

    await page.goto(`/@${account.username}`);
    await expect(page.getByText(caption)).toBeVisible();
  });
});
