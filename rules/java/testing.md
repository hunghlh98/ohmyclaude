---
paths:
  - "**/*.java"
  - "**/src/test/**"
---

# Java Testing Rules

## Framework
- JUnit 5 + AssertJ + Mockito
- `@ExtendWith(MockitoExtension.class)` for unit tests
- `@WebMvcTest` for controller tests
- `@SpringBootTest` + `@AutoConfigureMockMvc` for integration tests
- `@DataJpaTest` + Testcontainers for persistence tests

## Patterns
- Arrange-Act-Assert structure
- One assertion concept per test
- Descriptive test names: `should_returnNotFound_when_userDoesNotExist`
- `@ParameterizedTest` for data variants

## Anti-Patterns
- No `Thread.sleep()` — use `Awaitility` or `CountDownLatch`
- No partial mocks — prefer explicit stubs
- No test names like `test1`, `testMethod`
- No `@SpringBootTest` when `@WebMvcTest` suffices (faster)

## Coverage
- JaCoCo 80%+ line coverage target
- Maven: `jacoco-maven-plugin` in verify phase
- Gradle: `./gradlew test jacocoTestReport`

## CI Commands
- `mvn -T 4 verify` or `./gradlew check`
