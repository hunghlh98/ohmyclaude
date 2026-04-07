---
name: springboot-security
description: Spring Security — authn/authz, input validation, CSRF, secrets, rate limiting, dependency scanning. Use for Java Spring Boot security work.
origin: ohmyclaude
---

# Spring Boot Security Review

Use when adding auth, handling input, creating endpoints, or dealing with secrets.

## When to Activate

- Adding authentication (JWT, OAuth2, session-based)
- Implementing authorization (@PreAuthorize, role-based access)
- Validating user input (Bean Validation, custom validators)
- Configuring CORS, CSRF, or security headers
- Managing secrets (Vault, environment variables)
- Adding rate limiting or brute-force protection

## Authentication

- Prefer stateless JWT or opaque tokens with revocation list
- Use `httpOnly`, `Secure`, `SameSite=Strict` cookies for sessions
- Validate tokens with `OncePerRequestFilter` or resource server

```java
@Component
public class JwtAuthFilter extends OncePerRequestFilter {
  private final JwtService jwtService;

  public JwtAuthFilter(JwtService jwtService) {
    this.jwtService = jwtService;
  }

  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
      FilterChain chain) throws ServletException, IOException {
    String header = request.getHeader(HttpHeaders.AUTHORIZATION);
    if (header != null && header.startsWith("Bearer ")) {
      String token = header.substring(7);
      Authentication auth = jwtService.authenticate(token);
      SecurityContextHolder.getContext().setAuthentication(auth);
    }
    chain.doFilter(request, response);
  }
}
```

## Authorization

- Enable method security: `@EnableMethodSecurity`
- Use `@PreAuthorize("hasRole('ADMIN')")` or `@PreAuthorize("@authz.canEdit(#id)")`
- Deny by default; expose only required scopes

## Input Validation

- Use Bean Validation with `@Valid` on controllers
- Apply constraints on DTOs: `@NotBlank`, `@Email`, `@Size`, custom validators
- Sanitize any HTML with a whitelist before rendering

```java
public record CreateUserDto(
    @NotBlank @Size(max = 100) String name,
    @NotBlank @Email String email,
    @NotNull @Min(0) @Max(150) Integer age
) {}
```

## SQL Injection Prevention

- Use Spring Data repositories or parameterized queries
- For native queries, use `:param` bindings; never concatenate strings

```java
// BAD: String concatenation
@Query(value = "SELECT * FROM users WHERE name = '" + name + "'", nativeQuery = true)

// GOOD: Parameterized
@Query(value = "SELECT * FROM users WHERE name = :name", nativeQuery = true)
List<User> findByName(@Param("name") String name);
```

## Password Encoding

- Always hash passwords with BCrypt or Argon2 — never store plaintext
- Use `PasswordEncoder` bean, not manual hashing

## CSRF Protection

- For browser session apps, keep CSRF enabled; include token in forms/headers
- For pure APIs with Bearer tokens, disable CSRF and rely on stateless auth

## Secrets Management

- No secrets in source; load from env or vault
- Keep `application.yml` free of credentials; use `${DB_PASSWORD}` placeholders
- Rotate tokens and DB credentials regularly

## Security Headers

```java
http.headers(headers -> headers
    .contentSecurityPolicy(csp -> csp.policyDirectives("default-src 'self'"))
    .frameOptions(HeadersConfigurer.FrameOptionsConfig::sameOrigin)
    .referrerPolicy(rp -> rp.policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.NO_REFERRER)));
```

## CORS

- Configure CORS at the security filter level, not per-controller
- Restrict allowed origins — never use `*` in production

## Rate Limiting

- Apply Bucket4j or gateway-level limits on expensive endpoints
- Log and alert on bursts; return 429 with retry hints

## Dependency Security

- Run OWASP Dependency Check / Snyk in CI
- Keep Spring Boot and Spring Security on supported versions
- Fail builds on known CVEs

## Logging and PII

- Never log secrets, tokens, passwords, or full PAN data
- Redact sensitive fields; use structured JSON logging

## Checklist Before Release

- [ ] Auth tokens validated and expired correctly
- [ ] Authorization guards on every sensitive path
- [ ] All inputs validated and sanitized
- [ ] No string-concatenated SQL
- [ ] CSRF posture correct for app type
- [ ] Secrets externalized; none committed
- [ ] Security headers configured
- [ ] Rate limiting on APIs
- [ ] Dependencies scanned and up to date
- [ ] Logs free of sensitive data

**Remember**: Deny by default, validate inputs, least privilege, and secure-by-configuration first.
