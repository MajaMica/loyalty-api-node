# 🚀 Loyalty API (Node.js)

**Modern upgrade for WooCommerce loyalty systems** – replaces legacy `functions.php` logic with a clean, scalable, and maintainable API.

---

## 📌 What This Is

This is a **production-ready loyalty and coupon engine** built with:

- **Node.js + Express** (backend)
- **TypeScript** (type-safe code)
- **Prisma ORM** (database management)
- **Supabase (PostgreSQL)** (cloud database)
- **WooCommerce REST API** (coupon sync)
- **Webhooks** (automatic points on order completion)

It was built as a **direct upgrade** to a custom WordPress loyalty system that was previously managed inside `functions.php` with `usermeta` tables.

---

## ✨ Key Features

| Feature | Description |
| :--- | :--- |
| 👤 **User Management** | Auto-register users via email (from WooCommerce orders) |
| 🧮 **Points Logic** | Same logic as legacy WP system (e.g., `< 5000 RSD = 50 points`) |
| 🏷️ **Coupon Sync** | Generates unique coupon codes and creates them **directly in WooCommerce** via REST API |
| 📜 **Transaction History** | Full log of every point earned or spent (no more guessing) |
| 🔗 **WooCommerce Webhook** | Listens for `order.completed` events – **no manual work needed** |
| ☁️ **Cloud Database** | Supabase (PostgreSQL) – accessible from anywhere |

---

## 🧠 Why This Over WordPress?

| Legacy WP Approach | This Node.js API |
| :--- | :--- |
| `functions.php` with 1000+ lines | Clean, modular TypeScript code |
| `usermeta` tables (key-value, slow) | Proper relational tables (`User`, `Transaction`, `Coupon`) |
| Manual coupon creation in WP admin | **Automatic** coupon sync via API |
| No transaction history | Full history for every user |
| Tightly coupled to WP | Decoupled – works with any e-commerce system |
| Hard to scale | Ready for high traffic and future features (expiration, partial spending, etc.) |

---

## 🛠️ Tech Stack

- **Backend:** Node.js + Express
- **Language:** TypeScript
- **ORM:** Prisma
- **Database:** PostgreSQL (Supabase)
- **HTTP Client:** Axios (for WooCommerce API)
- **Deployment:** Ready for Railway / Render / Vercel

---

## 📁 Folder Structure
src/
├── index.ts # Main server entry point
prisma/
├── schema.prisma # Database models
├── migrations/ # SQL migration history
.env # Environment variables (not in repo)


---

## 🔧 API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/users` | List all users |
| `GET` | `/points/:userId` | Check user's points balance |
| `POST` | `/assign-points` | Manually assign points (testing) |
| `POST` | `/generate-coupon` | Generate coupon & sync to WooCommerce |
| `POST` | `/webhook/order-completed` | WooCommerce webhook receiver |

---

## 🔗 WooCommerce Integration

1. Generate **REST API keys** in WooCommerce (Settings → Advanced → REST API).
2. Add them to your `.env` file.
3. Configure a **Webhook** in WooCommerce:
   - URL: `https://your-api.com/webhook/order-completed`
   - Secret: `your_webhook_secret`
4. Done – points are now **automatic** on order completion!

---

## 🚀 Getting Started

```bash
# Clone the repo
git clone https://github.com/MajaMica/loyalty-api-node.git

# Install dependencies
npm install

# Configure .env (copy from .env.example)
# Run migrations
npx prisma migrate dev --name init

# Start the server
npm run dev
