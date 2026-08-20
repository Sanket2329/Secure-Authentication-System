# Security Model

This system adheres strictly to OWASP Security Best Practices.

## 1. Authentication & Session Management
- Passwords hashed using `bcrypt` with cost factor 12.
- Sessions managed via Short-Lived JWTs and Long-Lived, Stateful Opaque Refresh Tokens.
- Refresh tokens are hashed using HMAC-SHA256 before database storage to prevent database leaks from compromising active sessions.

## 2. Rate Limiting & Brute Force Protection
- `express-rate-limit` implemented on the `/auth/login` endpoint.
- 5 failed attempts result in a 15-minute lockout.
- Login failures return generic "Invalid email or password" messages to prevent email enumeration.

## 3. Data Isolation (403 vs 404)
- Files are strictly bound to an `owner_id`.
- The system differentiates between "File Not Found" (404) and "File belongs to someone else" (403) to prevent indirect object reference (IDOR) vulnerabilities while maintaining accurate semantics.

## 4. Input Validation & Security Headers
- `Zod` enforces strict type checking and validation on all incoming requests.
- `Helmet` is used to enforce secure HTTP headers (X-Frame-Options, Content-Security-Policy).
- `CORS` is strictly bound to `http://localhost:8080`.

## 5. Secure File Downloads
- File paths are resolved securely.
- Absolute paths are validated using `path.resolve` and `startsWith` to completely mitigate Path Traversal (`../../`) attacks.
