# Zitadel Custom UI with Next.js

A complete custom authentication UI implementation for Zitadel using Next.js 14+ with App Router.

## Features

- ✅ **Custom Registration** - User signup with custom fields + automatic project membership
- ✅ **Custom Login** - OAuth2/OIDC login with access & refresh tokens
- ✅ **Forgot Password** - Password reset flow with email verification
- ✅ **Token Management** - Access token refresh and session handling
- ✅ **Modern UI** - Clean, responsive design with Tailwind CSS

## Prerequisites

1. A running Zitadel instance (Cloud or Self-hosted)
2. Node.js 18+ installed
3. A Zitadel project with:
   - A **Web Application** (for OIDC/OAuth2)
   - A **Service User** with appropriate permissions (for admin operations)

## Zitadel Setup

### 1. Create a Project
1. Go to your Zitadel Console → Projects → Create New Project
2. Note down the **Project ID**

### 2. Create a Web Application (OIDC)
1. In your project, go to Applications → New
2. Select **Web** application type
3. Choose **PKCE** as the authentication method (recommended for SPAs/Next.js)
4. Configure redirect URIs:
   - `http://localhost:3000/api/auth/callback` (development)
   - `https://yourdomain.com/api/auth/callback` (production)
5. Note down the **Client ID**

### 3. Create a Service User (for Admin API)
1. Go to Users → Service Users → New
2. Create a service user for backend operations
3. Generate a **Personal Access Token (PAT)** or **Client Credentials**
4. Grant the service user these roles in your organization:
   - `ORG_USER_MANAGER` (to create users)
   - `PROJECT_OWNER` or appropriate project role (to add users to projects)

### 4. Configure Login Settings
1. Go to Settings → Login Behavior and Policy
2. Enable **Username Password** login
3. Configure password policies as needed

## Environment Variables

Create a `.env.local` file:

```env
# Zitadel Instance
NEXT_PUBLIC_ZITADEL_ISSUER=https://your-instance.zitadel.cloud
NEXT_PUBLIC_ZITADEL_AUTHORITY=https://your-instance.zitadel.cloud

# OIDC Client (Web Application)
NEXT_PUBLIC_ZITADEL_CLIENT_ID=your-client-id
ZITADEL_CLIENT_SECRET=your-client-secret  # Only if using confidential client

# Service User for Admin Operations
ZITADEL_SERVICE_USER_TOKEN=your-service-user-pat

# Project Configuration
ZITADEL_PROJECT_ID=your-project-id
ZITADEL_ORG_ID=your-organization-id

# App Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-random-secret-key-min-32-chars
```

## Installation

```bash
# Clone or copy this project
cd zitadel-nextjs-custom-ui

# Install dependencies
npm install

# Run development server
npm run dev
```

## Project Structure

```
├── app/
│   ├── api/
│   │   └── auth/           # Auth API routes
│   │       ├── callback/   # OIDC callback handler
│   │       ├── login/      # Login API
│   │       ├── register/   # Registration API
│   │       ├── forgot-password/  # Password reset request
│   │       ├── reset-password/   # Password reset completion
│   │       ├── refresh/    # Token refresh
│   │       └── logout/     # Logout handler
│   ├── auth/
│   │   ├── login/          # Login page
│   │   ├── register/       # Registration page
│   │   ├── forgot-password/ # Forgot password page
│   │   └── reset-password/ # Reset password page
│   ├── dashboard/          # Protected dashboard
│   └── layout.tsx
├── lib/
│   ├── zitadel/
│   │   ├── client.ts       # Zitadel API client
│   │   ├── auth.ts         # Auth utilities
│   │   └── types.ts        # TypeScript types
│   └── utils.ts
├── components/
│   └── ui/                 # UI components
├── hooks/
│   └── useAuth.ts          # Auth hook
└── middleware.ts           # Route protection
```

## API Reference

### Zitadel APIs Used

| Feature | API | Endpoint |
|---------|-----|----------|
| Registration | User API v2 | `POST /v2/users/human` |
| Add to Project | Management API | `POST /management/v1/projects/{id}/members` |
| Login | OIDC | `/oauth/v2/authorize` + `/oauth/v2/token` |
| Password Reset | User API v2 | `POST /v2/users/{id}/password_reset` |
| Token Refresh | OIDC | `POST /oauth/v2/token` (grant_type=refresh_token) |

## Usage

### Registration Flow
1. User fills registration form
2. Backend creates user via Zitadel User API v2
3. Backend adds user to project via Management API
4. User receives verification email (if configured)
5. User is redirected to login

### Login Flow
1. User enters credentials
2. PKCE flow initiated with Zitadel
3. After successful auth, tokens stored in secure HTTP-only cookies
4. User redirected to dashboard

### Password Reset Flow
1. User requests password reset with email
2. Zitadel sends reset email with code
3. User enters new password with code
4. Password updated via User API v2

## Security Considerations

- Access tokens stored in HTTP-only cookies
- PKCE used for OAuth2 flow
- CSRF protection enabled
- All API routes validate tokens server-side
- Refresh tokens rotated on use

## Troubleshooting

### Common Issues

1. **CORS errors**: Ensure your Zitadel instance allows your domain
2. **Invalid redirect URI**: Check exact match in Zitadel app config
3. **Permission denied**: Verify service user has required roles
4. **Token expired**: Implement token refresh or re-login

## Resources

- [Zitadel Documentation](https://zitadel.com/docs)
- [Zitadel API Reference](https://zitadel.com/docs/apis/introduction)
- [Next.js Documentation](https://nextjs.org/docs)
