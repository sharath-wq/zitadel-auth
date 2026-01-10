/**
 * ZITADEL Client Module
 *
 * Provides helper functions to interact with Zitadel using a Service User token.
 *
 * Required ENV:
 * - ZITADEL_API_URL
 * - ZITADEL_SERVICE_USER_TOKEN
 * - CLIENT_ID (for issuing OAuth tokens)
 */

const ZITADEL_API_URL = process.env.ZITADEL_API_URL!;
const SERVICE_TOKEN = process.env.ZITADEL_SERVICE_USER_TOKEN!;

/** Common headers for Zitadel requests */
interface ZitadelHeaders {
  'Content-Type': string;
  'Authorization': string;
  'Accept': string;
}

/** Internal util to create request headers */
const getHeaders = (): ZitadelHeaders => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${SERVICE_TOKEN}`,
  'Accept': 'application/json',
});

export const zitadelClient = {
  /**
   * Create a new human user.
   *
   * @param data - Details for the new user
   * @param data.username - Username to assign
   * @param data.email - User email
   * @param data.password - Plain password
   * @param data.firstName - Optional first name
   * @param data.lastName - Optional last name
   *
   * @returns User JSON response
   * @throws Error if user creation fails
   */
  async createUser(data: {
    username: string;
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }) {
    const response = await fetch(`${ZITADEL_API_URL}/v2/users/human`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        username: data.username,
        profile: {
          givenName: data.firstName ?? '',
          familyName: data.lastName ?? '',
          displayName: `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim(),
        },
        email: {
          email: data.email,
          isVerified: false,
        },
        password: {
          password: data.password,
          changeRequired: false,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create user');
    }

    return response.json();
  },

  /**
   * Creates a session for a given username BEFORE password validation.
   *
   * @param loginName - The username/email to check
   * @returns Session JSON containing sessionId
   * @throws Error if the user loginName is invalid
   */
  async createSession(loginName: string) {
    const response = await fetch(`${ZITADEL_API_URL}/v2/sessions`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        checks: { user: { loginName } },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create session');
    }

    return response.json();
  },

  /**
   * Adds a password check to an existing session.
   * Must run after createSession().
   *
   * @param sessionId - Existing session ID
   * @param password - Plain password for validation
   * @returns Updated session JSON
   * @throws Error if password is wrong
   */
  async updateSessionWithPassword(sessionId: string, password: string) {
    const response = await fetch(`${ZITADEL_API_URL}/v2/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({
        checks: { password: { password } },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Invalid password');
    }

    return response.json();
  },

  /**
   * Fetch full session information.
   *
   * @param sessionId - ID of the session
   * @param sessionToken - Token from password check
   * @returns Session state details
   * @throws Error when session cannot be retrieved
   */
  async getSession(sessionId: string, sessionToken: string) {
    const response = await fetch(`${ZITADEL_API_URL}/v2/sessions/${sessionId}`, {
      method: 'GET',
      headers: {
        ...getHeaders(),
        Authorization: `Bearer ${sessionToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get session');
    }

    return response.json();
  },

  /**
   * Terminates (logs out) a session.
   *
   * @param sessionId - ID of session to terminate
   * @param sessionToken - Session token used to authenticate termination
   * @returns Termination response JSON
   * @throws Error if termination fails
   */
  async terminateSession(sessionId: string, sessionToken: string) {
    const response = await fetch(`${ZITADEL_API_URL}/v2/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: getHeaders(),
      body: JSON.stringify({ sessionToken }),
    });

    if (!response.ok) {
      throw new Error('Failed to terminate session');
    }

    return response.json();
  },

  /**
   * Exchanges a valid sessionToken for OAuth access, ID and refresh tokens.
   *
   * @param sessionId - ID of the authenticated session
   * @param sessionToken - Token returned from session password verification
   * @returns Tokens: access_token, id_token, refresh_token (if scope includes offline_access)
   * @throws Error if token exchange fails
   */
  async createTokens(sessionId: string, sessionToken: string) {
    const response = await fetch(`${ZITADEL_API_URL}/oauth/v2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
        client_id: process.env.CLIENT_ID!,
        scope: 'openid profile email offline_access',
        subject_token: sessionToken,
        subject_token_type: 'urn:ietf:params:oauth:token-type:access_token',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error_description || 'Failed to create tokens');
    }

    return response.json();
  },
};
