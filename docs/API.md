# API Overview

This document summarizes the key API endpoints used by the frontend (`FE/src/utils/functions.js`) and admin/customer flows.

Base URL (dev):
- Backend: `http://localhost:3000` (configurable via env)
- Frontend: `http://localhost:3001`

Note: All endpoints below are prefixed with `/api` on the backend.

## Auth & Session
- GET `/api/me` → current session user
- POST `/api/login` { identifier, password, loginMethod } → { user }
- POST `/api/register` { username, email, password, user_type } → { user }

Admin auth mounting (server):
- `/api/admin/auth/*` (e.g., login/logout/session) – no admin guard on `/login`
- `/api/admin/*` – protected with `requireAuth` + `requireAdmin`

## Recipes (Public)
- GET `/api/recipes` → [{ id, name, ... }]
- GET `/api/recipes/:id` → { item }
- GET `/api/recipes/top-rated?limit=N` → { items }
- GET `/api/recipes/:id/ratings` → { avg, count, userStars }
- POST `/api/recipes/:id/ratings` { stars } → { avg, count, userStars }

## Menu (Products by Recipe)
- GET `/api/menu` → { items }
- GET `/api/menu/search` (q, category, dietType, min/max filters) → { items }
- GET `/api/menu/categories` → { items }
- GET `/api/menu/by-recipe/:recipeId` → { product_id, price, stock, ... }
- GET `/api/menu/eligible?customer_id&dietType` → { items }

Admin product management:
- GET `/api/admin/recipes/:recipeId/product` → product details (admin scope)
- PATCH `/api/admin/recipes/:recipeId/product` { price?, stock?, discounted_price?, clear_discount? }
- PATCH `/api/recipes/bulk_price` { recipeIds: number[], newPrice: number }

## FAQ (Questions)
- GET `/api/questions?q=` → [ { question_id, question_text, answer_text?, public, answered } ]
- POST `/api/questions` { question_text, user_id } → created question
- PUT `/api/questions/:id/answer` { answer_text } → updated question
- PATCH `/api/questions/:id/visibility` { public: boolean } → { ... }

## Customers & Plans
- GET `/api/customers/by-user/:userId` → { cust_id } (created on demand)
- GET `/api/plan?customer_id` → plans
- GET `/api/plan/:id` → plan
- POST `/api/plan` { ... } → plan
- POST `/api/plan/:id/renew` → renew plan period
- GET `/api/plan/:id/products` → rows
- POST `/api/plan/:id/products` { product_id, servings }
- PATCH `/api/plan/:id/products/:linkId` { servings }
- DELETE `/api/plan/:id/products/:linkId`
- POST `/api/plan/:id/add_to_cart` { clear, quantityMode } → { added }

## Cart
- GET `/api/cart` → { items }
- GET `/api/cart/summary` → { total_price, total_items, total_calories }
- POST `/api/cart` { product_id, quantity }
- PATCH `/api/cart/:id` { quantity }
- DELETE `/api/cart/:id`
- DELETE `/api/cart` (clear)

## Orders
- POST `/api/orders/checkout` { schedule, applyToAll } → { order_id }
- GET `/api/orders` → { items }
- GET `/api/orders/:id` → { order, items }
- GET `/api/orders/draft/latest` → { order_id } | null

## Admin: Users
- PATCH `/api/admin/users/:userId/role` { user_type }
- PATCH `/api/admin/users/:userId/ban` { banned } or details payload
- POST `/api/admin/users/:userId/ban` { reason } (canonical ban create)
- POST `/api/admin/users/:userId/unban`
- DELETE `/api/admin/users/:userId`
- POST `/api/admin/users/:userId/restore`

## Notifications
- GET `/api/notifications/user/:userId` → [ ... ]
- GET `/api/notifications/user/:userId/type` → [ types ]
- POST `/api/notifications` { user_id, type, related_id, title, description }
- PUT `/api/notifications/:id`
- DELETE `/api/notifications/:id`
- DELETE `/api/notifications/user/:userId`

## Conventions
- All responses are JSON.
- Many endpoints return `{ items }` arrays; single entities often under `{ item }`.
- Admin routes require authentication and admin role.
