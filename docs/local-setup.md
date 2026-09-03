# Local Setup

This guide provides instructions for setting up the Filika repository for local development and loopback testing.

## Prerequisites

- Bun 1.3.14 or later
- PostgreSQL 16 or later
- Node.js (for tooling compatibility)

## Database Configuration

1. Create a local PostgreSQL database.
2. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
3. Update `DATABASE_URL` in `.env` to point to your local database instance.

## Installation and Startup

1. Install all dependencies using Bun:
   ```bash
   bun install
   ```
2. Run database migrations to set up the schema:
   ```bash
   bun run db:migrate
   ```
3. (Optional) Seed the database with demo data:
   ```bash
   bun run db:seed
   ```
4. Start the development server:
   ```bash
   bun run dev
   ```

The local development server will be available at `http://localhost:4173`. You can access the local test sandbox at `/demo`.
