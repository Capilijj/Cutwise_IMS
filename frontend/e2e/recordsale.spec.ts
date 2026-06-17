import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('http://localhost:5173/');
  await page.getByRole('button', { name: 'Sales Clerk' }).click();
  await page.getByRole('textbox', { name: 'Email Address' }).click();
  await page.getByRole('textbox', { name: 'Email Address' }).fill('Clerk@otto.com');
  await page.getByRole('textbox', { name: 'Email Address' }).press('Tab');
  await page.getByRole('textbox', { name: 'Password' }).fill('password123');
  await page.getByText('Remember me').click();
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.getByRole('heading', { name: 'Sales Entry' }).click();
  await expect(page.getByRole('heading', { name: 'Sales Entry' })).toBeVisible();
  await page.getByRole('button', { name: 'New Transaction' }).click();
  await page.getByRole('textbox', { name: 'Client / Company Name' }).click();
  await page.getByRole('textbox', { name: 'Client / Company Name' }).fill('Justine');
  await page.getByRole('img', { name: 'Italian Goatskin' }).click();
  await page.getByRole('button', { name: 'Batch B' }).click();
  await page.getByPlaceholder('Qty').click();
  await page.getByPlaceholder('Qty').fill('2');
  await page.getByPlaceholder('PHP').click();
  await page.getByRole('button', { name: '+' }).click();
  await page.getByPlaceholder('PHP').click();
  await page.getByPlaceholder('PHP').fill('300');
  await page.getByRole('button', { name: 'Record Sale' }).click();
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page.getByText('✓Transaction TXN-20260615-041')).toBeVisible();
});