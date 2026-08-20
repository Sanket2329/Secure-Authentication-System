# REST API Documentation

Both backends expose the following identical REST API:

## Authentication

### `POST /auth/register`
- **Body**: `{ "email": "test@example.com", "password": "StrongPassword123!" }`
- **Response**: `201 Created`

### `POST /auth/login`
- **Body**: `{ "email": "test@example.com", "password": "StrongPassword123!" }`
- **Response**: `200 OK`
  - Body: `{ "success": true, "accessToken": "ey..." }`
  - Headers: `Set-Cookie: refreshToken=...; HttpOnly; Secure; SameSite=Strict`

### `POST /auth/refresh`
- **Action**: Trades a valid `refreshToken` cookie for a new JWT Access Token and a new Refresh Token (Rotation).
- **Response**: `200 OK`
  - Body: `{ "success": true, "accessToken": "ey..." }`
  - Headers: `Set-Cookie: refreshToken=...; HttpOnly; Secure; SameSite=Strict`

### `POST /auth/logout`
- **Response**: `200 OK`
  - Headers: clears the `refreshToken` cookie.

## Protected Endpoints
*Requires header: `Authorization: Bearer <accessToken>`*

### `GET /api/me`
- **Response**: `200 OK`
  - Body: `{ "success": true, "data": { "id": "uuid", "email": "..." } }`

### `GET /api/files`
- **Response**: List of files owned by the user.

### `GET /api/files/:id`
- **Security**: Returns `404 Not Found` if file doesn't exist. Returns `403 Forbidden` if file exists but belongs to another user.

### `GET /api/files/:id/download`
- **Action**: Streams the file securely without exposing the internal filesystem path. Prevents path traversal attacks.
