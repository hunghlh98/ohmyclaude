---
name: api-design
description: REST and GraphQL API design — resource naming, status codes, request/response schemas, pagination, versioning, and error formats. Used by @beck-backend when designing APIs and by @artie-arch when defining interface contracts in the SDD.
origin: ohmyclaude
---

# API Design

Use this skill when the user mentions: endpoint, route, REST, GraphQL, OpenAPI, API, request, response, status code, pagination, versioning, or designing a backend interface.

## REST Resource Design

### URL Conventions

```
# Collections
GET    /users          → list users
POST   /users          → create user

# Resources
GET    /users/:id      → get user
PUT    /users/:id      → replace user (full update)
PATCH  /users/:id      → partial update
DELETE /users/:id      → delete user

# Sub-resources
GET    /users/:id/posts     → posts by user
POST   /users/:id/posts     → create post for user

# Actions (when REST verbs don't fit)
POST   /payments/:id/refund
POST   /users/:id/verify-email
```

**Rules**:
- Plural nouns for collections (`/users`, not `/user`)
- Lowercase, hyphen-separated (`/user-profiles`, not `/userProfiles`)
- No verbs in URLs (`/getUser` is wrong — that's what `GET` is for)
- Nest only one level deep where possible

### HTTP Status Codes

| Code | Meaning | When to use |
|------|---------|------------|
| 200 | OK | Successful GET, PUT, PATCH |
| 201 | Created | Successful POST |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Validation failure |
| 401 | Unauthorized | Not authenticated |
| 403 | Forbidden | Authenticated but not authorized |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate resource, version conflict |
| 422 | Unprocessable Entity | Semantically invalid (use over 400 for business rule failures) |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected server error |

### Error Response Format

```json
{
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "No user with id '123' exists",
    "details": [
      { "field": "id", "issue": "not_found" }
    ],
    "request_id": "req_abc123"
  }
}
```

Always include `code` (machine-readable), `message` (human-readable), and `request_id` for debugging.

### Pagination

```json
{
  "data": [...],
  "pagination": {
    "cursor": "eyJpZCI6MTAwfQ==",
    "has_more": true,
    "total": 1043
  }
}
```

Prefer cursor-based pagination over offset for large datasets. Offset pagination breaks on concurrent inserts.

### Versioning

- URL versioning: `/v1/users` (simple, explicit)
- Header versioning: `Accept: application/vnd.myapp.v1+json` (cleaner URLs)

Pick one and be consistent. URL versioning is more visible and easier to debug.

## Response Envelope

```json
{
  "data": { ... },
  "meta": {
    "request_id": "req_abc123",
    "timestamp": "2026-03-30T10:00:00Z"
  }
}
```

## GraphQL Guidelines

- Use descriptive type names: `UserProfile`, not `User`
- Prefer connections for lists (Relay spec): `users { edges { node { id } } }`
- Put mutations in separate namespaces: `mutation { user { create(...) } }`
- Never expose internal IDs directly — use opaque global IDs
- Limit query depth to prevent abuse

## Anti-Patterns

- Verbs in URLs: `/getUser`, `/deletePost`
- Using POST for everything
- Returning 200 for errors
- Inconsistent naming (`userId` vs `user_id` in same API)
- Deeply nested resources (> 2 levels)
- No pagination on list endpoints
- Exposing database IDs directly
