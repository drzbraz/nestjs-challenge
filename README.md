---

# NestJS Record Store Challenge API

This project is a backend API built with **NestJS** and **MongoDB**, developed as a technical challenge.
The focus of the implementation is **clean architecture**, **scalability**, **data consistency**, and **production-ready practices**.

---

## 🚀 Project Overview

The API manages a **record store**, allowing:

* creation and search of music records
* integration with an external provider to enrich records with tracklists
* stock-safe order creation
* pagination, caching, and concurrency protection

The project was intentionally designed to be **modular, testable, and easy to evolve**.

---

## 🧠 Architectural Principles

* Clear separation of concerns:

  * **Controllers** → HTTP layer
  * **Services** → business logic
  * **Repositories** → data access
  * **Integrations** → external providers
* Database-level filtering (no in-memory scans)
* Atomic operations for stock management
* Soft delete strategy
* External providers isolated behind a generic service
* Strong test coverage for business logic and critical flows

---

## ✨ Implemented Improvements & Extras

### 1️⃣ Clean Domain Structure

* Feature-based modules (`record`, `order`)
* Explicit repository layer
* External integrations isolated from domain logic

### 2️⃣ External Provider Abstraction

* Introduced a **generic release service** instead of coupling the domain to MusicBrainz
* Makes provider replacement trivial in the future

```txt
integrations/
└─ releases/
   ├─ release.service.ts
   └─ providers/
      └─ musicbrainz.provider.ts
```

---

### 3️⃣ Database-Level Filtering & Pagination

* All filtering is executed directly in MongoDB
* Supports `limit` and `offset`
* Prevents loading large datasets into memory
* Scales linearly with database size

---

### 4️⃣ Indexing Strategy

* Compound unique index for records:

  ```
  (artist, album, format)
  ```
* Ensures data integrity and fast lookups
* Index choices are based on selectivity and query patterns

---

### 5️⃣ Cache for Read-Heavy Queries

* Short-lived cache for `GET /records`
* Cache key based on query filters
* Automatic invalidation on create/update/delete
* Mutable data (stock, orders) is **never cached**

---

### 6️⃣ Atomic Stock Operations

* Stock decrement is performed using **atomic MongoDB operations**
* Prevents overselling under concurrent requests
* Explicit rollback logic if order creation fails

---

### 7️⃣ Concurrency Safety (e2e Tested)

* End-to-end tests simulate concurrent order creation
* Guarantees that only one order succeeds when stock is limited

---

### 8️⃣ Soft Delete Strategy

* Records are soft-deleted using `deletedAt`
* Deleted records are excluded from all queries
* Deleting an already deleted record returns `404`

---

### 9️⃣ Historical Price Preservation

* Order stores the record price at the time of purchase
* Protects historical data from future price changes

---

### 🔟 Comprehensive Testing

* Unit tests for services and repositories
* Controller tests for HTTP contracts
* End-to-end tests for real workflows
* Explicit tests for error cases and concurrency

---

## 📡 API Routes Overview

### 🎵 Records

| Method | Endpoint       | Description                            |
| ------ | -------------- | -------------------------------------- |
| POST   | `/records`     | Create a new record                    |
| GET    | `/records`     | List records with filters & pagination |
| GET    | `/records/:id` | Get record details                     |
| PUT    | `/records/:id` | Update a record                        |
| DELETE | `/records/:id` | Soft delete a record                   |

**Query Parameters (`GET /records`)**

* `q` – free text search
* `artist`
* `album`
* `format`
* `category`
* `limit`
* `offset`

---

### 🛒 Orders

| Method | Endpoint  | Description        |
| ------ | --------- | ------------------ |
| POST   | `/orders` | Create a new order |

**Order creation guarantees**

* Validates stock availability
* Decrements stock atomically
* Preserves price history
* Prevents overselling

---

## 🧪 Running Tests

```bash
npm run test
npm run test:e2e
npm run test:cov
```

Coverage intentionally focuses on:

* business logic
* data access
* concurrency-critical paths

Infrastructure files (`modules`, `schemas`, `main.ts`) are validated indirectly via integration and e2e tests.

---

## 🛠️ Running the Project

```bash
npm install
npm run start:dev
```

Environment variables:

```env
MONGO_URL=mongodb://localhost:27017/records
```

## 📌 Final Notes

### Query Performance Analysis

The project supports MongoDB query analysis using `explain("executionStats")`,
allowing validation of index usage and query efficiency during development.

### Future improvements:      

 * Authentication and role-based access control
 * Support for multiple external release providers

---

**Author:** Daniel
**Repository:** [https://github.com/drzbraz/nestjs-challenge](https://github.com/drzbraz/nestjs-challenge)

---
