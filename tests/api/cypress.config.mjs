// tests/api/cypress.config.mjs
// Cypress configuration for API contract testing with Mochawesome reporting.
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    // Base URL for the backend API
    baseUrl: 'http://localhost:5000/api',

    // Test files location
    specPattern: 'cypress/e2e/**/*.cy.ts',

    // Support file
    supportFile: 'cypress/support/e2e.ts',

    // Mochawesome reporter
    reporter: 'cypress-mochawesome-reporter',

    reporterOptions: {
      reportDir: 'cypress/reports',
      charts: true,
      reportPageTitle: 'OmniMarket API Test Report',
      embeddedScreenshots: false,
      inlineAssets: true,
      saveAllAttempts: false,
    },

    // Disable the insecure Cypress.env() API – we don't use it
    allowCypressEnv: false,
  },
});
