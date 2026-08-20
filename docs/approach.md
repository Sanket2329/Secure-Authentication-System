# Engineering Approach & Interview Guide

This document provides a comprehensive, interview-ready breakdown of the architectural decisions, design patterns, and security paradigms implemented in the **Secure Authentication System**.

## 1. Architectural Philosophy

The overarching goal of this project was to build a production-quality, highly secure system while maintaining strict adherence to the **Clean Architecture** and **SOLID principles**. 

### 1.1 Dual-Backend Abstraction
The assignment required the frontend to work identically across two drastically different backends.
* **Backend 1 (Custom)**: A highly-tuned Node.js/PostgreSQL REST API built completely from scratch using Clean Architecture.
* **Backend 2 (Appwrite)**: A managed Backend-as-a-Service integration. Instead of building a redundant proxy server, this implementation strictly adheres to BaaS best practices by connecting the client directly to Appwrite via the `appwrite-adapter.js` using the Appwrite Web SDK.
* **Why**: This demonstrates two distinct architectural skill sets: Building a secure system from scratch (Backend 1), and properly leveraging a modern Serverless/BaaS platform directly from the client (Backend 2).

### 1.2 Custom Backend Structure
The custom Node.js backend follows a layered architecture:
* **Routes Layer**: Handles HTTP routing and applies middlewares (e.g., rate limiting, JWT validation).
* **Controller Layer**: Extracts request data, handles HTTP response codes, and manages cookies.
* **Service Layer (`TokenService`)**: Contains business logic (generating JWTs, hashing).
* **Data Access Layer (`UserModel`, `FileModel`)**: Encapsulates raw SQL queries to PostgreSQL.
* **Why**: This separation of concerns ensures testability. We can swap PostgreSQL for MySQL or change the JWT library without rewriting our controllers.

## 2. Security & Authorization Paradigm

Security was not treated as an afterthought; it was baked into the core design using OWASP best practices.

### 2.1 The JWT vs. Session Hybrid Model
The age-old debate of "JWT vs. Stateful Sessions" was solved by using a **Hybrid Approach**:
1. **Access Tokens (JWT)**: Short-lived (15 minutes), stateless, and fast. They are sent in the JSON response payload and used for authorization (`Bearer <token>`).
2. **Refresh Tokens (Opaque Strings)**: Long-lived (7 days), stateful, cryptographically random strings. They are stored as **HttpOnly cookies** (immune to XSS) and their **SHA-256 hashes** are stored in the database.

* **Why**: Pure JWTs are impossible to revoke instantly without complex blacklists. Pure sessions require a database hit on every API call. This hybrid approach gives us the speed of stateless JWTs with the instant revocability (during logout or compromise) of stateful sessions.
* **Why Hash the Refresh Token?**: If an attacker gains read-only access to our database, they cannot hijack active sessions because the database only stores the hashes, not the plaintext tokens stored in the users' cookies.

### 2.2 Refresh Token Rotation & Anomaly Detection
The system implements **Refresh Token Rotation (RTR)**. When a refresh token is used at the `/auth/refresh` endpoint, it is immediately revoked, and a new one is issued.
* **Anomaly Detection**: If an attacker steals an old, already-revoked refresh token and attempts to use it, the system flags this as a security anomaly and instantly revokes **all** active sessions for that user, killing the attacker's access immediately.

### 2.3 Data Isolation & Insecure Direct Object Reference (IDOR) Prevention
The `GET /api/files/:id` endpoint explicitly guards against unauthorized data access.
* **The Logic**: 
  1. Check if the file exists. If no -> `404 Not Found`.
  2. Check if `file.owner_id === req.user.userId`. If no -> `403 Forbidden`.
* **Why**: Returning `404` for files that *do exist but don't belong to the user* (a common but flawed practice) prevents data leakage, but returning `403` when appropriate is better for precise API semantics. However, in highly classified systems (like Appwrite's internal Document Security), existence itself is hidden, which is why the Appwrite implementation elegantly maps to `404` for unauthorized access to mirror zero-trust data stores.

### 2.3 Path Traversal Prevention
File downloads use `path.resolve` and strict prefix checking (`safePath.startsWith(uploadsDir)`) to ensure malicious inputs like `../../etc/passwd` are structurally blocked.

### 2.4 Brute Force & Rate Limiting
* **Approach**: `express-rate-limit` enforces a strict 5-attempt limit per 15 minutes on the login endpoint. 
* **Generic Errors**: The API intentionally returns "Invalid email or password" whether the email is wrong or the password is wrong. This mitigates **User Enumeration Attacks**.

## 3. Database Design

We opted for **Raw SQL** via the `pg` driver over a heavy ORM (like Prisma or TypeORM) to maximize performance, transparency, and explicit control over constraints.

* **UUID Primary Keys**: Prevents attackers from guessing sequential user or file IDs (e.g., `/files/1`, `/files/2`).
* **Foreign Key Cascades**: `ON DELETE CASCADE` ensures that if a user is deleted, all their files and refresh sessions are wiped automatically, preventing orphaned data.
* **Indexes**: Added B-Tree indexes to `owner_id` and `user_id` to guarantee fast O(log N) lookups for relationship queries.

## 4. Appwrite Implementation Nuances

Appwrite acts as an out-of-the-box Backend-as-a-Service, so the implementation lives primarily in the configuration and the `appwrite-adapter.js`.
* **Automatic Features**: Appwrite handles password hashing (Argon2), automatic rate limiting, and session management natively. 
* **Document-Level Security**: When setting up the `Files` collection, we assigned permissions based on the specific `user`. Appwrite's database inherently filters documents at the query level. When `appwrite-adapter.js` calls `databases.listDocuments()`, Appwrite automatically only returns documents the user is authorized to see. This drastically reduces backend boilerplate code.
* **Zero-Trust (403 vs 404)**: While our Custom Backend explicitly returns a 403 Forbidden if a file exists but isn't yours, Appwrite handles this inherently by returning `404 Not Found` for unauthorized files. This is a common security pattern in cloud environments (like AWS S3) to hide the existence of restricted resources entirely.

## 6. Future Technical Improvements (If Scaling)
In an interview, discussing what you *left out* and *why* is just as important as what you built:
1. **Redis**: Moving the stateful Refresh Tokens from PostgreSQL into Redis with native TTLs for faster, in-memory validation.
2. **MFA**: Adding Time-Based One-Time Passwords (TOTP) or WebAuthn.
3. **Audit Logging**: Pushing failed login attempts to an Elasticsearch or Datadog cluster for observability and SIEM alerting, rather than a Postgres table.
