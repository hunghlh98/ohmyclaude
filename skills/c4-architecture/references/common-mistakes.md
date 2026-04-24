# Common C4 Model Mistakes to Avoid

This guide documents frequent anti-patterns and errors when creating C4 architecture diagrams, with examples of what to do instead.

## Abstraction Level Mistakes

### 1. Confusing Containers and Components

**The Problem:**
Containers are **deployable units** (applications, services, databases). Components are **non-deployable elements inside a container** (modules, classes, packages).

**Wrong - Java class shown as container:**
```mermaid
C4Container
  title WRONG: Class as Container

  Container(userController, "UserController", "Java Class", "Handles user requests")
  Container(userService, "UserService", "Java Class", "Business logic")
  ContainerDb(db, "Database", "PostgreSQL", "User data")

  Rel(userController, userService, "Calls")
  Rel(userService, db, "Queries")
```

**Correct - Classes as components inside a container:**
```mermaid
C4Component
  title CORRECT: Classes as Components

  ContainerDb(db, "Database", "PostgreSQL", "User data")

  Container_Boundary(api, "User API Service") {
    Component(userController, "UserController", "Spring MVC", "REST endpoints")
    Component(userService, "UserService", "Spring Bean", "Business logic")
    Component(userRepo, "UserRepository", "JPA", "Data access")
  }

  Rel(userController, userService, "Calls")
  Rel(userService, userRepo, "Uses")
  Rel(userRepo, db, "Queries", "JDBC")
```

### 2. Adding Undefined Abstraction Levels

**The Problem:**
C4 defines exactly four levels. Don't invent "subcomponents", "modules", or other arbitrary levels.

**Wrong:**
- Level 3.5: "Subcomponents"
- Level 2.5: "Microservice groups"
- Custom levels like "packages" or "modules"

**Correct:**
Stick to Person, Software System, Container, Component. If you need more detail, you're at Level 4 (Code) which should use UML class diagrams.

### 3. Vague Subsystems

**The Problem:**
"Subsystem" is ambiguous. Is it a system, container, or component?

**Wrong:**
```
Subsystem(orders, "Order Subsystem", "Handles orders")
```

**Correct - Be specific:**
```
System(orderSystem, "Order System", "Handles order lifecycle")
# OR
Container(orderService, "Order Service", "Java", "Order processing API")
# OR
Component(orderProcessor, "Order Processor", "Spring Bean", "Order business logic")
```

## Shared Libraries Mistake

**The Problem:**
Modeling a shared library as a container implies it's an independently running service. Libraries are copied into applications, not deployed separately.

**Wrong - Library as separate container:**
```mermaid
C4Container
  title WRONG: Library as Container

  Container(serviceA, "Service A", "Java")
  Container(serviceB, "Service B", "Java")
  Container(sharedLib, "Shared Utils Library", "Java", "Common utilities")

  Rel(serviceA, sharedLib, "Uses")
  Rel(serviceB, sharedLib, "Uses")
```

**Correct - Show library within each service:**
```mermaid
C4Component
  title CORRECT: Library in Each Service

  Container_Boundary(serviceA, "Service A") {
    Component(controllerA, "Controller", "Spring MVC")
    Component(utilsA, "Shared Utils", "Java Library", "Bundled copy")
  }

  Container_Boundary(serviceB, "Service B") {
    Component(controllerB, "Controller", "Spring MVC")
    Component(utilsB, "Shared Utils", "Java Library", "Bundled copy")
  }
```

Or simply omit the library from architecture diagrams since it's an implementation detail.

## Message Broker Mistakes

### Single Message Bus Anti-Pattern

**The Problem:**
Showing Kafka/RabbitMQ as a single container creates a misleading "hub and spoke" diagram that hides actual data flows.

**Wrong - Central message bus:**
```mermaid
C4Container
  title WRONG: Central Message Bus

  Container(orderSvc, "Order Service", "Java")
  Container(inventorySvc, "Inventory Service", "Java")
  Container(paymentSvc, "Payment Service", "Java")
  ContainerQueue(kafka, "Kafka", "Event Streaming", "Message bus")

  Rel(orderSvc, kafka, "Publishes/Subscribes")
  Rel(inventorySvc, kafka, "Publishes/Subscribes")
  Rel(paymentSvc, kafka, "Publishes/Subscribes")
```

**Correct - Individual topics:**
```mermaid
C4Container
  title CORRECT: Individual Topics

  Container(orderSvc, "Order Service", "Java", "Creates orders")
  Container(inventorySvc, "Inventory Service", "Java", "Manages stock")
  Container(paymentSvc, "Payment Service", "Java", "Processes payments")

  ContainerQueue(orderCreated, "order.created", "Kafka", "New orders")
  ContainerQueue(stockReserved, "stock.reserved", "Kafka", "Stock events")
  ContainerQueue(paymentComplete, "payment.complete", "Kafka", "Payment events")

  Rel(orderSvc, orderCreated, "Publishes")
  Rel(inventorySvc, orderCreated, "Consumes")
  Rel(inventorySvc, stockReserved, "Publishes")
  Rel(paymentSvc, stockReserved, "Consumes")
  Rel(paymentSvc, paymentComplete, "Publishes")
  Rel(orderSvc, paymentComplete, "Consumes")
```

**Alternative - Topics on relationship labels:**
```mermaid
C4Container
  title ALTERNATIVE: Topics as Labels

  Container(orderSvc, "Order Service", "Java")
  Container(inventorySvc, "Inventory Service", "Java")
  Container(paymentSvc, "Payment Service", "Java")

  Rel(orderSvc, inventorySvc, "order.created", "Kafka")
  Rel(inventorySvc, paymentSvc, "stock.reserved", "Kafka")
  Rel(paymentSvc, orderSvc, "payment.complete", "Kafka")
```

## External Systems Mistakes

### Showing Internal Details of External Systems

**The Problem:**
You don't control external systems. Showing their internals creates coupling and becomes stale quickly.

**Wrong - External system internals:**
```mermaid
C4Container
  title WRONG: External System Internals

  Container(myApp, "My App", "Node.js")

  System_Boundary(stripe, "Stripe") {
    Container(stripeApi, "Stripe API", "Ruby")
    Container(stripeWorker, "Payment Worker", "Java")
    ContainerDb(stripeDb, "Payment DB", "MySQL")
  }

  Rel(myApp, stripeApi, "Charges cards")
```

**Correct - External system as black box:**
```mermaid
C4Context
  title CORRECT: External System Black Box

  Container(myApp, "My App", "Node.js", "E-commerce backend")
  System_Ext(stripe, "Stripe", "Payment processing platform")

  Rel(myApp, stripe, "Processes payments", "REST API")
```

## Metadata and Documentation Mistakes

### 1. Removing Type Labels

**The Problem:**
Removing element type labels (Container, Component, System) to "simplify" diagrams creates ambiguity.

**Wrong:**
```
Box(api, "API")  # What is this? System? Container? Component?
```

**Correct:**
```
Container(api, "API Application", "Spring Boot", "REST API backend")
```

### 2. Missing Descriptions

**The Problem:**
Elements without descriptions force viewers to guess their purpose.

**Wrong:**
```
Container(svc, "Service", "Java")
```

**Correct:**
```
Container(orderSvc, "Order Service", "Spring Boot", "Manages order lifecycle and fulfillment")
```

### 3. Generic Relationship Labels

**The Problem:**
Labels like "uses" or "communicates with" don't explain what data flows or why.

**Wrong:**
```
Rel(frontend, api, "Uses")
Rel(api, db, "Accesses")
```

**Correct:**
```
Rel(frontend, api, "Fetches products, submits orders", "JSON/HTTPS")
Rel(api, db, "Reads/writes order data", "JDBC")
```


---

See also: [common-mistakes-advanced.md](common-mistakes-advanced.md) for scope, arrow, deployment, consistency, and decision-documentation mistakes.
