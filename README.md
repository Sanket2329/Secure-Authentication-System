# Secure Authentication System

A production-quality authentication system built with two completely separate backends exposing identical REST APIs.

## Project Structure

```
Secure-Login-System/
├── custom-backend/   # Node.js, Express, PostgreSQL Implementation
├── appwrite-adapter.js # Appwrite SDK Implementation
├── frontend/         # Frontend Files (Provided)
├── docs/             # Documentation
├── docker-compose.yml
└── README.md
```

1. **Custom Backend (`/custom-backend`)**: A robust, from-scratch implementation using Node.js, Express, and PostgreSQL. It implements a Hybrid JWT/Cookie auth model, Refresh Token Rotation, and strict Row-Level Security checks.
2. **Appwrite Backend (`appwrite-adapter.js`)**: A native BaaS implementation using Appwrite's Web SDK. It leverages Appwrite's built-in Document-Level Security to authorize and fetch files without any middleware.

## Getting Started

### Option 1: Custom Node.js Backend

1. **Setup Database**:
   ```bash
   docker-compose up -d
   ```
2. **Install & Run**:
   ```bash
   cd custom-backend
   npm install
   npm run seed
   npm run dev
   ```
3. **Run Tests** (Optional):
   ```bash
   npm run test
   ```
4. **Test in UI**:
   Open `index.html` in your browser. Select **Custom REST backend**. Wait for the seeded data, and log in!

### Option 2: Appwrite Backend

1. Create a free account on [Appwrite Cloud](https://cloud.appwrite.io/).
2. Create a Database and a `files` Collection. Enable Document Security.
3. Open `index.html` in your browser, select **Appwrite mode**, and fill in your Project ID and Database ID at the top.
4. Uncomment the Appwrite SDK scripts at the bottom of `index.html` to enable the `appwrite-adapter.js` file.

---

## Assignment Questions

### JWT vs Session
**Decision**: We use a Hybrid approach: **Short-lived JWTs (15m)** for stateless, fast API authorization, and **Stateful, Hashed Opaque Refresh Tokens (7 days)** for secure session management.
- **Refresh Token Rotation (RTR)**: The system implements RTR with Anomaly Detection. Every time a refresh token is used, it is revoked and a new one is issued. If a stolen, revoked token is reused, the system detects the anomaly and revokes *all* active sessions for that user instantly.
- **Advantages**: Access tokens are fast and don't require a DB lookup. Refresh tokens are stateful, meaning we can revoke them instantly if a user logs out or an account is compromised.

### Logout
Logout works by extracting the HttpOnly `refreshToken` cookie. We hash this token, look it up in the `refresh_sessions` table, and set `revoked = true`. Then, we clear the cookie from the browser. The short-lived JWT will expire naturally within 15 minutes, rendering the session dead.

### User Isolation
Data isolation is achieved at the database and application layer.
- **Database**: The `files` table has an `owner_id` Foreign Key linked to `users.id`.
- **Middleware**: The `FileController.getFile` method explicitly checks `if (file.owner_id !== req.user.userId) return res.status(403)`.
- **403 vs 404**: We return 404 if the file doesn't exist, and 403 if it exists but belongs to someone else, ensuring we don't confuse existence with permission.

### Appwrite
- **Automatic**: Appwrite handles password hashing (Argon2), generic JWT/Session generation, rate limiting, and Document/File-level security.
- **Manual**: We implemented `appwrite-adapter.js` using the Web SDK to intercept the frontend's REST calls and map them directly to Appwrite's database and storage APIs, bypassing the need for a proxy server entirely.

### Improvements
- **MFA (Multi-Factor Authentication)**: Adding TOTP or WebAuthn for enhanced security.
- **Redis Session Store**: Moving refresh tokens from PostgreSQL to Redis for faster lookup and automatic TTL expiration.
- **OAuth**: Integrating Google/GitHub SSO.
- **Audit Logging**: Tracking every login, file access, and logout in a dedicated Elasticsearch/Postgres audit table.
