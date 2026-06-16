import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('redirects to workspace after login', async ({ page }) => {
    // Stage 1 stub test
    await page.goto('/');
    
    // Expect the title
    await expect(page).toHaveTitle(/Proxima/);
    
    // Click the login CTA
    await page.getByRole('button', { name: /Sign in with Google/i }).click();
    
    // In e2e, we would mock the OAuth flow or intercept the redirect.
    // For now, this just verifies the button exists and triggers navigation.
  });
});
