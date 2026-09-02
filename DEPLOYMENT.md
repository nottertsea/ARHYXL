# arhyXL deployment

## Current implementation

The backend supports both the existing local SQLite database (`arhyxl.sqlite`) and MySQL through `db.js`. Set `DB_CLIENT=sqlite` to preserve the current local database or `DB_CLIENT=mysql` to use the MySQL database configured in `.env`. Paystack order initialization, server-side amount calculation, verification, webhook handling, order storage, and confirmation are implemented in `server.js`.

`mysql-schema.sql` is a non-destructive schema for the MySQL database. The adapter creates missing tables on startup and uses parameterized queries throughout.

## Local test

1. Copy `.env.example` to `.env`.
2. For the existing SQLite database, set `DB_CLIENT=sqlite`. For MySQL, set `DB_CLIENT=mysql` and replace `MYSQL_PASSWORD` with your private local password.
3. Put your Paystack test secret in `PAYSTACK_SECRET_KEY`.
4. Run `npm install`.
5. Run `npm start`.
6. Open `http://localhost:3000` (do not open HTML files directly for payment redirects).
7. Create an account, add an item, open the cart, enter delivery details, and click `Pay Now`.
8. Use Paystack test credentials from the Paystack dashboard. Never use a live key locally.

Payment amounts are recalculated from the database product price in kobo. The frontend total is display-only.

## MySQL migration

Do not delete the local database.

1. Export the local MySQL database, if one exists:

   ```bash
   mysqldump -u YOUR_USER -p --single-transaction --routines --triggers YOUR_DATABASE > existing-backup.sql
   ```

2. Create an empty production MySQL database and user with your provider.
3. Import the existing dump into the production database:

   ```bash
   mysql -h HOST -P 3306 -u YOUR_USER -p YOUR_DATABASE < existing-backup.sql
   ```

4. Review `mysql-schema.sql` against the existing `users` and `products` primary-key types, then run it against production. It uses `CREATE TABLE IF NOT EXISTS` and does not drop existing tables.
5. Take a new production backup before launch.

The repository's existing data file is SQLite. To migrate that data, export rows using SQLite tooling, map them to the MySQL schema, and import them after confirming column names. Do not import `arhyxl.sqlite` as a MySQL dump.

## Railway or Render backend

1. Push the repository to a private GitHub repository.
2. Create a Railway service or Render Web Service from the repository.
3. Build command: `npm install`.
4. Start command: `npm start`.
5. Add environment variables from `.env.example`.
6. Set `PORT` from the platform environment and set `PAYSTACK_CALLBACK_URL` to `https://YOUR-FRONTEND-DOMAIN/confirmation.html`.
7. Set `FRONTEND_ORIGIN` to the exact Vercel origin, without a trailing slash.
8. Configure production MySQL credentials only after the MySQL adapter is connected and tested.
9. Set Paystack webhook URL to `https://YOUR-BACKEND-DOMAIN/api/paystack/webhook`.

## Vercel frontend

The static HTML frontend can be deployed as a Vercel project with the repository root as the output. `api-client.js` uses same-origin `/api` URLs when served over HTTP, so production needs either a reverse proxy from the frontend origin to the backend or a small production API-base configuration in `api-client.js` pointing at the backend origin. Never put `PAYSTACK_SECRET_KEY` in frontend code.

For the simplest setup, configure the backend domain and frontend domain, then add a production API base such as `https://YOUR-BACKEND-DOMAIN/api` to the frontend deployment configuration before launch.

## Paystack launch checklist

1. Create Paystack test keys and put only the secret in the backend environment.
2. Test successful, failed, cancelled, and abandoned attempts.
3. Confirm an order remains pending until `/api/orders/:reference/verify` or a valid webhook confirms success.
4. Confirm the webhook signature is accepted only with the backend secret.
5. Switch the backend environment values to Paystack live keys after business verification.
6. Update the callback URL and webhook URL to HTTPS production URLs.
7. Make a live low-value test payment and verify the MySQL order record before announcing the store.

## Domain

1. Add the custom domain in Vercel.
2. Add the DNS records Vercel provides.
3. Wait for HTTPS provisioning.
4. Set `FRONTEND_ORIGIN` and `PAYSTACK_CALLBACK_URL` to the final HTTPS domain.
5. Redeploy the backend and frontend.
6. Confirm the final domain can create an account, add to cart, pay, return to confirmation, and show the order reference.
