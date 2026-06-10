import { defineConfig } from '@playwright/test'

// Unit- en (later) E2E-tests. Draaien met: npm test
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  reporter: 'list',
})
