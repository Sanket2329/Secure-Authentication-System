<div align="center">
  <img src="https://img.shields.io/badge/Security-OWASP_Top_10-red?style=for-the-badge&logo=security" alt="Security" />
  <img src="https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js" alt="Node" />
  <img src="https://img.shields.io/badge/PostgreSQL-Raw_SQL-4169E1?style=for-the-badge&logo=postgresql" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Appwrite-BaaS-F02E65?style=for-the-badge&logo=appwrite" alt="Appwrite" />
  <br />
  <h1>🛡️ Secure Authentication System</h1>
  <p>A production-quality, dual-backend authentication architecture implementing advanced security paradigms, strict data isolation, and refresh token rotation.</p>
</div>

---

## 📖 Overview

This project was developed to demonstrate elite-level backend engineering and security practices. It implements a fully-featured authentication and file-access system across **two completely distinct backend architectures** that conform to an identical frontend REST contract.

1. **Custom Node.js Backend**: A highly-tuned, from-scratch REST API built with Node.js, Express, and PostgreSQL. It implements a Hybrid JWT/Cookie auth model, Refresh Token Rotation, and strict Row-Level Security checks.
2. **Managed Appwrite Backend**: A native Backend-as-a-Service (BaaS) implementation utilizing Appwrite's Web SDK to demonstrate direct client-to-cloud architecture and Document-Level Security.

---

## 🚀 Quick Start Guide

### Option A: Custom Node.js Backend (Recommended)
*Requires Docker and Node.js.*

```bash
# 1. Start the PostgreSQL Database
docker-compose up -d

# 2. Install dependencies
cd custom-backend
npm install

# 3. Seed the database with mock users (Alice, Bob, Charlie)
npm run seed

# 4. Start the development server
npm run dev
```
Open the provided `index.html` in your browser. Select **Custom REST backend**, wait for the seeded credentials to populate, and log in!

### Option B: Managed Appwrite Backend
1. Create a free account on [Appwrite Cloud](https://cloud.appwrite.io/).
2. Create a Database and a `files` Collection. Enable Document Security.
3. Open `index.html` in your browser, select **Appwrite mode**, and fill in your Project ID and Database ID at the top.
4. Uncomment the Appwrite SDK scripts at the bottom of `index.html` to enable the `appwrite-adapter.js` file.

---

## 🧠 Architectural & Security Decisions (Q&A)

As requested, below are the detailed justifications for the architectural and security decisions made during the development of this system.

### 1. JWT vs. Session-Based Authentication
**Decision:** A **Hybrid Approach** (Short-lived JWTs + Stateful Opaque Refresh Tokens).

**Justification:**
Pure JWTs are stateless and impossible to revoke instantly without complex, heavily-cached blacklists (defeating their purpose). Pure stateful sessions require a database hit on every single API request, increasing latency. 
To achieve the best of both worlds, this system uses:
- **Access Tokens (JWT)**: Short-lived (15 mins), stateless, and incredibly fast. Used for authorization (`Bearer <token>`).
- **Refresh Tokens (Opaque)**: Long-lived (7 days), stateful, cryptographically random strings. They are stored as **HttpOnly cookies** (immune to XSS) and their **SHA-256 hashes** are stored in the database.

**Security Flex: Refresh Token Rotation (RTR)**
The system implements RTR with Anomaly Detection. Every time a refresh token is used, it is revoked and a new one is issued. If a stolen, already-revoked token is reused, the system detects the anomaly and instantly revokes *all* active sessions for that user.

### 2. How Logout is Implemented
When a user requests to log out, the server extracts the `refreshToken` from the HttpOnly cookie. It hashes the token, locates the corresponding session in the `refresh_sessions` PostgreSQL table, and updates `revoked = true`. The browser's cookie is then cleared. Because the JWT Access Token expires naturally within 15 minutes and the refresh token is dead, the session is permanently and instantly invalidated server-side.

### 3. Enforcing User Data Isolation (IDOR Prevention)
Data isolation is strictly enforced at both the database schema and application layers.
- **Schema**: The `files` table uses an `owner_id` Foreign Key linked to `users.id` with `ON DELETE CASCADE`.
- **Middleware Logic**: When hitting `GET /api/files/:id`, the system queries the file. If it doesn't exist, it returns `404 Not Found`. If it *does* exist, it explicitly verifies `file.owner_id === req.user.userId`.
- **403 vs 404**: If the file belongs to a different user, the API intentionally returns `403 Forbidden`. This explicitly rejects unauthorized access while avoiding confusing existence with permission.

### 4. Appwrite: Automatic vs. Configured
- **Handled Automatically by Appwrite**: Password hashing (Argon2), generic JWT/Session generation, brute-force rate limiting, and inherent Document-Level Security (row-level filtering).
- **Configured Manually**: We wrote `appwrite-adapter.js` utilizing the Web SDK to map the frontend's REST calls directly to Appwrite's Cloud APIs. We bypassed a proxy server entirely, strictly adhering to true BaaS client-to-cloud architecture. We manually configured the Collections, Storage Buckets, and assigned read/write permissions directly to specific user IDs.

### 5. Future Improvements (Given More Time)
1. **Redis Session Store**: Moving the stateful Refresh Tokens from PostgreSQL into a Redis cluster for microsecond lookups and native TTL expirations.
2. **Multi-Factor Authentication (MFA)**: Implementing Time-Based One-Time Passwords (TOTP) or WebAuthn to secure the login endpoint against compromised passwords.
3. **Audit Logging & Observability**: Pushing failed login attempts and anomaly detections (like reused revoked tokens) to a Datadog or Elasticsearch SIEM cluster for real-time alerting.
4. **CI/CD Pipeline**: Implementing GitHub Actions to automatically run our comprehensive Jest security test matrix against a ephemeral PostgreSQL container on every push.

---

## 🧪 Testing

The custom backend is heavily tested for security flaws (User Enumeration, IDOR, Token Reuse) using `Jest` and `Supertest`. 

To run the test matrix:
```bash
cd custom-backend
npm run test
```

*Designed with ❤️ adhering to Clean Architecture and OWASP Top 10.*
