---
name: database-schema-designer
origin: ohmyclaude
description: Design robust, scalable database schemas for SQL and NoSQL databases. Provides normalization guidelines, indexing strategies, migration patterns, constraint design, and performance optimization. Used by @artie-arch as a supplementary tool when the SDD-<id>.md requires a data model section.
license: MIT
---

# Database Schema Designer

Design production-ready database schemas with best practices built-in.

---

## Quick Start

Just describe your data model:

```
design a schema for an e-commerce platform with users, products, orders
```

You'll get a complete SQL schema like:

```sql
CREATE TABLE users (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orders (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  total DECIMAL(10,2) NOT NULL,
  INDEX idx_orders_user (user_id)
);
```

**What to include in your request:**
- Entities (users, products, orders)
- Key relationships (users have orders, orders have items)
- Scale hints (high-traffic, millions of records)
- Database preference (SQL/NoSQL) - defaults to SQL if not specified

---

## Triggers

| Trigger | Example |
|---------|---------|
| `design schema` | "design a schema for user authentication" |
| `database design` | "database design for multi-tenant SaaS" |
| `create tables` | "create tables for a blog system" |
| `schema for` | "schema for inventory management" |
| `model data` | "model data for real-time analytics" |
| `I need a database` | "I need a database for tracking orders" |
| `design NoSQL` | "design NoSQL schema for product catalog" |

---

## Key Terms

| Term | Definition |
|------|------------|
| **Normalization** | Organizing data to reduce redundancy (1NF → 2NF → 3NF) |
| **3NF** | Third Normal Form - no transitive dependencies between columns |
| **OLTP** | Online Transaction Processing - write-heavy, needs normalization |
| **OLAP** | Online Analytical Processing - read-heavy, benefits from denormalization |
| **Foreign Key (FK)** | Column that references another table's primary key |
| **Index** | Data structure that speeds up queries (at cost of slower writes) |
| **Access Pattern** | How your app reads/writes data (queries, joins, filters) |
| **Denormalization** | Intentionally duplicating data to speed up reads |

---

## Quick Reference

| Task | Approach | Key Consideration |
|------|----------|-------------------|
| New schema | Normalize to 3NF first | Domain modeling over UI |
| SQL vs NoSQL | Access patterns decide | Read/write ratio matters |
| Primary keys | INT or UUID | UUID for distributed systems |
| Foreign keys | Always constrain | ON DELETE strategy critical |
| Indexes | FKs + WHERE columns | Column order matters |
| Migrations | Always reversible | Backward compatible first |

---

## Process Overview

```
Your Data Requirements
    |
    v
+-----------------------------------------------------+
| Phase 1: ANALYSIS                                   |
| * Identify entities and relationships               |
| * Determine access patterns (read vs write heavy)   |
| * Choose SQL or NoSQL based on requirements         |
+-----------------------------------------------------+
    |
    v
+-----------------------------------------------------+
| Phase 2: DESIGN                                     |
| * Normalize to 3NF (SQL) or embed/reference (NoSQL) |
| * Define primary keys and foreign keys              |
| * Choose appropriate data types                     |
| * Add constraints (UNIQUE, CHECK, NOT NULL)         |
+-----------------------------------------------------+
    |
    v
+-----------------------------------------------------+
| Phase 3: OPTIMIZE                                   |
| * Plan indexing strategy                            |
| * Consider denormalization for read-heavy queries   |
| * Add timestamps (created_at, updated_at)           |
+-----------------------------------------------------+
    |
    v
+-----------------------------------------------------+
| Phase 4: MIGRATE                                    |
| * Generate migration scripts (up + down)            |
| * Ensure backward compatibility                     |
| * Plan zero-downtime deployment                     |
+-----------------------------------------------------+
    |
    v
Production-Ready Schema
```

---

## Normalization Decision Table

| Signal | Decision | Details |
|--------|----------|---------|
| Greenfield OLTP schema | Normalize to 3NF | See `references/normalization.md` |
| Read-heavy reporting | Denormalize aggregates | See `references/normalization.md` (bottom) |
| Expensive JOIN on hot path | Cached derived column | See `references/performance.md` |
| Document-shaped data, 1:few | Embed (NoSQL) | See `references/nosql.md` |
| 1:many, large children | Reference (NoSQL) | See `references/nosql.md` |

---

## Commands

| Command | When to Use | Action |
|---------|-------------|--------|
| `design schema for {domain}` | Starting fresh | Full schema generation |
| `normalize {table}` | Fixing existing table | Apply normalization rules |
| `add indexes for {table}` | Performance issues | Generate index strategy |
| `migration for {change}` | Schema evolution | Create reversible migration |
| `review schema` | Code review | Audit existing schema |

**Workflow:** Start with `design schema` → iterate with `normalize` → optimize with `add indexes` → evolve with `migration`

---

## Core Principles

| Principle | WHY | Implementation |
|-----------|-----|----------------|
| Model the Domain | UI changes, domain doesn't | Entity names reflect business concepts |
| Data Integrity First | Corruption is costly to fix | Constraints at database level |
| Optimize for Access Pattern | Can't optimize for both | OLTP: normalized, OLAP: denormalized |
| Plan for Scale | Retrofitting is painful | Index strategy + partitioning plan |

---

## Anti-Patterns

| Avoid | Why | Instead |
|-------|-----|---------|
| VARCHAR(255) everywhere | Wastes storage, hides intent | Size appropriately per field |
| FLOAT for money | Rounding errors | DECIMAL(10,2) |
| Missing FK constraints | Orphaned data | Always define foreign keys |
| No indexes on FKs | Slow JOINs | Index every foreign key |
| Storing dates as strings | Can't compare/sort | DATE, TIMESTAMP types |
| SELECT * in queries | Fetches unnecessary data | Explicit column lists |
| Non-reversible migrations | Can't rollback | Always write DOWN migration |
| Adding NOT NULL without default | Breaks existing rows | Add nullable, backfill, then constrain |

---

## Primary Output Contract

Every generated schema must include, at minimum:

1. **DDL** — `CREATE TABLE` statements with primary keys, foreign keys, `NOT NULL`, `UNIQUE`, `CHECK`, and `created_at`/`updated_at` where relevant.
2. **Indexes** — explicit `CREATE INDEX` on every foreign key and known query column.
3. **Migration pair** — reversible `UP` and `DOWN` blocks (see `references/migrations.md`).
4. **Rationale** — brief note on SQL vs NoSQL choice, normalization level, and any denormalized fields.

If the request is NoSQL, output document shape + index definitions instead of DDL (see `references/nosql.md`).

---

## Canonical Example (SQL, OLTP)

```sql
-- Users + Orders + Items, normalized to 3NF, indexed for common access paths.

CREATE TABLE users (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orders (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  total DECIMAL(10,2) NOT NULL CHECK (total >= 0),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_orders_user (user_id),
  INDEX idx_orders_status_created (status, created_at)
);

CREATE TABLE order_items (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT NOT NULL,
  product_id BIGINT NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  INDEX idx_items_order (order_id),
  INDEX idx_items_product (product_id)
);
```

For more pattern examples (many-to-many, self-referencing, polymorphic), see `references/relationships.md`.

---

## Verification Checklist

After designing a schema:

- [ ] Every table has a primary key
- [ ] All relationships have foreign key constraints
- [ ] ON DELETE strategy defined for each FK
- [ ] Indexes exist on all foreign keys
- [ ] Indexes exist on frequently queried columns
- [ ] Appropriate data types (DECIMAL for money, etc.)
- [ ] NOT NULL on required fields
- [ ] UNIQUE constraints where needed
- [ ] CHECK constraints for validation
- [ ] created_at and updated_at timestamps
- [ ] Migration scripts are reversible
- [ ] Tested on staging with production data

Full review checklist: `references/schema-design-checklist.md`.

---

## References

Deep-dive material lives under `references/`. Load only what the current task needs:

| Topic | File |
|-------|------|
| Normalization 1NF→3NF + denormalization | `references/normalization.md` |
| Data type selection (string, numeric, date, bool) | `references/data-types.md` |
| Indexing strategy, composite order, pitfalls | `references/indexing.md` |
| Primary keys, foreign keys, CHECK, UNIQUE | `references/constraints.md` |
| Relationship patterns (1:M, M:M, self, polymorphic) | `references/relationships.md` |
| NoSQL / MongoDB document design | `references/nosql.md` |
| Zero-downtime migration patterns + templates | `references/migrations.md` |
| Query analysis, N+1, optimization techniques | `references/performance.md` |
| Full review checklist | `references/schema-design-checklist.md` |

---

## Extension Points

1. **Database-Specific Patterns:** Add MySQL vs PostgreSQL vs SQLite variations
2. **Advanced Patterns:** Time-series, event sourcing, CQRS, multi-tenancy
3. **ORM Integration:** TypeORM, Prisma, SQLAlchemy patterns
4. **Monitoring:** Query performance tracking, slow query alerts
