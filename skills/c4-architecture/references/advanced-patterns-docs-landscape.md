# Advanced C4 Architecture Patterns — Documentation, Landscape, and Practices

This file continues [advanced-patterns.md](advanced-patterns.md) with API documentation patterns, supplementary diagrams, ADR integration, system landscape diagrams, and the best-practices summary. For microservices, event-driven, and deployment patterns, see the main file.

---


## API Documentation Patterns

### API Gateway Pattern

```mermaid
C4Container
  title API Gateway Architecture

  Person(mobile, "Mobile User", "iOS/Android app user")
  Person(web, "Web User", "Browser user")
  Person(partner, "Partner", "Third-party integration")

  Container(mobileApp, "Mobile App", "React Native", "Native mobile client")
  Container(webApp, "Web App", "React", "SPA client")

  Container_Boundary(apiPlatform, "API Platform") {
    Container(gateway, "API Gateway", "Kong", "Auth, rate limit, routing")
    Container(bff, "BFF", "Node.js", "Backend for frontend")

    Container(userApi, "User API", "Java", "User management")
    Container(orderApi, "Order API", "Go", "Order processing")
    Container(productApi, "Product API", "Python", "Product catalog")
  }

  System_Ext(auth0, "Auth0", "Identity provider")

  Rel(mobile, mobileApp, "Uses")
  Rel(web, webApp, "Uses")
  Rel(partner, gateway, "API calls", "REST/HTTPS")

  Rel(mobileApp, bff, "GraphQL", "HTTPS")
  Rel(webApp, bff, "GraphQL", "HTTPS")

  Rel(bff, gateway, "REST calls", "HTTP")
  Rel(gateway, auth0, "Validates tokens", "HTTPS")

  Rel(gateway, userApi, "Routes /users/*", "HTTP")
  Rel(gateway, orderApi, "Routes /orders/*", "HTTP")
  Rel(gateway, productApi, "Routes /products/*", "HTTP")
```

### API Component Detail

```mermaid
C4Component
  title Order API - Component Diagram

  Container(gateway, "API Gateway", "Kong")
  ContainerDb(db, "Order DB", "PostgreSQL")
  ContainerQueue(events, "Order Events", "Kafka")
  System_Ext(payment, "Payment Service", "Stripe")

  Container_Boundary(orderApi, "Order API") {
    Component(controller, "Order Controller", "Spring MVC", "REST endpoints")
    Component(validator, "Request Validator", "Bean Validation", "Input validation")
    Component(service, "Order Service", "Spring Service", "Business logic")
    Component(paymentClient, "Payment Client", "Feign", "Stripe integration")
    Component(repository, "Order Repository", "Spring Data JPA", "Data access")
    Component(publisher, "Event Publisher", "Spring Kafka", "Event publishing")
  }

  Rel(gateway, controller, "HTTP requests", "JSON")
  Rel(controller, validator, "Validates")
  Rel(controller, service, "Delegates")
  Rel(service, paymentClient, "Charges")
  Rel(service, repository, "Persists")
  Rel(service, publisher, "Publishes events")

  Rel(paymentClient, payment, "REST", "HTTPS")
  Rel(repository, db, "JDBC", "SQL")
  Rel(publisher, events, "Produces", "Avro")
```

## Supplementary Diagram Patterns

### Authentication Flow (Dynamic)

```mermaid
C4Dynamic
  title OAuth2 Authorization Code Flow

  Container(spa, "SPA", "React", "Web application")
  Container(api, "API", "Node.js", "Resource server")
  System_Ext(auth0, "Auth0", "Authorization server")
  ContainerDb(db, "User DB", "PostgreSQL", "User data")

  Rel(spa, auth0, "1. Redirect to /authorize")
  Rel(auth0, spa, "2. Redirect with auth code")
  Rel(spa, api, "3. Exchange code for tokens", "HTTPS")
  Rel(api, auth0, "4. POST /oauth/token", "HTTPS")
  Rel(api, spa, "5. Return access + refresh tokens")
  Rel(spa, api, "6. API request with access token", "HTTPS")
  Rel(api, db, "7. Fetch user data", "SQL")
```

### Error Handling Flow

```mermaid
C4Dynamic
  title Error Handling - Circuit Breaker

  Container(api, "API", "Node.js")
  Container(circuitBreaker, "Circuit Breaker", "Resilience4j")
  System_Ext(payment, "Payment Service", "Stripe")
  ContainerDb(fallback, "Fallback Cache", "Redis")

  Rel(api, circuitBreaker, "1. Request payment")
  Rel(circuitBreaker, payment, "2. Forward request", "HTTPS")
  Rel(payment, circuitBreaker, "3a. Success response")
  Rel(circuitBreaker, api, "4a. Return success")

  Rel(payment, circuitBreaker, "3b. Timeout/Error")
  Rel(circuitBreaker, fallback, "4b. Check cached response")
  Rel(circuitBreaker, api, "5b. Return fallback or error")
```

## Architecture Decision Record Integration

Link C4 diagrams to Architecture Decision Records (ADRs):

### ADR Reference in Diagrams

```mermaid
C4Container
  title System Architecture
  %% See ADR-001 for API Gateway selection
  %% See ADR-002 for database choice
  %% See ADR-003 for event-driven approach

  Container(gateway, "API Gateway", "Kong", "ADR-001: Selected for plugin ecosystem")
  Container(api, "Order API", "Spring Boot", "Order processing")
  ContainerDb(db, "Order DB", "PostgreSQL", "ADR-002: ACID compliance required")
  ContainerQueue(events, "Events", "Kafka", "ADR-003: Event sourcing pattern")

  Rel(gateway, api, "Routes", "HTTP")
  Rel(api, db, "Persists", "JDBC")
  Rel(api, events, "Publishes", "Avro")
```

### Directory Structure

Organize C4 diagrams with ADRs:

```
docs/
├── architecture/
│   ├── c4-context.md
│   ├── c4-containers.md
│   ├── c4-components-order-api.md
│   ├── c4-deployment-production.md
│   └── c4-dynamic-auth-flow.md
└── decisions/
    ├── 001-api-gateway-selection.md
    ├── 002-database-selection.md
    ├── 003-event-driven-architecture.md
    └── template.md
```

## System Landscape Diagram

For enterprise-level views showing multiple systems:

```mermaid
C4Context
  title Enterprise System Landscape

  Person(customer, "Customer", "External customer")
  Person(employee, "Employee", "Internal staff")
  Person(partner, "Partner", "Business partner")

  Enterprise_Boundary(enterprise, "Acme Corporation") {

    Boundary(customerFacing, "Customer-Facing", "External") {
      System(ecommerce, "E-commerce Platform", "Online store")
      System(mobile, "Mobile App", "Customer mobile experience")
      System(support, "Support Portal", "Customer service")
    }

    Boundary(internal, "Internal Systems", "Operations") {
      System(erp, "ERP System", "SAP - Finance & operations")
      System(crm, "CRM System", "Salesforce - Customer data")
      System(analytics, "Analytics Platform", "Business intelligence")
    }

    Boundary(integration, "Integration Layer", "Middleware") {
      System(esb, "Integration Hub", "MuleSoft - API management")
      System(etl, "Data Pipeline", "Airflow - Data processing")
    }
  }

  System_Ext(payment, "Payment Gateway", "Stripe")
  System_Ext(shipping, "Shipping Provider", "FedEx")
  System_Ext(warehouse, "Warehouse System", "3PL Partner")

  Rel(customer, ecommerce, "Shops online")
  Rel(customer, mobile, "Uses app")
  Rel(customer, support, "Gets help")
  Rel(employee, erp, "Manages operations")
  Rel(employee, crm, "Manages customers")
  Rel(partner, esb, "API integration")

  Rel(ecommerce, esb, "API calls")
  Rel(esb, erp, "Syncs orders")
  Rel(esb, crm, "Syncs customers")
  Rel(esb, payment, "Processes payments")
  Rel(esb, shipping, "Creates shipments")
  Rel(etl, analytics, "Feeds data")
```

## Best Practices Summary

1. **Choose abstraction based on ownership**: Single team = containers, Multi-team = systems
2. **Show individual message topics**: Not a single "Kafka" or "RabbitMQ" box
3. **Use deployment diagrams for infrastructure**: Keep container diagrams logical
4. **Create dynamic diagrams for complex flows**: Authentication, payment, error handling
5. **Link to ADRs**: Document why decisions were made
6. **Use system landscape for enterprise views**: Show all systems and their relationships
7. **Keep diagrams focused**: One concern per diagram, split when complex


---

See also: [advanced-patterns.md](advanced-patterns.md) for microservices, event-driven, and deployment patterns.
