# Phase 1 Report: Project Setup & Auth

## Status: DONE

## Commits
- `2181e5a` — Phase 1: Full project setup with auth, DB, tests

## Test Results
Command: `npm test -- --forceExit --detectOpenHandles --runInBand`

Result: **21 passed, 0 failed, 3 suites**

```
PASS tests/models/UserModel.test.js (9 tests)
  √ create user with buyer role
  √ create user with vendor role
  √ findById returns user
  √ findById returns undefined for non-existent id
  √ findByEmail returns user
  √ findByEmail returns undefined for non-existent email
  √ update user fields
  √ findAll returns users with pagination
  √ findAll filters by role

PASS tests/controllers/AuthController.test.js (8 tests)
  √ POST /api/v1/auth/register → success (201)
  √ POST /api/v1/auth/register → duplicate email (422)
  √ POST /api/v1/auth/register → validation error (422)
  √ POST /api/v1/auth/login → success (200)
  √ POST /api/v1/auth/login → wrong password (401)
  √ POST /api/v1/auth/login → non-existent user (401)
  √ GET /api/v1/auth/me → with valid token (200)
  √ GET /api/v1/auth/me → without token (401)

PASS tests/middleware/auth.test.js (4 tests)
  √ should return 401 if no token provided
  √ should return 401 if token is invalid
  √ should call next with req.user set for valid token
  √ should extract token from cookie
```

Server verification: started successfully on port 3000, migration ran, "GreenTech Procurement Server running on port 3000" confirmed.

## Files Created

| Category | Files |
|----------|-------|
| Config | `config/db.js`, `config/auth.js`, `config/app.js` |
| Database | `migrations/001_initial_schema.js` (9 tables + 14 indexes) |
| Helpers | `helpers/uuid.js`, `helpers/apiResponse.js`, `helpers/pagination.js`, `helpers/formatters.js` |
| Middleware | `middleware/auth.js`, `middleware/roleCheck.js`, `middleware/validate.js`, `middleware/errorHandler.js` |
| Models | `models/UserModel.js`, `models/DashboardModel.js` |
| Controllers | `controllers/AuthController.js`, `controllers/UserController.js` |
| Routes | `routes/authRoutes.js`, `routes/userRoutes.js`, `routes/index.js` |
| Views | `views/layouts/main.ejs`, `views/auth/login.ejs`, `views/auth/register.ejs`, `views/dashboard/buyer.ejs`, `views/dashboard/vendor.ejs` |
| Public | `public/css/app.css` |
| Server | `server.js` |
| Config | `package.json`, `.env`, `.gitignore`, `jest.config.js` |
| Tests | `tests/setup.js`, `tests/models/UserModel.test.js`, `tests/controllers/AuthController.test.js`, `tests/middleware/auth.test.js` |

## Concerns
1. **First commit contains node_modules/** — .gitignore was added after node_modules was already staged. The repo works but initial commit is ~1000x larger than needed. Future `git rm --cached node_modules/` (or a clean re-init) would fix this. Source code itself is clean.
2. **Windows CRLF warnings** — git-bash on Windows shows LF→CRLF conversion warnings. Cosmetic, no functional impact.
3. **EJS view structure** — Since EJS has no native layout inheritance, views use `<%- include(...) %>` pattern to embed content into layouts/main.ejs. This works but differs from the exact brief's inline `<% body = 'name' %>` convention — the actual rendering passes body content as a string arg to the include.
4. **Test DB isolation** — setup.js deletes test.db on load and uses `delete require.cache` to get a fresh DB connection. Works with `--runInBand` but might need adjustment for parallel test runs.
