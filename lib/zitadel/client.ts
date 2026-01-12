import {
  CreateHumanUserRequest,
  CreateHumanUserResponse,
  AddProjectMemberResponse,
  TokenResponse,
  ZitadelApiError,
  SearchUsersResponse,
  RequestPasswordResetResponse,
  SetPasswordResponse,
} from './types';

/**
 * Zitadel API Client
 * 
 * This client handles all Zitadel API interactions including:
 * - User management (v2 API)
 * - Session management (v2 API) - for custom login UI
 * - Project membership (Management API)
 * - OIDC token operations
 * - Password reset flows
 */
class ZitadelClient {
  private issuer: string;
  private serviceUserToken: string;
  private projectId: string;
  private orgId: string;

  constructor() {
    this.issuer = process.env.NEXT_PUBLIC_ZITADEL_ISSUER || '';
    this.serviceUserToken = process.env.ZITADEL_SERVICE_USER_TOKEN || '';
    this.projectId = process.env.ZITADEL_PROJECT_ID || '';
    this.orgId = process.env.ZITADEL_ORG_ID || '';

    if (!this.issuer) {
      console.warn('NEXT_PUBLIC_ZITADEL_ISSUER is not configured');
    }
  }

  /**
   * Get authorization headers for service user requests
   */
  private getServiceHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.serviceUserToken}`,
      'Accept': 'application/json',
    };
  }

  /**
   * Handle API errors consistently with better error messages
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `API request failed with status ${response.status}`;
      
      try {
        const errorData = JSON.parse(errorText) as ZitadelApiError;
        errorMessage = errorData.message || errorMessage;
        console.error('Zitadel API Error:', {
          status: response.status,
          message: errorData.message,
          details: errorData.details,
        });
      } catch {
        console.error('Zitadel API Error (raw):', errorText);
      }
      
      throw new Error(errorMessage);
    }
    return response.json() as Promise<T>;
  }

  // ==========================================
  // USER MANAGEMENT (v2 API)
  // ==========================================

  /**
   * Create a new human user
   * 
   * @see https://zitadel.com/docs/apis/resources/user_service_v2/user-service-add-human-user
   */
  async createUser(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    username?: string;
    displayName?: string;
  }): Promise<CreateHumanUserResponse> {
    const request: CreateHumanUserRequest = {
      username: userData.username || userData.email,
      organization: {
        orgId: this.orgId,
      },
      profile: {
        givenName: userData.firstName,
        familyName: userData.lastName,
        displayName: userData.displayName || `${userData.firstName} ${userData.lastName}`,
      },
      email: {
        email: userData.email,
        isVerified: false, // Will send verification email
      },
      password: {
        password: userData.password,
        changeRequired: false,
      },
    };

    const response = await fetch(`${this.issuer}/v2/users/human`, {
      method: 'POST',
      headers: this.getServiceHeaders(),
      body: JSON.stringify(request),
    });

    return this.handleResponse<CreateHumanUserResponse>(response);
  }

  /**
   * Search for users by email
   */
  async findUserByEmail(email: string): Promise<SearchUsersResponse> {
    const response = await fetch(`${this.issuer}/v2/users`, {
      method: 'POST',
      headers: this.getServiceHeaders(),
      body: JSON.stringify({
        queries: [
          {
            emailQuery: {
              emailAddress: email,
              method: 'TEXT_QUERY_METHOD_EQUALS_IGNORE_CASE',
            },
          },
        ],
      }),
    });

    return this.handleResponse<SearchUsersResponse>(response);
  }

  // ==========================================
  // SESSION API (v2) - For Custom Login UI
  // ==========================================

  /**
   * Create a new session with password check
   * This is the recommended approach for custom login UIs
   * 
   * @see https://zitadel.com/docs/apis/resources/session_service_v2/session-service-create-session
   */
  async createSession(loginName: string, password: string): Promise<{
    sessionId: string;
    sessionToken: string;
    userId: string;
    factors: {
      user?: {
        id: string;
        loginName: string;
        displayName?: string;
      };
    };
  }> {
    const response = await fetch(`${this.issuer}/v2/sessions`, {
      method: 'POST',
      headers: this.getServiceHeaders(),
      body: JSON.stringify({
        checks: {
          user: {
            loginName: loginName,
          },
          password: {
            password: password,
          },
        },
        // Request lifetime for the session
        lifetime: '43200s', // 12 hours
      }),
    });

    const data = await this.handleResponse<{
      details: { sequence: string; changeDate: string; resourceOwner: string };
      sessionId: string;
      sessionToken: string;
    }>(response);

    // Get session details to extract user info
    const sessionDetails = await this.getSession(data.sessionId, data.sessionToken);

    return {
      sessionId: data.sessionId,
      sessionToken: data.sessionToken,
      userId: sessionDetails.session.factors?.user?.id || '',
      factors: sessionDetails.session.factors,
    };
  }

  /**
   * Get session details
   */
  async getSession(sessionId: string, sessionToken: string): Promise<{
    session: {
      id: string;
      creationDate: string;
      changeDate: string;
      sequence: string;
      factors: {
        user?: {
          id: string;
          loginName: string;
          displayName?: string;
          organizationId?: string;
        };
        password?: {
          verifiedAt: string;
        };
      };
      expirationDate?: string;
    };
  }> {
    const response = await fetch(`${this.issuer}/v2/sessions/${sessionId}`, {
      method: 'GET',
      headers: {
        ...this.getServiceHeaders(),
        'x-zitadel-session-token': sessionToken,
      },
    });

    return this.handleResponse(response);
  }

  /**
   * Delete/invalidate a session (logout)
   */
  async deleteSession(sessionId: string, sessionToken: string): Promise<void> {
    await fetch(`${this.issuer}/v2/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: {
        ...this.getServiceHeaders(),
        'x-zitadel-session-token': sessionToken,
      },
    });
  }

  // ==========================================
  // PROJECT MEMBERSHIP (Management API)
  // ==========================================

  /**
   * Add a user to a project with specified roles
   * 
   * @see https://zitadel.com/docs/apis/resources/mgmt/management-service-add-project-member
   */
  async addUserToProject(
    userId: string,
    roles: string[] = ['user']
  ): Promise<AddProjectMemberResponse> {
    const response = await fetch(
      `${this.issuer}/management/v1/projects/${this.projectId}/members`,
      {
        method: 'POST',
        headers: this.getServiceHeaders(),
        body: JSON.stringify({
          userId,
          // roles,
        }),
      }
    );

    return this.handleResponse<AddProjectMemberResponse>(response);
  }

  /**
   * Grant a user access to an application in the project
   * This creates a user grant which gives the user permissions to access the app
   */
  async createUserGrant(
    userId: string,
    roleKeys: string[] = ['user']
  ): Promise<{ userGrantId: string }> {
    const response = await fetch(
      `${this.issuer}/management/v1/users/${userId}/grants`,
      {
        method: 'POST',
        headers: this.getServiceHeaders(),
        body: JSON.stringify({
          projectId: this.projectId,
          roleKeys,
        }),
      }
    );

    return this.handleResponse<{ userGrantId: string }>(response);
  }

  // ==========================================
  // PASSWORD RESET (v2 API)
  // ==========================================

  /**
   * Request password reset for a user
   * This will send a password reset email to the user
   * 
   * @see https://zitadel.com/docs/apis/resources/user_service_v2/user-service-password-reset
   */
  async requestPasswordReset(
    userId: string,
    returnCode: boolean = false
  ): Promise<RequestPasswordResetResponse> {
    const response = await fetch(
      `${this.issuer}/v2/users/${userId}/password_reset`,
      {
        method: 'POST',
        headers: this.getServiceHeaders(),
        body: JSON.stringify({
          sendLink: {
            notificationType: 'NOTIFICATION_TYPE_Email',
          },
          returnCode,
        }),
      }
    );

    return this.handleResponse<RequestPasswordResetResponse>(response);
  }

  /**
   * Set a new password using verification code
   * 
   * @see https://zitadel.com/docs/apis/resources/user_service_v2/user-service-set-password
   */
  async setPassword(
    userId: string,
    newPassword: string,
    verificationCode: string
  ): Promise<SetPasswordResponse> {
    const response = await fetch(
      `${this.issuer}/v2/users/${userId}/password`,
      {
        method: 'POST',
        headers: this.getServiceHeaders(),
        body: JSON.stringify({
          newPassword: {
            password: newPassword,
            changeRequired: false,
          },
          verificationCode,
        }),
      }
    );

    return this.handleResponse<SetPasswordResponse>(response);
  }

  // ==========================================
  // OIDC TOKEN OPERATIONS
  // ==========================================

  /**
   * Exchange authorization code for tokens (PKCE flow)
   */
  async exchangeCodeForTokens(
    code: string,
    codeVerifier: string,
    redirectUri: string
  ): Promise<TokenResponse> {
    const clientId = process.env.NEXT_PUBLIC_ZITADEL_CLIENT_ID || '';
    const clientSecret = process.env.ZITADEL_CLIENT_SECRET;

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      code_verifier: codeVerifier,
    });

    // Add client secret if using confidential client
    if (clientSecret) {
      params.append('client_secret', clientSecret);
    }

    const response = await fetch(`${this.issuer}/oauth/v2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    return this.handleResponse<TokenResponse>(response);
  }

  /**
   * Refresh session and return new tokens
   */
  async refreshSession(sessionId: string, sessionToken: string): Promise<{
    sessionToken: string;
    expiresAt: number;
  }> {
    // Validate session is still active
    const sessionDetails = await this.getSession(sessionId, sessionToken);
    
    // Calculate expiry
    const expiresAt = sessionDetails.session.expirationDate 
      ? new Date(sessionDetails.session.expirationDate).getTime()
      : Date.now() + 3600 * 1000;

    return {
      sessionToken,
      expiresAt,
    };
  }

  /**
   * Revoke a token (access or refresh)
   */
  async revokeToken(token: string): Promise<void> {
    const clientId = process.env.NEXT_PUBLIC_ZITADEL_CLIENT_ID || '';
    const clientSecret = process.env.ZITADEL_CLIENT_SECRET;

    const params = new URLSearchParams({
      token,
      client_id: clientId,
    });

    if (clientSecret) {
      params.append('client_secret', clientSecret);
    }

    await fetch(`${this.issuer}/oauth/v2/revoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
  }

  /**
   * Get user info from access token
   */
  async getUserInfo(accessToken: string): Promise<Record<string, unknown>> {
    const response = await fetch(`${this.issuer}/oidc/v1/userinfo`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return this.handleResponse<Record<string, unknown>>(response);
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<{
    user: {
      userId: string;
      state: string;
      username: string;
      loginNames: string[];
      preferredLoginName: string;
      human?: {
        profile: {
          givenName: string;
          familyName: string;
          displayName?: string;
        };
        email: {
          email: string;
          isVerified: boolean;
        };
      };
    };
  }> {
    const response = await fetch(`${this.issuer}/v2/users/${userId}`, {
      method: 'GET',
      headers: this.getServiceHeaders(),
    });

    return this.handleResponse(response);
  }

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  /**
   * Get the OIDC discovery document
   */
  async getDiscoveryDocument(): Promise<Record<string, unknown>> {
    const response = await fetch(
      `${this.issuer}/.well-known/openid-configuration`
    );
    return this.handleResponse<Record<string, unknown>>(response);
  }

  /**
   * Get the authorization URL for PKCE flow
   */
  getAuthorizationUrl(params: {
    redirectUri: string;
    codeChallenge: string;
    state: string;
    scopes?: string[];
  }): string {
    const clientId = process.env.NEXT_PUBLIC_ZITADEL_CLIENT_ID || '';
    const scopes = params.scopes || ['openid', 'profile', 'email', 'offline_access'];

    const searchParams = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: params.redirectUri,
      scope: scopes.join(' '),
      code_challenge: params.codeChallenge,
      code_challenge_method: 'S256',
      state: params.state,
    });

    return `${this.issuer}/oauth/v2/authorize?${searchParams.toString()}`;
  }
}

// Export singleton instance
export const zitadelClient = new ZitadelClient();

// Also export class for testing
export { ZitadelClient };
