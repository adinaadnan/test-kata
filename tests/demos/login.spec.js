import { test, expect } from '@playwright/test';

// Normal runs pause in Playwright Inspector. Automatic mode verifies this demo
// without leaving an interactive browser waiting for the presenter.
const automatic = process.env.DESK_DEMO_AUTO === '1';

test('show how to sign in to Desk', async ({ page }) => {
  await test.step('Open the login screen', async () => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible();
    console.log('PAUSE 1: Explain the login screen. Click Resume in Playwright Inspector to enter the demo credentials.');
    if (!automatic) await page.pause();
  });

  await test.step('Enter the agent credentials', async () => {
    await page.getByLabel('Email', { exact: true }).fill('sara@example.test');
    await page.getByLabel('Password', { exact: true }).fill('workshop123');
    console.log('PAUSE 2: Credentials are filled. Click Resume to submit the form and verify the result.');
    if (!automatic) await page.pause();
  });

  await test.step('Sign in and prove it worked', async () => {
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Ticket inbox' })).toBeVisible();
    await expect(page.locator('.account')).toContainText('Sara');
    await expect(page.getByRole('button', { name: /#1 Invoice export/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Invoice export is missing rows', exact: true })).toBeVisible();
    console.log('PAUSE 3: Login passed and the inbox is open. Inspect the app; click Resume to finish the demo.');
    if (!automatic) await page.pause();
  });
});
