import { expect, test } from '@playwright/test';
import { SEED_USER, signupAndVerify } from './helpers';

test.describe('feeds and social interactions', () => {
  test('a logged-out visitor is asked to sign in and the like completes afterwards', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByLabel('For You feed')).toBeVisible();

    const like = page.getByRole('button', { name: /^Like,/ }).first();
    await expect(like).toBeVisible();
    await like.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByLabel('Email').fill(SEED_USER.email);
    await dialog.getByLabel('Password').fill(SEED_USER.password);
    await dialog.getByRole('button', { name: 'Sign in' }).click();

    await expect(dialog).toBeHidden();
    await expect(like).toHaveAttribute('aria-pressed', 'true');
  });

  test('likes, comments and follows survive a reload', async ({ page }) => {
    const account = await signupAndVerify(page);

    await page.goto('/');
    await expect(page.getByLabel('For You feed')).toBeVisible();
    const like = page.getByRole('button', { name: /^Like,/ }).first();
    await like.click();
    await expect(like).toHaveAttribute('aria-pressed', 'true');

    const comments = page.getByRole('button', { name: /^Comments,/ }).first();
    await comments.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    const comment = `e2e comment ${Date.now()}`;
    await dialog.getByLabel('Add a comment').fill(comment);
    await dialog.getByRole('button', { name: 'Post' }).click();
    await expect(dialog.getByText(comment)).toBeVisible();
    await dialog.getByRole('button', { name: 'Close panel' }).click();

    await page.goto(`/@${account.username}`);
    await expect(page.getByRole('heading', { name: `E2E ${account.username}` })).toBeVisible();
    await expect(page.getByText('Upload your first video to kick things off.')).toBeVisible();

    await page.getByRole('tab', { name: 'Liked' }).click();
    const likedVideo = page.getByRole('link', { name: /^Watch / }).first();
    await expect(likedVideo).toBeVisible();
    await likedVideo.click();
    await expect(page).toHaveURL(/\/video\//);

    const commentsButton = page.getByRole('button', { name: /^Comments,/ }).first();
    if (await commentsButton.isVisible().catch(() => false)) await commentsButton.click();
    await expect(page.getByText(comment).first()).toBeVisible();

    const follow = page.getByRole('button', { name: /^Follow / }).first();
    if (await follow.isVisible().catch(() => false)) {
      await follow.click();
      await expect(page.getByRole('button', { name: /^Following/ }).first()).toBeVisible();
      await page.reload();
      await expect(page.getByRole('button', { name: /^Following/ }).first()).toBeVisible();
    }
  });

  test('the following feed is gated for signed-out visitors', async ({ page }) => {
    await page.goto('/following');
    await expect(page.getByRole('heading', { name: 'Follow your people' })).toBeVisible();
    await page.getByRole('link', { name: 'Log in' }).first().click();
    await expect(page).toHaveURL(/\/login/);
  });
});
