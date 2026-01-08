const ZITADEL_API_URL = process.env.ZITADEL_API_URL!;
const SERVICE_TOKEN = process.env.ZITADEL_SERVICE_USER_TOKEN!;

interface ZitadelHeaders {
  'Content-Type': string;
  'Authorization': string;
  'Accept': string;
}

const getHeaders = (): ZitadelHeaders => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${SERVICE_TOKEN}`,
  'Accept': 'application/json',
});

export const zitadelClient = {
  // Create a new user
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
          givenName: data.firstName || '',
          familyName: data.lastName || '',
          displayName: `${data.firstName || ''} ${data.lastName || ''}`.trim(),
        },
        email: {
          email: data.email,
          isVerified: false, // Set to true if you don't want email verification
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

  // Create session with username check
  async createSession(loginName: string) {
    const response = await fetch(`${ZITADEL_API_URL}/v2/sessions`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        checks: {
          user: { loginName },
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create session');
    }

    return response.json();
  },

  // Update session with password check
  async updateSessionWithPassword(sessionId: string, password: string) {
    const response = await fetch(
      `${ZITADEL_API_URL}/v2/sessions/${sessionId}`,
      {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({
          checks: {
            password: { password },
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Invalid password');
    }

    return response.json();
  },

  // Get session details
  async getSession(sessionId: string, sessionToken: string) {
    const response = await fetch(
      `${ZITADEL_API_URL}/v2/sessions/${sessionId}`,
      {
        method: 'GET',
        headers: {
          ...getHeaders(),
          'Authorization': `Bearer ${sessionToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to get session');
    }

    return response.json();
  },

  // Terminate session (logout)
  async terminateSession(sessionId: string, sessionToken: string) {
    const response = await fetch(
      `${ZITADEL_API_URL}/v2/sessions/${sessionId}`,
      {
        method: 'DELETE',
        headers: getHeaders(),
        body: JSON.stringify({ sessionToken }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to terminate session');
    }

    return response.json();
  },
};