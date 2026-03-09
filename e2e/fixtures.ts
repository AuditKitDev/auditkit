import { test as base } from '@playwright/test';
import { argosScreenshot } from '@argos-ci/playwright';

export const test = base.extend<{
  argos: (name: string) => Promise<void>;
}>({
  argos: async ({ page }, use) => {
    await use(async (name: string) => {
      await argosScreenshot(page, name, {
        viewports: ['macbook-16', 'iphone-x'],
      });
    });
  },
});

export { expect } from '@playwright/test';
