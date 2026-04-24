# Advanced C4 Architecture Patterns

This guide covers advanced patterns for documenting complex architectures including microservices, event-driven systems, deployments, and API documentation.

## Microservices Architecture

### Single Team Ownership

When one team owns all microservices, model them as **containers** within a single system:

```mermaid
C4Container
  title E-commerce Platform - Single Team

  Person(customer, "Customer", "Online shopper")

  System_Ext(payment, "Stripe", "Payments")
  System_Ext(shipping, "FedEx", "Shipping")

  System_Boundary(platform, "E-commerce Platform") {
    Container(gateway, "API Gateway", "Kong", "Routing, auth, rate limiting")

    Container(orderSvc, "Order Service", "Node.js", "Order processing")
    ContainerDb(orderDb, "Order DB", "PostgreSQL", "Orders")

    Container(productSvc, "Product Service", "Go", "Product catalog")
    ContainerDb(productDb, "Product DB", "MongoDB", "Products")

    Container(userSvc, "User Service", "Java", "Authentication")
    ContainerDb(userDb, "User DB", "PostgreSQL", "Users")
    ContainerDb(cache, "Cache", "Redis", "Sessions")
  }

  Rel(customer, gateway, "API requests", "HTTPS")
  Rel(gateway, orderSvc, "Routes", "HTTP")
  Rel(gateway, productSvc, "Routes", "HTTP")
  Rel(gateway, userSvc, "Routes", "HTTP")

  Rel(orderSvc, orderDb, "Persists", "SQL")
  Rel(productSvc, productDb, "Persists", "MongoDB")
  Rel(userSvc, userDb, "Persists", "SQL")
  Rel(userSvc, cache, "Caches", "Redis")

  Rel(orderSvc, payment, "Charges", "REST")
  Rel(orderSvc, shipping, "Ships", "REST")
```

### Multi-Team Ownership

When separate teams own microservices, **promote each to a software system**:

```mermaid
C4Context
  title E-commerce Platform - Multi-Team

  Person(customer, "Customer", "Online shopper")
  Person(admin, "Admin", "Store manager")

  Enterprise_Boundary(company, "Acme Corp") {
    System(orderSystem, "Order System", "Team Alpha - Order lifecycle")
    System(productSystem, "Product System", "Team Beta - Catalog management")
    System(userSystem, "User System", "Team Gamma - Identity & auth")
    System(analyticsSystem, "Analytics System", "Team Delta - Business intelligence")
  }

  System_Ext(payment, "Stripe", "Payment processing")
  System_Ext(warehouse, "Warehouse System", "Fulfillment partner")

  Rel(customer, orderSystem, "Places orders")
  Rel(customer, productSystem, "Browses products")
  Rel(admin, productSystem, "Manages catalog")
  Rel(admin, analyticsSystem, "Views reports")

  Rel(orderSystem, userSystem, "Authenticates")
  Rel(orderSystem, productSystem, "Checks inventory")
  Rel(orderSystem, payment, "Processes payments")
  Rel(orderSystem, warehouse, "Fulfills orders")
  Rel(analyticsSystem, orderSystem, "Aggregates data")
```

Each team then creates their own Container diagram:

```mermaid
C4Container
  title Order System - Team Alpha

  System_Ext(productSystem, "Product System", "Inventory checks")
  System_Ext(userSystem, "User System", "Authentication")
  System_Ext(payment, "Stripe", "Payments")

  Container_Boundary(orderSystem, "Order System") {
    Container(orderApi, "Order API", "Spring Boot", "REST endpoints")
    Container(orderWorker, "Order Worker", "Spring Boot", "Async processing")
    ContainerDb(orderDb, "Order DB", "PostgreSQL", "Order data")
    ContainerQueue(orderQueue, "Order Queue", "RabbitMQ", "Processing queue")
  }

  Rel(orderApi, orderDb, "Reads/writes", "JDBC")
  Rel(orderApi, orderQueue, "Publishes", "AMQP")
  Rel(orderWorker, orderQueue, "Consumes", "AMQP")
  Rel(orderWorker, orderDb, "Updates", "JDBC")

  Rel(orderApi, userSystem, "Validates tokens", "REST")
  Rel(orderApi, productSystem, "Reserves stock", "REST")
  Rel(orderWorker, payment, "Charges", "REST")
```

## Event-Driven Architecture

### Showing Individual Topics

Always model message topics/queues as separate containers:

```mermaid
C4Container
  title Order Processing - Event-Driven

  Container(orderSvc, "Order Service", "Java", "Creates orders")
  Container(inventorySvc, "Inventory Service", "Go", "Manages stock")
  Container(paymentSvc, "Payment Service", "Node.js", "Processes payments")
  Container(shippingSvc, "Shipping Service", "Python", "Creates shipments")
  Container(notificationSvc, "Notification Service", "Python", "Sends alerts")

  ContainerQueue(orderCreated, "order.created", "Kafka", "New order events")
  ContainerQueue(stockReserved, "inventory.reserved", "Kafka", "Stock reservation events")
  ContainerQueue(paymentComplete, "payment.completed", "Kafka", "Payment events")
  ContainerQueue(orderShipped, "order.shipped", "Kafka", "Shipment events")

  Rel(orderSvc, orderCreated, "Publishes", "Avro")

  Rel(inventorySvc, orderCreated, "Consumes", "Avro")
  Rel(inventorySvc, stockReserved, "Publishes", "Avro")

  Rel(paymentSvc, stockReserved, "Consumes", "Avro")
  Rel(paymentSvc, paymentComplete, "Publishes", "Avro")

  Rel(shippingSvc, paymentComplete, "Consumes", "Avro")
  Rel(shippingSvc, orderShipped, "Publishes", "Avro")

  Rel(notificationSvc, orderCreated, "Consumes", "Avro")
  Rel(notificationSvc, paymentComplete, "Consumes", "Avro")
  Rel(notificationSvc, orderShipped, "Consumes", "Avro")

  Rel(orderSvc, paymentComplete, "Consumes", "Avro")
  Rel(orderSvc, orderShipped, "Consumes", "Avro")

  UpdateLayoutConfig($c4ShapeInRow="4")
```

### Event Flow with Dynamic Diagram

Use Dynamic diagrams to show the sequence of events:

```mermaid
C4Dynamic
  title Order Processing Flow

  Container(orderSvc, "Order Service", "Java")
  Container(inventorySvc, "Inventory Service", "Go")
  Container(paymentSvc, "Payment Service", "Node.js")
  Container(shippingSvc, "Shipping Service", "Python")

  ContainerQueue(orderCreated, "order.created", "Kafka")
  ContainerQueue(stockReserved, "inventory.reserved", "Kafka")
  ContainerQueue(paymentComplete, "payment.completed", "Kafka")

  Rel(orderSvc, orderCreated, "1. Publishes order", "Avro")
  Rel(inventorySvc, orderCreated, "2. Consumes order", "Avro")
  Rel(inventorySvc, stockReserved, "3. Publishes reservation", "Avro")
  Rel(paymentSvc, stockReserved, "4. Consumes reservation", "Avro")
  Rel(paymentSvc, paymentComplete, "5. Publishes payment", "Avro")
  Rel(shippingSvc, paymentComplete, "6. Consumes payment", "Avro")
```

### CQRS Pattern

```mermaid
C4Container
  title CQRS Architecture

  Person(user, "User", "Application user")

  Container_Boundary(app, "Application") {
    Container(commandApi, "Command API", "Java", "Write operations")
    Container(queryApi, "Query API", "Node.js", "Read operations")

    ContainerDb(writeDb, "Write DB", "PostgreSQL", "Source of truth")
    ContainerDb(readDb, "Read DB", "Elasticsearch", "Query-optimized")

    ContainerQueue(events, "Domain Events", "Kafka", "State changes")
    Container(projector, "Projector", "Java", "Updates read model")
  }

  Rel(user, commandApi, "Commands", "HTTPS")
  Rel(user, queryApi, "Queries", "HTTPS")

  Rel(commandApi, writeDb, "Writes", "JDBC")
  Rel(commandApi, events, "Publishes", "Avro")

  Rel(projector, events, "Consumes", "Avro")
  Rel(projector, readDb, "Updates", "REST")

  Rel(queryApi, readDb, "Queries", "REST")
```

## Deployment Patterns

### AWS Production Deployment

```mermaid
C4Deployment
  title Production - AWS us-east-1

  Deployment_Node(route53, "Route 53", "DNS") {
    Container(dns, "DNS", "AWS", "api.example.com")
  }

  Deployment_Node(cloudfront, "CloudFront", "CDN") {
    Container(cdn, "CDN", "AWS", "Static asset caching")
  }

  Deployment_Node(vpc, "VPC", "10.0.0.0/16") {

    Deployment_Node(public, "Public Subnets", "Multi-AZ") {
      Deployment_Node(alb, "ALB", "Application LB") {
        Container(lb, "Load Balancer", "AWS ALB", "TLS termination, routing")
      }
    }

    Deployment_Node(private, "Private Subnets", "Multi-AZ") {

      Deployment_Node(ecs, "ECS Cluster", "Fargate") {
        Container(api1, "API", "Node.js", "Instance 1")
        Container(api2, "API", "Node.js", "Instance 2")
        Container(worker1, "Worker", "Python", "Instance 1")
      }

      Deployment_Node(rds, "RDS", "db.r5.xlarge") {
        ContainerDb(primary, "Primary", "PostgreSQL 14", "Multi-AZ")
      }

      Deployment_Node(elasticache, "ElastiCache", "cache.r5.large") {
        ContainerDb(redis, "Redis", "Redis 7", "Cluster mode")
      }
    }
  }

  Rel(dns, cdn, "Routes to", "HTTPS")
  Rel(cdn, lb, "Forwards", "HTTPS")
  Rel(lb, api1, "Routes", "HTTP")
  Rel(lb, api2, "Routes", "HTTP")
  Rel(api1, primary, "Queries", "JDBC")
  Rel(api2, primary, "Queries", "JDBC")
  Rel(api1, redis, "Caches", "Redis")
  Rel(worker1, primary, "Processes", "JDBC")
```

### Kubernetes Deployment

```mermaid
C4Deployment
  title Production - Kubernetes

  Deployment_Node(ingress, "Ingress Controller", "nginx") {
    Container(nginx, "Nginx", "nginx-ingress", "TLS, routing")
  }

  Deployment_Node(cluster, "Kubernetes Cluster", "EKS 1.28") {

    Deployment_Node(nsApp, "app namespace", "Application") {

      Deployment_Node(apiDeploy, "api-deployment", "3 replicas") {
        Container(api, "API Pod", "Node.js 20", "REST API")
      }

      Deployment_Node(workerDeploy, "worker-deployment", "2 replicas") {
        Container(worker, "Worker Pod", "Python 3.11", "Background jobs")
      }
    }

    Deployment_Node(nsData, "data namespace", "Databases") {

      Deployment_Node(pgStateful, "postgres-statefulset", "HA") {
        ContainerDb(pg, "PostgreSQL", "PostgreSQL 15", "Primary + Replica")
      }

      Deployment_Node(redisStateful, "redis-statefulset", "Cluster") {
        ContainerDb(redis, "Redis", "Redis 7", "3 node cluster")
      }
    }
  }

  Rel(nginx, api, "Routes /api/*", "HTTP")
  Rel(api, pg, "Queries", "JDBC")
  Rel(api, redis, "Caches", "Redis")
  Rel(worker, pg, "Processes", "JDBC")
```

### Multi-Region Deployment

```mermaid
C4Deployment
  title Multi-Region Active-Active

  Deployment_Node(globalLB, "Global Load Balancer", "AWS Global Accelerator") {
    Container(glb, "GLB", "AWS", "Geographic routing")
  }

  Deployment_Node(usEast, "US-East-1", "Primary Region") {
    Deployment_Node(usEcs, "ECS Cluster", "Fargate") {
      Container(usApi, "API", "Node.js", "US instances")
    }
    Deployment_Node(usRds, "RDS", "Multi-AZ") {
      ContainerDb(usPrimary, "Primary DB", "PostgreSQL", "Write leader")
    }
  }

  Deployment_Node(euWest, "EU-West-1", "Secondary Region") {
    Deployment_Node(euEcs, "ECS Cluster", "Fargate") {
      Container(euApi, "API", "Node.js", "EU instances")
    }
    Deployment_Node(euRds, "RDS", "Read Replica") {
      ContainerDb(euReplica, "Replica DB", "PostgreSQL", "Read replica")
    }
  }

  Rel(glb, usApi, "US traffic", "HTTPS")
  Rel(glb, euApi, "EU traffic", "HTTPS")
  Rel(usApi, usPrimary, "Reads/writes", "JDBC")
  Rel(euApi, euReplica, "Reads", "JDBC")
  Rel(euApi, usPrimary, "Writes", "JDBC")
  Rel(usPrimary, euReplica, "Replicates", "Streaming")
```


---

See also: [advanced-patterns-docs-landscape.md](advanced-patterns-docs-landscape.md) for API documentation, supplementary diagrams, ADR integration, system landscape, and best-practices summary.
