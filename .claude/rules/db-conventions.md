# Database & Persistence Guidelines (TypeORM / PostgreSQL)

This document mandates how Claude interacts with the database layer inside the infrastructure boundaries.

## Rules of Engagement

### 1. Primary Keys & Identifiers
- Every database model entity must employ UUID v4 tokens as identification strategies.
- Never use automatic numerical incremental indexing strategies (`@PrimaryGeneratedColumn('increment')` is forbidden).

### 2. Error Code Handling Mapping
- When executing mutations (Creates, Updates, Deletes), wrap processing branches inside block try/catch units.
- Explicitly trap PostgreSQL native constraint violation error sequence **`23505`** (Unique Violation). Map this error to a clean `ConflictException` from NestJS common package.
