import { expect, type Page } from '@playwright/test';

const MAILPIT_URL = process.env.MAILPIT_URL ?? 'http://localhost:8025';

interface MailpitMessage {
  ID: string;
  To: Array<{ Address: string }>;
}

export const SEED_USER = {
  email: 'seeduser1@example.com',
  password: 'Password123!',
};

export async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

export function uniqueAccount(): { email: string; username: string; password: string } {
  const suffix = `${Date.now().toString(36)}${Math.floor(Math.random() * 1_000)}`;
  return {
    email: `e2e-${suffix}@example.com`,
    username: `e2e${suffix}`.slice(0, 20),
    password: 'Str0ng!Passphrase',
  };
}

/** Signs up through the UI and verifies the email using the Mailpit API. */
export async function signupAndVerify(
  page: Page,
  account = uniqueAccount(),
): Promise<typeof account> {
  await page.goto('/signup');
  await page.getByLabel('Email').fill(account.email);
  await page.getByLabel('Username').fill(account.username);
  await page.getByLabel('Display name').fill(`E2E ${account.username}`);
  await page.getByLabel('Password').fill(account.password);
  await page.getByRole('button', { name: 'Sign up' }).click();
  await expect(page).toHaveURL(/\/verify-email/);

  const token = await verificationToken(account.email);
  await page.goto(`/verify-email?token=${encodeURIComponent(token)}`);
  await page.getByRole('button', { name: 'Verify email' }).click();
  await expect(page.getByText(/verified/i)).toBeVisible();
  return account;
}

async function verificationToken(email: string): Promise<string> {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const list = await fetch(`${MAILPIT_URL}/api/v1/messages?limit=50`);
    if (list.ok) {
      const body = (await list.json()) as { messages?: MailpitMessage[] };
      const message = body.messages?.find((entry) =>
        entry.To?.some((to) => to.Address.toLowerCase() === email.toLowerCase()),
      );
      if (message) {
        const detail = await fetch(`${MAILPIT_URL}/api/v1/message/${message.ID}`);
        if (detail.ok) {
          const text = JSON.stringify(await detail.json());
          const match = text.match(/verify-email\?token=([A-Za-z0-9_-]+)/);
          if (match?.[1]) return decodeURIComponent(match[1]);
        }
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`No verification email arrived for ${email}`);
}

/** Records a short WebM in the browser so the upload test needs no fixture file. */
export async function recordTestVideo(
  page: Page,
): Promise<{ name: string; mimeType: string; buffer: Buffer }> {
  const base64 = await page.evaluate(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 360;
    canvas.height = 640;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas is unavailable');
    const stream = canvas.captureStream(30);
    const recorder = new MediaRecorder(stream, {
      mimeType: 'video/webm',
      videoBitsPerSecond: 300_000,
    });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    const stopped = new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
    });
    recorder.start();
    for (let frame = 0; frame < 75; frame += 1) {
      context.fillStyle = `hsl(${frame * 4} 80% 55%)`;
      context.fillRect(0, 0, 360, 640);
      context.fillStyle = '#ffffff';
      context.font = 'bold 34px sans-serif';
      context.fillText('Kiddo', 40, 300);
      context.fillText(`frame ${frame}`, 40, 350);
      await new Promise((resolve) => setTimeout(resolve, 33));
    }
    recorder.stop();
    await stopped;
    const blob = new Blob(chunks, { type: 'video/webm' });
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
  });

  return {
    name: 'kiddo-e2e.webm',
    mimeType: 'video/webm',
    buffer: Buffer.from(base64, 'base64'),
  };
}
