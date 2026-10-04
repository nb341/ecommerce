# Ecommerce fullstack project

. E-Commerce Platform

A web-based application where users can buy and sell products online, featuring a feature-rich UI with sections for order history, categorized products, search bar, profile, login/logout, and secure payments. Inspired by platforms like Amazon and Flipkart, it handles transactions and data records efficient

- `ecommerce-ui/` (Nx project `ui`): React 19 + Vite + TypeScript + Tailwind SPA
- `EcommerceAPI/` (Nx project `api`): ASP.NET Core .NET 10 Web API, EF Core, PostgreSQL
- Nx is the task runner (`nx.json`, one `project.json` per project; no npm workspaces). From the repo
  root: `npm run dev`, `npm run build`, `npm run lint`, or `npx nx <target> <project>`.
  Docker: `compose.yaml` (Postgres, Redis, plus API and UI under the `full` profile).
- `docs/product/`: product vision, backlog and feature specs (owned by `product-manager`)
- `docs/database/schema.md`: schema source of truth (owned by `database-architect`)

## Agent team workflow

The subagents in `.claude/agents/` each own one area:

1. **`product-manager`**: write or confirm the feature spec in `docs/product/features/` (user stories, Gherkin acceptance criteria, task breakdown). Escalate business questions to the user.
2. **`database-architect`**: schema, indexes and migrations for the feature's data needs.
3. **`dotnet-backend-architect`**: domain, feature handlers, controllers and xUnit tests. Publishes the API contract.
4. **`react-frontend-engineer`**: UI against that contract, plus tests.
5. **`product-manager`**: verify the Definition of Done and update the backlog.

**`devops-engineer`** works alongside these steps. It owns the Dockerfiles, `compose.yaml`, `.env.example`, git hooks (Husky + lint-staged + commitlint + gitleaks), Prettier/oxlint/`dotnet format` configuration, and the local setup docs (`docs/devops/`). CI/CD is out of scope for now.

Subagents can't call each other. The main session dispatches each step using the hand-off briefs the product manager writes, and passes each agent's report on to the next one (e.g. the backend's API contract to the frontend). Steps 2–4 can overlap when the contract is agreed up front.

We are building an e-commerce MVP.

I want you to create an implementation plan BEFORE making any code changes.

First, inspect the existing repository thoroughly:

- Current directory structure
- Existing source code
- Existing configuration
- Existing tests
- Existing dependencies
- Existing Docker configuration
- Git status and current branch
- Any existing documentation or README files

Do NOT modify any files yet.

## Requirements

The application is an e-commerce platform with:

### Frontend

- React
- Responsive UI
- Product catalog
- Product categories
- Product search
- Product details
- Shopping cart
- Checkout
- Order history
- User profile
- Login/logout

### Backend

- .NET 10 Web API
- RESTful API
- JWT authentication
- Authorization
- Product management
- Cart management
- Order management
- User management
- Stripe payment integration

### Database

- PostgreSQL
- Persistent storage for:

  - Users
  - Products
  - Categories
  - Cart/cart items
  - Orders
  - Order items
  - Payment information/status

### Infrastructure

- Docker
- Redis for caching
- PostgreSQL
- React frontend
- .NET API

## Acceptance Criteria

Use the following Gherkin acceptance criteria as the behavioral specification:

[PASTE THE GHERKIN ACCEPTANCE CRITERIA HERE]

## Planning Requirements

Create a detailed implementation plan.

The plan MUST include:

1. Architecture

   - Overall system architecture
   - Frontend/backend boundaries
   - API boundaries
   - Database boundaries
   - Authentication flow
   - Payment flow
   - Redis caching strategy

2. Project structure

   - Proposed directory structure
   - Which projects/packages should exist
   - Responsibility of each major directory

3. Database design

   - Entities
   - Relationships
   - Primary/foreign keys
   - Important indexes
   - Constraints
   - Any concurrency considerations

4. API design

   - Endpoints
   - HTTP methods
   - Request/response responsibilities
   - Authentication requirements
   - Authorization requirements
   - Error handling

5. Frontend design

   - Pages/routes
   - Components
   - State management
   - API communication
   - Authentication handling
   - Cart handling
   - Checkout flow

6. Security

   - JWT strategy
   - Password hashing
   - Authorization
   - Input validation
   - Stripe webhook security
   - Protection against users accessing other users' orders
   - Sensitive data handling

7. Caching

   - What should be cached
   - Cache keys
   - TTL strategy
   - Cache invalidation
   - What should NOT be cached

8. Testing strategy
   Map the Gherkin acceptance criteria to:

   - Unit tests
   - Integration tests
   - API tests
   - Frontend tests
   - End-to-end tests

9. Docker/development environment

   - Containers
   - Docker Compose configuration
   - Environment variables
   - Local development workflow

10. Implementation order
    Break the work into small, independently testable phases.

For every phase, specify:

- What is being built
- Files/directories that will be created or modified
- Dependencies required
- Tests that should be written
- Acceptance criteria covered
- Potential risks

## Important constraints

Do NOT over-engineer this.

This is an MVP.

Prefer straightforward, maintainable code over unnecessary abstractions, microservices, CQRS, event sourcing, or complex architecture.

Use a modular monolith architecture for the backend unless the existing repository strongly suggests otherwise.

Do not introduce libraries unless there is a clear reason to use them.

Do not make assumptions about the existing codebase. If something is unclear, explicitly call it out.

At the end, provide:

### Architecture Decision Summary

List the major architectural decisions and why they were chosen.

### Risks

List the highest-risk parts of the implementation.

### Open Questions

List anything you need me to decide before implementation.

### Implementation Order

Give me the exact order you recommend implementing the system.

DO NOT IMPLEMENT ANYTHING YET.

Only produce the plan.
