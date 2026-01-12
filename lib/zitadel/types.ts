// Zitadel API Types based on latest Zitadel v2 API

export interface ZitadelConfig {
  issuer: string;
  clientId: string;
  clientSecret?: string;
  serviceUserToken: string;
  projectId: string;
  orgId: string;
}

// User API v2 Types
export interface CreateHumanUserRequest {
  userId?: string;
  username?: string;
  organization?: {
    orgId?: string;
    orgDomain?: string;
  };
  profile: {
    givenName: string;
    familyName: string;
    nickName?: string;
    displayName?: string;
    preferredLanguage?: string;
    gender?: 'GENDER_UNSPECIFIED' | 'GENDER_FEMALE' | 'GENDER_MALE' | 'GENDER_DIVERSE';
  };
  email: {
    email: string;
    isVerified?: boolean;
  };
  phone?: {
    phone: string;
    isVerified?: boolean;
  };
  password?: {
    password: string;
    changeRequired?: boolean;
  };
  hashedPassword?: {
    hash: string;
    algorithm: string;
  };
  idpLinks?: Array<{
    idpId: string;
    userId: string;
    userName: string;
  }>;
  totpSecret?: string;
}

export interface CreateHumanUserResponse {
  userId: string;
  details: {
    sequence: string;
    changeDate: string;
    resourceOwner: string;
  };
  emailCode?: string;
  phoneCode?: string;
}

// Password Reset Types
export interface RequestPasswordResetRequest {
  userId: string;
  sendLink?: {
    notificationType?: 'NOTIFICATION_TYPE_Email' | 'NOTIFICATION_TYPE_SMS';
    urlTemplate?: string;
  };
  returnCode?: boolean;
}

export interface RequestPasswordResetResponse {
  details: {
    sequence: string;
    changeDate: string;
    resourceOwner: string;
  };
  verificationCode?: string;
}

export interface SetPasswordRequest {
  newPassword: {
    password: string;
    changeRequired?: boolean;
  };
  currentPassword?: string;
  verificationCode?: string;
}

export interface SetPasswordResponse {
  details: {
    sequence: string;
    changeDate: string;
    resourceOwner: string;
  };
}

// Project Membership Types
export interface AddProjectMemberRequest {
  userId: string;
  roles: string[];
}

export interface AddProjectMemberResponse {
  details: {
    sequence: string;
    changeDate: string;
    resourceOwner: string;
  };
}

// OIDC Token Types
export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  id_token?: string;
  scope?: string;
}

export interface TokenError {
  error: string;
  error_description?: string;
}

// User Session Types
export interface UserSession {
  userId: string;
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  expiresAt: number;
  user?: {
    sub: string;
    name?: string;
    given_name?: string;
    family_name?: string;
    email?: string;
    email_verified?: boolean;
    preferred_username?: string;
  };
}

// API Error Types
export interface ZitadelApiError {
  code: number;
  message: string;
  details?: Array<{
    '@type': string;
    [key: string]: unknown;
  }>;
}

// User Lookup Types
export interface SearchUsersRequest {
  query?: {
    offset?: string;
    limit?: number;
    asc?: boolean;
  };
  sortingColumn?: 'USER_FIELD_NAME_UNSPECIFIED' | 'USER_FIELD_NAME_EMAIL' | 'USER_FIELD_NAME_USER_NAME';
  queries?: Array<{
    emailQuery?: {
      emailAddress: string;
      method: 'TEXT_QUERY_METHOD_EQUALS' | 'TEXT_QUERY_METHOD_EQUALS_IGNORE_CASE' | 'TEXT_QUERY_METHOD_STARTS_WITH' | 'TEXT_QUERY_METHOD_STARTS_WITH_IGNORE_CASE' | 'TEXT_QUERY_METHOD_CONTAINS' | 'TEXT_QUERY_METHOD_CONTAINS_IGNORE_CASE' | 'TEXT_QUERY_METHOD_ENDS_WITH' | 'TEXT_QUERY_METHOD_ENDS_WITH_IGNORE_CASE';
    };
    userNameQuery?: {
      userName: string;
      method: 'TEXT_QUERY_METHOD_EQUALS' | 'TEXT_QUERY_METHOD_EQUALS_IGNORE_CASE' | 'TEXT_QUERY_METHOD_STARTS_WITH' | 'TEXT_QUERY_METHOD_STARTS_WITH_IGNORE_CASE' | 'TEXT_QUERY_METHOD_CONTAINS' | 'TEXT_QUERY_METHOD_CONTAINS_IGNORE_CASE' | 'TEXT_QUERY_METHOD_ENDS_WITH' | 'TEXT_QUERY_METHOD_ENDS_WITH_IGNORE_CASE';
    };
  }>;
}

export interface SearchUsersResponse {
  details: {
    totalResult: string;
    processedSequence: string;
    timestamp: string;
  };
  sortingColumn: string;
  result: Array<{
    userId: string;
    details: {
      sequence: string;
      changeDate: string;
      resourceOwner: string;
    };
    state: 'USER_STATE_UNSPECIFIED' | 'USER_STATE_ACTIVE' | 'USER_STATE_INACTIVE' | 'USER_STATE_DELETED' | 'USER_STATE_LOCKED' | 'USER_STATE_INITIAL';
    username: string;
    loginNames: string[];
    preferredLoginName: string;
    human?: {
      profile: {
        givenName: string;
        familyName: string;
        nickName?: string;
        displayName?: string;
        preferredLanguage?: string;
        gender?: string;
        avatarUrl?: string;
      };
      email: {
        email: string;
        isVerified: boolean;
      };
      phone?: {
        phone: string;
        isVerified: boolean;
      };
    };
    machine?: {
      name: string;
      description?: string;
    };
  }>;
}

// PKCE Types
export interface PKCEChallenge {
  codeVerifier: string;
  codeChallenge: string;
  state: string;
}
