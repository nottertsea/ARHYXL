require('dotenv').config();
const path = require('node:path');
const crypto = require('node:crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('./db');

const app = express();
const port = Number(process.env.PORT) || 3000;
const host = '0.0.0.0';
const paystackSecretKey = (process.env.PAYSTACK_SECRET_KEY || '').trim();
const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';
const paystackCallbackUrl = process.env.PAYSTACK_CALLBACK_URL || `${frontendOrigin}/confirmation.html`;
const hasUsablePaystackSecret = /^sk_(test|live)_[A-Za-z0-9]+$/.test(paystackSecretKey);

const productSeed = [
    ['vans', 'Vans', 'Classic skate-inspired shoes with a timeless silhouette.', 35000, ['41', '42', '43', '44', '45', '46'], [['Classic', 'Vans.jpeg'], ['Black & White', 'vansblackandwhite.jpeg'], ['All Black', 'vansallblack.jpeg'], ['Blue & Black', 'vansblueandblack.jpeg'], ['Brown', 'vansbrown.jpeg'], ['Green', 'vansgreen.jpeg'], ['Red', 'vansred.jpeg'], ['Red & Black', 'vansredandblack.jpeg']]],
    ['airmax', 'Nike Air Max 95', 'A bold Air Max silhouette with cushioned comfort.', 38000, ['38', '39', '40', '41', '42', '43', '44', '45', '46'], [['Black', 'AirMax95.jpeg'], ['Green', 'airmax95green.jpeg']]],
    ['speedcat', 'Puma Speedcat', 'A lightweight racing-inspired sneaker with a sleek profile.', 38000, ['38', '39', '40', '41', '42', '43', '44', '45', '46'], [['Classic', 'Speedcats.jpeg'], ['White & Black', 'speedcatblackandwhite.jpeg'], ['Pink', 'speedcatpink.jpeg'], ['Green', 'speedcatsgreen.jpeg'], ['Red', 'speedcatsred.jpeg']]],
    ['campus', 'Adidas Campus 80s', 'An iconic retro basketball-inspired sneaker.', 33000, ['38', '39', '40', '41', '42', '43', '44', '45', '46'], [['Black/White', 'blackandwhitecampuses.jpeg'], ['Black', 'blackcampuses.jpeg'], ['Blue', 'bluecampuses.jpeg'], ['Gray', 'graycampuses.jpeg'], ['Green', 'greencampuses.jpeg'], ['Pink', 'pinkcampuses.jpeg'], ['Red', 'redcampuses.jpeg']]],
    ['samba', 'Adidas Samba OG', 'A heritage football-inspired sneaker with a clean classic look.', 35000, ['41', '42', '43', '44', '45', '46'], [['Black', 'blacksambas.jpeg'], ['White', 'whitesambas.jpeg']]],
    ['airforce', 'Nike Air Force 1 Low', 'A timeless low-top basketball sneaker.', 35000, ['38', '39', '40', '41', '42', '43', '44', '45', '46', '47', '48', '49', '50', '51', '52', '53', '54', '55', '56'], [['Black', 'blackairforces.jpeg'], ['White', 'whiteairforces.jpeg']]],
    ['newbalance', 'New Balance 9060', 'An elevated lifestyle sneaker with modern comfort.', 40000, ['38', '39', '40', '41', '42', '43', '44', '45', '46'], [['Black', 'blacknbs.jpeg'], ['Green', 'greennbs.jpeg'], ['Brown', 'brownnbs.jpeg'], ['White', 'whitenbs.jpeg'], ['Gray', 'graynbs.jpeg']]],
    ['suede', 'Puma Suede XL', 'A chunky suede staple with a bold silhouette.', 40000, ['41', '42', '43', '44', '45', '46'], [['Classic', 'Pumasuade.jpeg'], ['Jet Black', 'jetblacksuede.jpeg'], ['Blue', 'bluesuedexl.jpeg'], ['Green', 'greensuede.jpeg'], ['Red', 'redsuede.jpeg']]],
    ['timberland', 'Timberland Boots', 'Durable weather-ready boots built for everyday wear.', 70000, ['41', '42', '43', '44', '45', '46'], [['Black', 'blacktimbs.jpeg'], ['Classic', 'Timberlandboots.jpeg']]],
    ['drmartens-1461', 'Dr. Martens 1461 8-Eye Boot', 'The iconic 1461 boot with durable leather.', 55000, ['42', '43', '44', '45', '46'], [['Black', '1461docs.jpeg']]],
    ['drmartens-bex', 'Dr. Martens Bex Tassel 8-Eye Boot', 'A refined tassel-detail boot with signature edge.', 55000, ['42', '43', '44', '45', '46'], [['Black', 'Adrianbextasseldocs.jpeg']]],
    ['drmartens-8053', 'Dr. Martens 8053 8-Eye Boot', 'A classic 8053 silhouette with robust construction.', 53000, ['42', '43', '44', '45', '46'], [['Black', '8053docs.jpeg']]],
    ['dior', 'Christian Dior B22', 'A luxury streetwear sneaker with sculpted styling.', 38000, ['38', '39', '40', '41', '42', '43', '44', '45', '46'], [['Black', 'Diorb22black.jpeg']]],
    ['plainshirts', 'Plain Shirt', 'Clean, versatile tees in everyday colorways.', 11000, ['S', 'M', 'L', 'XL', 'XXL'], [['Black', 'blackplaintee.jpeg'], ['Brown', 'brownplaintee.jpeg'], ['Green', 'greenplaintee.jpeg'], ['Navy Blue', 'navyblueplaintee.jpeg']]],
    ['sweatshorts', 'Sweat Shorts', 'Relaxed lounge shorts made for comfort and movement.', 15000, ['S', 'M', 'L', 'XL', 'XXL'], [['Classic', 'shorts.jpeg'], ['Utility', 'shorts.jpeg']]],
    ['sweatpants', 'Sweat Pants', 'Soft, heavyweight essentials for easy layering.', 20000, ['S', 'M', 'L', 'XL', 'XXL'], [['Ash', 'graysweatsone.jpeg'], ['Ash Three', 'graysweatsthree.jpeg'], ['Ash Four', 'graysweatsfour.jpeg'], ['Ash Five', 'graysweatsfive.jpeg'], ['Black', 'blacksweatsone.jpeg'], ['Light Pink', 'pinksweatsone.jpeg'], ['Brown', 'brownsweatsone.jpeg'], ['Gray and Black', 'grayandblacksweatsone.jpeg'], ['Classic', 'sweatsone.jpeg'], ['All Black', 'allsweats.jpeg']]],
    ['hoodies', 'Zip Up Hoodie', 'Layering essentials with soft interiors.', 25000, ['S', 'M', 'L', 'XL', 'XXL'], [['Classic', 'Zipuphoodie.jpeg']]],
    ['saeive', 'Sae iVe Tee', 'A standout graphic tee with premium comfort.', 15000, ['S', 'M', 'L', 'XL', 'XXL'], [['Sae iVe Graphic', 'Saetee.jpeg']]]
];

const parseJsonColumn = (value) => typeof value === 'string' ? JSON.parse(value) : value;
const publicProduct = (row) => ({ id: row.id, title: row.title, description: row.description, price: Number(row.price), sizes: parseJsonColumn(row.sizes_json), options: parseJsonColumn(row.options_json) });
const validText = (value, max) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
const authUser = async (request) => {
    const token = request.get('authorization')?.replace(/^Bearer\s+/i, '');
    return token ? db.get('SELECT users.id, users.name, users.email FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.token = ?', [token]) : null;
};
const requireUser = async (request, response, next) => {
    request.user = await authUser(request);
    if (!request.user) return response.status(401).json({ error: 'Authentication required.' });
    return next();
};
const paystackRequest = async (endpoint, options = {}) => {
    if (!hasUsablePaystackSecret) throw new Error('Paystack is unavailable: set PAYSTACK_SECRET_KEY to a real sk_test_ or sk_live_ key on the backend.');
    console.log(`[Paystack] ${options.method || 'GET'} ${endpoint} (secret loaded: ${paystackSecretKey.length} chars)`);
    const result = await fetch(`https://api.paystack.co${endpoint}`, { ...options, headers: { Authorization: `Bearer ${paystackSecretKey}`, 'Content-Type': 'application/json' } });
    const data = await result.json();
    console.log(`[Paystack] ${endpoint} responded ${result.status}; status=${Boolean(data.status)}; message=${data.message || 'none'}; authorization_url=${Boolean(data.data?.authorization_url)}`);
    if (!result.ok || !data.status) throw new Error(data.message || 'Paystack request failed.');
    return data;
};

app.use('/api/paystack/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '1mb' }));
app.use((request, response, next) => {
    const origin = request.get('origin');
    const allowed = frontendOrigin.split(',').map((value) => value.trim());
    if (origin && (origin === 'null' || allowed.includes(origin))) response.setHeader('Access-Control-Allow-Origin', origin);
    response.setHeader('Vary', 'Origin');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    if (request.method === 'OPTIONS') return response.sendStatus(204);
    return next();
});
app.use((request, response, next) => /^\/(?:arhyxl\.sqlite|schema\.sql|mysql-schema\.sql|server\.js|db\.js|package(?:-lock)?\.json|node_modules)(?:\/|$)/.test(request.path) ? response.sendStatus(404) : next());
app.use(express.static(__dirname));

app.get('/api/health', (request, response) => response.json({ ok: true, database: db.client }));
app.get('/api/products', async (request, response, next) => { try { response.json((await db.all('SELECT * FROM products ORDER BY title')).map(publicProduct)); } catch (error) { next(error); } });
app.get('/api/products/:id', async (request, response, next) => { try { const product = await db.get('SELECT * FROM products WHERE id = ?', [request.params.id]); if (!product) return response.status(404).json({ error: 'Product not found.' }); return response.json(publicProduct(product)); } catch (error) { next(error); } });

app.post('/api/auth/signup', async (request, response, next) => {
    try {
        const { name, email, password } = request.body || {};
        if (!validText(name, 100) || !/^\S+@\S+\.\S+$/.test(email || '') || typeof password !== 'string' || password.length < 6) return response.status(400).json({ error: 'Name, valid email, and a password of at least 6 characters are required.' });
        const passwordHash = await bcrypt.hash(password, 12);
        const result = await db.run('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)', [name.trim(), email.trim().toLowerCase(), passwordHash]);
        const token = crypto.randomBytes(32).toString('hex');
        await db.run('INSERT INTO sessions (token, user_id) VALUES (?, ?)', [token, result.lastInsertRowid]);
        return response.status(201).json({ token, user: { id: result.lastInsertRowid, name: name.trim(), email: email.trim().toLowerCase() } });
    } catch (error) { if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || error.code === 'ER_DUP_ENTRY') return response.status(409).json({ error: 'An account with that email already exists.' }); return next(error); }
});
app.post('/api/auth/login', async (request, response, next) => {
    try {
        const { email, password } = request.body || {};
        const emailQuery = db.client === 'mysql' ? 'SELECT * FROM users WHERE email = ?' : 'SELECT * FROM users WHERE email = ? COLLATE NOCASE';
        const user = await db.get(emailQuery, [email || '']);
        if (!user || !(await bcrypt.compare(password || '', user.password_hash))) return response.status(401).json({ error: 'Invalid email or password.' });
        if (await db.get('SELECT 1 FROM sessions WHERE user_id = ? LIMIT 1', [user.id])) return response.status(409).json({ error: 'This account is already logged in. Log out first.' });
        const token = crypto.randomBytes(32).toString('hex');
        await db.run('INSERT INTO sessions (token, user_id) VALUES (?, ?)', [token, user.id]);
        return response.json({ token, user: { id: user.id, name: user.name, email: user.email } });
    } catch (error) { return next(error); }
});
app.post('/api/auth/logout', requireUser, async (request, response, next) => { try { await db.run('DELETE FROM sessions WHERE token = ?', [request.get('authorization').replace(/^Bearer\s+/i, '')]); response.status(204).end(); } catch (error) { next(error); } });
app.get('/api/me', requireUser, (request, response) => response.json({ user: request.user }));

app.get('/api/cart', requireUser, async (request, response, next) => { try { const rows = await db.all('SELECT cart_items.*, products.title, products.price FROM cart_items JOIN products ON products.id = cart_items.product_id WHERE user_id = ? ORDER BY cart_items.id DESC', [request.user.id]); response.json(rows.map((item) => ({ ...item, price: Number(item.price), image: item.variant, lineTotal: Number(item.price) * item.quantity, selected: true }))); } catch (error) { next(error); } });
app.post('/api/cart', requireUser, async (request, response, next) => {
    try {
        const { productId, variant, size, note = '', rating = 0, quantity = 1 } = request.body || {};
        const product = await db.get('SELECT * FROM products WHERE id = ?', [productId]);
        const options = product ? parseJsonColumn(product.options_json) : [];
        const sizes = product ? parseJsonColumn(product.sizes_json) : [];
        if (!product || !options.some((option) => option.image === variant) || !sizes.includes(size) || (note !== '' && !validText(note, 1000)) || !Number.isInteger(quantity) || quantity < 1 || quantity > 99 || !Number.isInteger(Number(rating)) || rating < 0 || rating > 5) return response.status(400).json({ error: 'Invalid cart item.' });
        const existing = await db.get('SELECT id FROM cart_items WHERE user_id = ? AND product_id = ? AND variant = ? AND size = ? AND note = ? AND rating = ?', [request.user.id, productId, variant, size, note, rating]);
        if (existing) await db.run('UPDATE cart_items SET quantity = quantity + ? WHERE id = ? AND user_id = ?', [quantity, existing.id, request.user.id]);
        else await db.run('INSERT INTO cart_items (user_id, product_id, variant, size, note, rating, quantity) VALUES (?, ?, ?, ?, ?, ?, ?)', [request.user.id, productId, variant, size, note, rating, quantity]);
        return response.status(201).json({ message: 'Item added to cart.' });
    } catch (error) { next(error); }
});
app.patch('/api/cart/:id', requireUser, async (request, response, next) => { try { const quantity = Number(request.body?.quantity); if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) return response.status(400).json({ error: 'Quantity must be between 1 and 99.' }); const result = await db.run('UPDATE cart_items SET quantity = ? WHERE id = ? AND user_id = ?', [quantity, request.params.id, request.user.id]); if (!result.changes) return response.status(404).json({ error: 'Cart item not found.' }); response.json({ message: 'Cart updated.' }); } catch (error) { next(error); } });
app.delete('/api/cart/:id', requireUser, async (request, response, next) => { try { const result = await db.run('DELETE FROM cart_items WHERE id = ? AND user_id = ?', [request.params.id, request.user.id]); if (!result.changes) return response.status(404).json({ error: 'Cart item not found.' }); response.status(204).end(); } catch (error) { next(error); } });

app.post('/api/orders/initialize', requireUser, async (request, response, next) => {
    let orderReference;
    try {
        const { name, email, phone, address, itemIds, idempotencyKey } = request.body || {};
        if (!validText(name, 150) || !/^\S+@\S+\.\S+$/.test(email || '') || !validText(phone, 40) || !validText(address, 2000) || !Array.isArray(itemIds) || !itemIds.length || !validText(idempotencyKey, 120)) return response.status(400).json({ error: 'Customer and delivery details plus cart items are required.' });
        const prior = await db.get('SELECT * FROM orders WHERE user_id = ? AND idempotency_key = ?', [request.user.id, idempotencyKey]);
        if (prior?.paystack_reference && prior.authorization_url) return response.json({ orderReference: prior.order_reference, amountKobo: prior.amount_kobo, authorizationUrl: prior.authorization_url, message: 'This checkout attempt already exists.' });
        const ids = itemIds.map(Number).filter(Number.isInteger);
        const placeholders = ids.map(() => '?').join(',');
        const items = await db.all(`SELECT cart_items.id AS cart_item_id, cart_items.*, products.title, products.price FROM cart_items JOIN products ON products.id = cart_items.product_id WHERE cart_items.user_id = ? AND cart_items.id IN (${placeholders})`, [request.user.id, ...ids]);
        if (items.length !== ids.length) return response.status(400).json({ error: 'One or more cart items are no longer available.' });
        const amountKobo = items.reduce((total, item) => total + Number(item.price) * item.quantity * 100, 0);
        if (prior) {
            if (Number(prior.amount_kobo) !== amountKobo) return response.status(409).json({ error: 'This checkout attempt does not match the current cart.' });
            orderReference = prior.order_reference;
        } else {
            orderReference = `ARHYXL-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
            await db.transaction(async (tx) => {
                const order = await tx.run('INSERT INTO orders (order_reference, idempotency_key, user_id, amount_kobo, customer_name, customer_email, customer_phone, delivery_address) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [orderReference, idempotencyKey, request.user.id, amountKobo, name.trim(), email.trim().toLowerCase(), phone.trim(), address.trim()]);
                for (const item of items) await tx.run('INSERT INTO order_items (order_id, cart_item_id, product_id, title, variant, size, unit_price_kobo, quantity, line_total_kobo, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [order.lastInsertRowid, item.cart_item_id, item.product_id, item.title, item.variant, item.size, Number(item.price) * 100, item.quantity, Number(item.price) * item.quantity * 100, item.note]);
            });
        }
        console.log(`[Paystack] Initializing order ${orderReference}; amount=${amountKobo}; callback=${paystackCallbackUrl}`);
        const payment = await paystackRequest('/transaction/initialize', { method: 'POST', body: JSON.stringify({ amount: amountKobo, email: email.trim().toLowerCase(), reference: orderReference, callback_url: paystackCallbackUrl, metadata: { orderReference } }) });
        const authorizationUrl = payment.data?.authorization_url;
        if (typeof authorizationUrl !== 'string' || !/^https:\/\/checkout\.paystack\.com\//.test(authorizationUrl)) throw new Error('Paystack did not return a valid authorization URL.');
        await db.run('UPDATE orders SET paystack_reference = ?, authorization_url = ? WHERE order_reference = ?', [orderReference, authorizationUrl, orderReference]);
        console.log(`[Paystack] Order ${orderReference} initialized; authorization URL returned.`);
        return response.status(201).json({ orderReference, amountKobo, authorizationUrl, accessCode: payment.data.access_code });
    } catch (error) {
        if (orderReference) {
            await db.run('UPDATE orders SET status = ?, payment_status = ? WHERE order_reference = ?', ['failed', 'failed', orderReference]);
        }
        return response.status(502).json({ error: error.message || 'Unable to initialize Paystack payment.' });
    }
});

const finalizePayment = async (paymentData) => {
    const transaction = paymentData.data;
    const order = await db.get('SELECT * FROM orders WHERE order_reference = ? OR paystack_reference = ?', [transaction.reference, transaction.reference]);
    if (!order) return null;
    if (order.payment_status === 'success') return order;
    const paid = transaction.status === 'success' && transaction.reference === (order.paystack_reference || order.order_reference) && Number(transaction.amount) === Number(order.amount_kobo) && transaction.currency === 'NGN';
    await db.transaction(async (tx) => {
        await tx.run('UPDATE orders SET status = ?, payment_status = ?, paystack_transaction_id = ?, amount_paid_kobo = ?, paid_at = CASE WHEN ? THEN CURRENT_TIMESTAMP ELSE paid_at END WHERE id = ?', [paid ? 'paid' : 'failed', paid ? 'success' : 'failed', String(transaction.id || ''), Number(transaction.amount) || 0, paid ? 1 : 0, order.id]);
        if (paid) await tx.run('DELETE FROM cart_items WHERE user_id = ? AND id IN (SELECT cart_item_id FROM order_items WHERE order_id = ?)', [order.user_id, order.id]);
    });
    return db.get('SELECT * FROM orders WHERE id = ?', [order.id]);
};
app.get('/api/orders/:reference/verify', requireUser, async (request, response, next) => { try { const order = await db.get('SELECT * FROM orders WHERE order_reference = ? AND user_id = ?', [request.params.reference, request.user.id]); if (!order) return response.status(404).json({ error: 'Order not found.' }); if (order.payment_status === 'success') return response.json({ order }); const result = await paystackRequest(`/transaction/verify/${encodeURIComponent(request.params.reference)}`); return response.json({ order: await finalizePayment(result) }); } catch (error) { next(error); } });
app.post('/api/paystack/webhook', async (request, response, next) => { try { const signature = request.get('x-paystack-signature') || ''; const expected = crypto.createHmac('sha512', paystackSecretKey).update(request.body).digest('hex'); if (!paystackSecretKey || signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return response.sendStatus(401); const event = JSON.parse(request.body.toString()); if (event.event === 'charge.success') await finalizePayment(await paystackRequest(`/transaction/verify/${encodeURIComponent(event.data.reference)}`)); return response.sendStatus(200); } catch (error) { next(error); } });
app.post('/api/complaints', async (request, response, next) => { try { const { name, email, subject, message } = request.body || {}; if (!validText(name, 100) || !/^\S+@\S+\.\S+$/.test(email || '') || !validText(subject, 200) || !validText(message, 5000)) return response.status(400).json({ error: 'Name, valid email, subject, and complaint are required.' }); const user = await authUser(request); const result = await db.run('INSERT INTO complaints (user_id, name, email, subject, message) VALUES (?, ?, ?, ?, ?)', [user?.id || null, name.trim(), email.trim().toLowerCase(), subject.trim(), message.trim()]); response.status(201).json({ id: result.lastInsertRowid, status: 'open', message: 'Complaint received.' }); } catch (error) { next(error); } });
app.post('/api/assistant', (request, response) => { const message = String(request.body?.message || '').toLowerCase(); let reply = 'Thanks for reaching out. Call 09047315988 or send a complaint through the contact form.'; if (message.includes('complaint')) reply = 'You can send a complaint through the contact form. For urgent help, call 09047315988.'; else if (message.includes('size')) reply = 'Open a product page to see its available sizes before adding it to your cart.'; else if (message.includes('order')) reply = 'Call 09047315988 with your order details and the team can check its status.'; response.json({ reply }); });

app.use((error, request, response, next) => {
    console.error(error);
    if (response.headersSent) return next(error);
    return response.status(500).json({ error: 'Internal server error.' });
});

const seedProducts = async () => {
    const sql = db.client === 'mysql' ? 'INSERT INTO products (id, title, description, price, sizes_json, options_json) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE title=VALUES(title), description=VALUES(description), price=VALUES(price), sizes_json=VALUES(sizes_json), options_json=VALUES(options_json)' : 'INSERT OR REPLACE INTO products (id, title, description, price, sizes_json, options_json) VALUES (?, ?, ?, ?, ?, ?)';
    for (const [id, title, description, price, sizes, options] of productSeed) await db.run(sql, [id, title, description, price, JSON.stringify(sizes), JSON.stringify(options.map(([label, image]) => ({ label, image, price })))]);
};
const start = async () => {
    await db.init();
    await seedProducts();
    console.log(`[Paystack] secret configured: ${hasUsablePaystackSecret}; callback: ${paystackCallbackUrl}`);
    if (process.env.NODE_ENV === 'production' && paystackCallbackUrl.includes('localhost')) console.warn('[Paystack] Production callback URL points to localhost. Set PAYSTACK_CALLBACK_URL to the public confirmation URL.');
    app.listen(port, host, () => console.log(`arhyXL server running on http://localhost:${port}`));
};
start().catch((error) => { console.error(`Database startup failed. Check DB_CLIENT and database credentials: ${error.message}`); process.exit(1); });
module.exports = app;
