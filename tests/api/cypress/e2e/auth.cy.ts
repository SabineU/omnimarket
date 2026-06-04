// tests/api/cypress/e2e/auth.cy.ts
// API contract tests for the authentication endpoints.
// We use cy.request() to send real HTTP requests to the running backend.

describe('Auth API', () => {
  // Each test should be independent – we register a new user for login tests.
  const testEmail = `apitest-${Date.now()}@test.com`;
  const password = 'TestPass123!';
  let refreshToken: string;

  // ---------------------------------------------------------------------------
  // Registration
  // ---------------------------------------------------------------------------
  it('should register a new customer', () => {
    cy.request({
      method: 'POST',
      url: '/auth/register',
      body: {
        email: testEmail,
        password,
        name: 'API Tester',
      },
    }).then((response) => {
      // Verify HTTP status code
      expect(response.status).to.equal(201);

      // Verify response body shape (contract)
      expect(response.body.status).to.equal('success');
      expect(response.body.data.user.email).to.equal(testEmail);
      expect(response.body.data.tokens).to.have.property('accessToken');
      expect(response.body.data.tokens).to.have.property('refreshToken');

      // Store the refresh token for later tests
      refreshToken = response.body.data.tokens.refreshToken;
    });
  });

  it('should reject registration with an existing email', () => {
    cy.request({
      method: 'POST',
      url: '/auth/register',
      body: {
        email: testEmail, // same email as above
        password: 'AnotherPass1',
        name: 'Duplicate',
      },
      failOnStatusCode: false, // don't auto‑fail on non‑2xx
    }).then((response) => {
      expect(response.status).to.equal(409);
      expect(response.body.status).to.equal('error');
    });
  });

  // ---------------------------------------------------------------------------
  // Login
  // ---------------------------------------------------------------------------
  it('should log in with correct credentials', () => {
    cy.request({
      method: 'POST',
      url: '/auth/login',
      body: {
        email: testEmail,
        password,
      },
    }).then((response) => {
      expect(response.status).to.equal(200);
      expect(response.body.data.user.email).to.equal(testEmail);
      expect(response.body.data.tokens.accessToken).to.be.a('string');
    });
  });

  it('should reject login with wrong password', () => {
    cy.request({
      method: 'POST',
      url: '/auth/login',
      body: {
        email: testEmail,
        password: 'WrongPassword1',
      },
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.equal(401);
      expect(response.body.status).to.equal('error');
    });
  });

  // ---------------------------------------------------------------------------
  // Token Refresh
  // ---------------------------------------------------------------------------
  it('should refresh the token pair', () => {
    cy.request({
      method: 'POST',
      url: '/auth/refresh',
      body: {
        refreshToken,
      },
    }).then((response) => {
      expect(response.status).to.equal(200);
      expect(response.body.data.tokens.accessToken).to.be.a('string');
      // The new refresh token must be different (token rotation)
      expect(response.body.data.tokens.refreshToken).to.not.equal(refreshToken);
      // Update refreshToken for any future tests
      refreshToken = response.body.data.tokens.refreshToken;
    });
  });

  it('should reject a used refresh token', () => {
    // Use the previous (now rotated) token – it should fail
    const oldRefreshToken = refreshToken; // this is the new token from previous test
    // We need to rotate it again so the previous becomes invalid
    cy.request({
      method: 'POST',
      url: '/auth/refresh',
      body: {
        refreshToken: oldRefreshToken,
      },
    }).then((resp) => {
      // Extract the new token (prefixed with _ to satisfy lint rule)
      const _newRefresh = resp.body.data.tokens.refreshToken;
      // Now oldRefreshToken should be invalid
      cy.request({
        method: 'POST',
        url: '/auth/refresh',
        body: {
          refreshToken: oldRefreshToken,
        },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.equal(401);
      });
    });
  });
});
