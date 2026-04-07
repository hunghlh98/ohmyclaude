---
paths:
  - "**/*.java"
---

# Java Patterns

## Layered Architecture
- Controllers: thin, delegate to services, handle HTTP concerns only
- Services: business logic, `@Transactional` here (not on repository)
- Repositories: data access only, no business logic

## Constructor Injection
```java
// GOOD: constructor injection
@Service
public class MarketService {
  private final MarketRepository repo;
  public MarketService(MarketRepository repo) { this.repo = repo; }
}

// BAD: field injection
@Autowired private MarketRepository repo;
```

## DTOs
- Use records for request/response DTOs
- Never expose entities directly to controllers
- Bean Validation annotations on request DTOs

## Exception Handling
- Domain-specific exceptions (unchecked): `MarketNotFoundException`
- `@ControllerAdvice` with per-exception handlers
- Never swallow exceptions silently

## Builder Pattern
- Use for objects with 4+ optional fields
- Prefer records when all fields are required
