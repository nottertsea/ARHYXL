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
const configuredOwnerEmail = (process.env.OWNER_EMAIL || '').trim().toLowerCase();
const ownerPassword = process.env.OWNER_PASSWORD || '';
const hasConfiguredOwner = /^\S+@\S+\.\S+$/.test(configuredOwnerEmail) && ownerPassword.length >= 6;

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
const productOptions = (row) => parseJsonColumn(row.options_json).map((option) => ({ ...option, stock: Number.isInteger(Number(option.stock)) ? Number(option.stock) : Number(row.stock || 0) }));
const publicProduct = (row) => {
    const price = Number(row.price);
    const discountPercent = Number(row.discount_percent || 0);
    const options = productOptions(row);
    const stock = options.reduce((total, option) => total + option.stock, 0);
    return { id: row.id, title: row.title, description: row.description, price: Math.round(price * (100 - discountPercent) / 100), originalPrice: price, discountPercent, available: stock > 0, lowStock: stock > 0 && stock <= 10, sizes: parseJsonColumn(row.sizes_json), options: options.map(({ stock: variantStock, ...option }) => ({ ...option, available: variantStock > 0, lowStock: variantStock > 0 && variantStock <= 10 })) };
};
const adminProduct = (row) => ({ ...publicProduct(row), stock: productOptions(row).reduce((total, option) => total + option.stock, 0), options: productOptions(row) });
const activePrice = (product) => Math.round(Number(product.price) * (100 - Number(product.discount_percent || 0)) / 100);
const validText = (value, max) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
const authUser = async (request) => {
    const token = request.get('authorization')?.replace(/^Bearer\s+/i, '');
    return token ? db.get('SELECT users.id, users.name, users.email, users.role FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.token = ?', [token]) : null;
};
const requireUser = async (request, response, next) => {
    request.user = await authUser(request);
    if (!request.user) return response.status(401).json({ error: 'Authentication required.' });
    return next();
};
const requireOwner = async (request, response, next) => {
    request.user = await authUser(request);
    if (!request.user) return response.status(401).json({ error: 'Authentication required.' });
    if (request.user.role !== 'owner' || !configuredOwnerEmail || request.user.email.toLowerCase() !== configuredOwnerEmail) return response.status(403).json({ error: 'Owner access required.' });
    return next();
};
const ensureAccountSettings = async (userId) => {
    const sql = db.client === 'mysql' ? 'INSERT IGNORE INTO account_settings (user_id) VALUES (?)' : 'INSERT INTO account_settings (user_id) VALUES (?) ON CONFLICT(user_id) DO NOTHING';
    await db.run(sql, [userId]);
};
const paystackRequest = async (endpoint, options = {}) => {
    if (!hasUsablePaystackSecret) throw new Error('Payments are temporarily unavailable. Add a real Paystack secret key (sk_test_ or sk_live_) to the backend .env and restart the server.');
    console.log(`[Paystack] ${options.method || 'GET'} ${endpoint} (secret loaded: ${paystackSecretKey.length} chars)`);
    const result = await fetch(`https://api.paystack.co${endpoint}`, { ...options, headers: { Authorization: `Bearer ${paystackSecretKey}`, 'Content-Type': 'application/json' } });
    const data = await result.json();
    console.log(`[Paystack] ${endpoint} responded ${result.status}; status=${Boolean(data.status)}; message=${data.message || 'none'}; authorization_url=${Boolean(data.data?.authorization_url)}`);
    if (!result.ok || !data.status) throw new Error(data.message || 'Paystack request failed.');
    return data;
};
const refundPayment = async (order) => {
    if (!order.paystack_transaction_id) throw new Error('This order has no refundable Paystack transaction.');
    return paystackRequest('/refund', { method: 'POST', body: JSON.stringify({ transaction: order.paystack_transaction_id, amount: Number(order.amount_paid_kobo || order.amount_kobo) }) });
};

app.use('/api/paystack/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '1mb' }));
app.use((request, response, next) => {
    if (request.path.startsWith('/api/')) response.setHeader('Cache-Control', 'no-store');
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

app.get('/api/health', (request, response) => response.json({ ok: true, database: db.client, paystackConfigured: hasUsablePaystackSecret, ownerConfigured: hasConfiguredOwner }));
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
        if (user.role === 'owner') return response.status(403).json({ error: 'Use the store owner sign-in.' });
        const token = crypto.randomBytes(32).toString('hex');
        await db.run('INSERT INTO sessions (token, user_id) VALUES (?, ?)', [token, user.id]);
        return response.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    } catch (error) { return next(error); }
});
app.post('/api/auth/owner-login', async (request, response, next) => {
    try {
        const { email, password } = request.body || {};
        if (!hasConfiguredOwner) return response.status(503).json({ error: 'Store owner profile is not configured on the backend. Add OWNER_EMAIL and OWNER_PASSWORD in Railway Variables, then redeploy.' });
        if (!configuredOwnerEmail || String(email || '').trim().toLowerCase() !== configuredOwnerEmail) return response.status(401).json({ error: 'Use the configured store owner email.' });
        const emailQuery = db.client === 'mysql' ? 'SELECT * FROM users WHERE email = ?' : 'SELECT * FROM users WHERE email = ? COLLATE NOCASE';
        const user = await db.get(emailQuery, [configuredOwnerEmail]);
        if (!user || user.role !== 'owner' || !(await bcrypt.compare(password || '', user.password_hash))) return response.status(401).json({ error: 'Invalid owner email or password.' });
        const token = crypto.randomBytes(32).toString('hex');
        await db.run('INSERT INTO sessions (token, user_id) VALUES (?, ?)', [token, user.id]);
        return response.json({ token, user: { id: user.id, name: user.name, email: user.email, role: 'owner' } });
    } catch (error) { return next(error); }
});
app.post('/api/auth/logout', requireUser, async (request, response, next) => { try { await db.run('DELETE FROM sessions WHERE token = ?', [request.get('authorization').replace(/^Bearer\s+/i, '')]); response.status(204).end(); } catch (error) { next(error); } });
app.get('/api/me', requireUser, (request, response) => response.json({ user: request.user }));
app.get('/api/account/orders', requireUser, async (request, response, next) => {
    try {
        const orders = await db.all('SELECT orders.order_reference, orders.status, orders.payment_status, orders.amount_kobo, orders.amount_paid_kobo, orders.customer_name, orders.delivery_address, orders.created_at, orders.paid_at, EXISTS (SELECT 1 FROM returns WHERE returns.order_id = orders.id) AS has_return FROM orders WHERE orders.user_id = ? ORDER BY orders.created_at DESC', [request.user.id]);
        const items = await db.all('SELECT order_items.order_id, order_items.title, order_items.variant, order_items.size, order_items.unit_price_kobo, order_items.quantity, order_items.line_total_kobo, orders.order_reference FROM order_items JOIN orders ON orders.id = order_items.order_id WHERE orders.user_id = ? ORDER BY order_items.id', [request.user.id]);
        response.json(orders.map((order) => ({ ...order, status: order.status === 'paid' ? 'processing' : order.status, has_return: Boolean(order.has_return), items: items.filter((item) => item.order_reference === order.order_reference).map((item) => ({ ...item, image: item.variant })) })));
    } catch (error) { next(error); }
});
app.get('/api/admin/orders', requireOwner, async (request, response, next) => {
    try {
        const orders = await db.all("SELECT orders.id, orders.order_reference, orders.status, orders.payment_status, orders.amount_kobo, orders.customer_name, orders.customer_email, orders.customer_phone, orders.delivery_address, orders.created_at, orders.paid_at FROM orders WHERE orders.payment_status = 'success' ORDER BY orders.created_at DESC");
        const items = await db.all('SELECT order_items.order_id, order_items.title, order_items.variant, order_items.size, order_items.unit_price_kobo, order_items.quantity, order_items.line_total_kobo FROM order_items ORDER BY order_items.id');
        response.json(orders.map((order) => ({ ...order, status: order.status === 'paid' ? 'processing' : order.status, items: items.filter((item) => item.order_id === order.id).map((item) => ({ ...item, image: item.variant })) })));
    } catch (error) { next(error); }
});
app.patch('/api/admin/orders/:reference/status', requireOwner, async (request, response, next) => {
    try {
        const allowedStatuses = ['processing', 'shipped', 'delivered', 'returned'];
        const status = String(request.body?.status || '').toLowerCase();
        if (!allowedStatuses.includes(status)) return response.status(400).json({ error: 'Status must be processing, shipped, delivered, or returned.' });
        const result = await db.run('UPDATE orders SET status = ? WHERE order_reference = ? AND payment_status = ?', [status, request.params.reference, 'success']);
        if (!result.changes) return response.status(404).json({ error: 'Paid order not found.' });
        return response.json({ orderReference: request.params.reference, status });
    } catch (error) { next(error); }
});
app.get('/api/account', requireUser, async (request, response, next) => { try { await ensureAccountSettings(request.user.id); const [addresses, paymentMethods, settings] = await Promise.all([db.all('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC', [request.user.id]), db.all('SELECT id, provider, label, brand, last4, expiry_month, expiry_year FROM payment_methods WHERE user_id = ? ORDER BY id DESC', [request.user.id]), db.get('SELECT * FROM account_settings WHERE user_id = ?', [request.user.id])]); response.json({ addresses, paymentMethods, settings }); } catch (error) { next(error); } });
app.post('/api/account/addresses', requireUser, async (request, response, next) => { try { const { label, recipientName, phone, addressLine, city, state, isDefault = false } = request.body || {}; if (![label, recipientName, phone, addressLine, city, state].every((value) => validText(value, 255))) return response.status(400).json({ error: 'Complete address details are required.' }); if (isDefault) await db.run('UPDATE addresses SET is_default = 0 WHERE user_id = ?', [request.user.id]); const result = await db.run('INSERT INTO addresses (user_id, label, recipient_name, phone, address_line, city, state, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [request.user.id, label.trim(), recipientName.trim(), phone.trim(), addressLine.trim(), city.trim(), state.trim(), isDefault ? 1 : 0]); response.status(201).json(await db.get('SELECT * FROM addresses WHERE id = ?', [result.lastInsertRowid])); } catch (error) { next(error); } });
app.delete('/api/account/addresses/:id', requireUser, async (request, response, next) => { try { await db.run('DELETE FROM addresses WHERE id = ? AND user_id = ?', [request.params.id, request.user.id]); response.status(204).end(); } catch (error) { next(error); } });
app.post('/api/account/payment-methods', requireUser, async (request, response, next) => { try { const { label, brand, last4, expiryMonth, expiryYear } = request.body || {}; if (!validText(label, 80) || !validText(brand, 30) || !/^\d{4}$/.test(last4 || '') || !/^\d{2}$/.test(expiryMonth || '') || !/^\d{4}$/.test(expiryYear || '')) return response.status(400).json({ error: 'Use card label, brand, last four digits, and expiry details.' }); const result = await db.run('INSERT INTO payment_methods (user_id, label, brand, last4, expiry_month, expiry_year) VALUES (?, ?, ?, ?, ?, ?)', [request.user.id, label.trim(), brand.trim(), last4, expiryMonth, expiryYear]); response.status(201).json(await db.get('SELECT id, provider, label, brand, last4, expiry_month, expiry_year FROM payment_methods WHERE id = ?', [result.lastInsertRowid])); } catch (error) { next(error); } });
app.delete('/api/account/payment-methods/:id', requireUser, async (request, response, next) => { try { await db.run('DELETE FROM payment_methods WHERE id = ? AND user_id = ?', [request.params.id, request.user.id]); response.status(204).end(); } catch (error) { next(error); } });
app.patch('/api/account/settings', requireUser, async (request, response, next) => { try { const values = ['order_notifications', 'promotion_notifications', 'security_notifications', 'profile_visible']; await ensureAccountSettings(request.user.id); for (const field of values) if (typeof request.body?.[field] === 'boolean') await db.run(`UPDATE account_settings SET ${field} = ? WHERE user_id = ?`, [request.body[field] ? 1 : 0, request.user.id]); response.json(await db.get('SELECT * FROM account_settings WHERE user_id = ?', [request.user.id])); } catch (error) { next(error); } });
app.patch('/api/account/security', requireUser, async (request, response, next) => { try { const { currentPassword, newPassword } = request.body || {}; const user = await db.get('SELECT password_hash FROM users WHERE id = ?', [request.user.id]); if (!user || !(await bcrypt.compare(currentPassword || '', user.password_hash)) || typeof newPassword !== 'string' || newPassword.length < 6) return response.status(400).json({ error: 'Current password is incorrect or the new password is too short.' }); await db.run('UPDATE users SET password_hash = ? WHERE id = ?', [await bcrypt.hash(newPassword, 12), request.user.id]); response.json({ message: 'Password updated.' }); } catch (error) { next(error); } });
app.post('/api/account/returns', requireUser, async (request, response, next) => { try { const { orderReference, reason } = request.body || {}; const order = await db.get('SELECT * FROM orders WHERE order_reference = ? AND user_id = ? AND payment_status = ?', [orderReference, request.user.id, 'success']); if (!order || !validText(reason, 1000)) return response.status(400).json({ error: 'A paid order and return reason are required.' }); if (await db.get('SELECT id FROM returns WHERE order_id = ? LIMIT 1', [order.id])) return response.status(409).json({ error: 'A return has already been requested for this order.' }); await refundPayment(order); const items = await db.all('SELECT product_id, variant, quantity FROM order_items WHERE order_id = ?', [order.id]); const result = await db.transaction(async (tx) => { for (const item of items) { const product = await tx.get('SELECT * FROM products WHERE id = ?', [item.product_id]); const options = productOptions(product); const variant = options.find((option) => option.image === item.variant); if (!variant) throw new Error('The returned product variant no longer exists.'); variant.stock += item.quantity; await tx.run('UPDATE products SET options_json = ?, stock = ? WHERE id = ?', [JSON.stringify(options), options.reduce((total, option) => total + option.stock, 0), item.product_id]); } const inserted = await tx.run('INSERT INTO returns (order_id, user_id, reason, status) VALUES (?, ?, ?, ?)', [order.id, request.user.id, reason.trim(), 'refunded']); await tx.run('UPDATE orders SET status = ? WHERE id = ?', ['returned', order.id]); return inserted; }); response.status(201).json({ id: result.lastInsertRowid, status: 'refunded' }); } catch (error) { next(error); } });
app.delete('/api/account', requireUser, async (request, response, next) => { try { const user = await db.get('SELECT password_hash FROM users WHERE id = ?', [request.user.id]); if (!(await bcrypt.compare(request.body?.password || '', user.password_hash))) return response.status(400).json({ error: 'Password confirmation failed.' }); await db.run('DELETE FROM users WHERE id = ?', [request.user.id]); response.status(204).end(); } catch (error) { next(error); } });

app.get('/api/admin/products', requireOwner, async (request, response, next) => { try { response.json((await db.all('SELECT * FROM products ORDER BY title')).map(adminProduct)); } catch (error) { next(error); } });
app.post('/api/admin/products', requireOwner, async (request, response, next) => {
    try {
        const { id, title, description = '', price, stock, discountPercent = 0, sizes = '', variantLabel, image } = request.body || {};
        const sizesList = Array.isArray(sizes) ? sizes : String(sizes).split(',').map((size) => size.trim()).filter(Boolean);
        const numericPrice = Number(price);
        const numericStock = Number(stock);
        const numericDiscount = Number(discountPercent);
        if (!/^[a-z0-9-]{2,100}$/.test(id || '') || !validText(title, 255) || !validText(description, 2000) || !Number.isInteger(numericPrice) || numericPrice < 0 || !Number.isInteger(numericStock) || numericStock < 0 || !Number.isInteger(numericDiscount) || numericDiscount < 0 || numericDiscount > 100 || !sizesList.length || !validText(variantLabel, 100) || !validText(image, 1000)) return response.status(400).json({ error: 'Provide a valid id, title, description, price, stock, discount, sizes, variant label, and image URL/path.' });
        const options = [{ label: variantLabel.trim(), image: image.trim(), price: numericPrice, stock: numericStock }];
        await db.run('INSERT INTO products (id, title, description, price, stock, discount_percent, sizes_json, options_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [id, title.trim(), description.trim(), numericPrice, numericStock, numericDiscount, JSON.stringify(sizesList), JSON.stringify(options)]);
        return response.status(201).json(adminProduct(await db.get('SELECT * FROM products WHERE id = ?', [id])));
    } catch (error) { if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || error.code === 'ER_DUP_ENTRY') return response.status(409).json({ error: 'A product with that id already exists.' }); return next(error); }
});
app.patch('/api/admin/products/:id', requireOwner, async (request, response, next) => {
    try {
        const price = Number(request.body?.price);
        const stock = request.body?.stock === undefined ? null : Number(request.body.stock);
        const discountPercent = Number(request.body?.discountPercent);
        if (!Number.isInteger(price) || price < 0 || (stock !== null && (!Number.isInteger(stock) || stock < 0)) || !Number.isInteger(discountPercent) || discountPercent < 0 || discountPercent > 100) return response.status(400).json({ error: 'Price must be a whole number and discount must be between 0 and 100.' });
        const result = stock === null ? await db.run('UPDATE products SET price = ?, discount_percent = ? WHERE id = ?', [price, discountPercent, request.params.id]) : await db.run('UPDATE products SET price = ?, stock = ?, discount_percent = ? WHERE id = ?', [price, stock, discountPercent, request.params.id]);
        if (!result.changes) return response.status(404).json({ error: 'Product not found.' });
        return response.json(adminProduct(await db.get('SELECT * FROM products WHERE id = ?', [request.params.id])));
    } catch (error) { next(error); }
});
app.post('/api/admin/products/:id/variants', requireOwner, async (request, response, next) => {
    try {
        const { label, image } = request.body || {};
        const stock = Number(request.body?.stock);
        if (!validText(label, 100) || !validText(image, 1000) || !Number.isInteger(stock) || stock < 0) return response.status(400).json({ error: 'Variant label, image URL/path, and a non-negative stock value are required.' });
        const product = await db.get('SELECT * FROM products WHERE id = ?', [request.params.id]);
        if (!product) return response.status(404).json({ error: 'Product not found.' });
        const options = productOptions(product);
        if (options.some((option) => option.image === image.trim())) return response.status(409).json({ error: 'That variant image already exists.' });
        options.push({ label: label.trim(), image: image.trim(), price: Number(product.price), stock });
        await db.run('UPDATE products SET options_json = ? WHERE id = ?', [JSON.stringify(options), request.params.id]);
        return response.json(adminProduct(await db.get('SELECT * FROM products WHERE id = ?', [request.params.id])));
    } catch (error) { next(error); }
});
app.patch('/api/admin/products/:id/variants', requireOwner, async (request, response, next) => {
    try {
        const stock = Number(request.body?.stock);
        const product = await db.get('SELECT * FROM products WHERE id = ?', [request.params.id]);
        if (!product || !validText(request.body?.image, 1000) || !Number.isInteger(stock) || stock < 0) return response.status(400).json({ error: 'Product, variant image, and non-negative stock are required.' });
        const options = productOptions(product);
        const variant = options.find((option) => option.image === request.body.image);
        if (!variant) return response.status(404).json({ error: 'Variant not found.' });
        variant.stock = stock;
        await db.run('UPDATE products SET options_json = ?, stock = ? WHERE id = ?', [JSON.stringify(options), options.reduce((total, option) => total + option.stock, 0), request.params.id]);
        return response.json(adminProduct(await db.get('SELECT * FROM products WHERE id = ?', [request.params.id])));
    } catch (error) { next(error); }
});
app.delete('/api/admin/products/:id/variants', requireOwner, async (request, response, next) => {
    try {
        const product = await db.get('SELECT * FROM products WHERE id = ?', [request.params.id]);
        if (!product) return response.status(404).json({ error: 'Product not found.' });
        const currentOptions = productOptions(product);
        const options = currentOptions.filter((option) => option.image !== request.body?.image);
        if (options.length === currentOptions.length) return response.status(404).json({ error: 'Variant not found.' });
        if (!options.length) return response.status(400).json({ error: 'A product must keep at least one variant.' });
        await db.run('UPDATE products SET options_json = ?, stock = ? WHERE id = ?', [JSON.stringify(options), options.reduce((total, option) => total + option.stock, 0), request.params.id]);
        await db.run('DELETE FROM cart_items WHERE product_id = ? AND variant = ?', [request.params.id, request.body.image]);
        return response.json(adminProduct(await db.get('SELECT * FROM products WHERE id = ?', [request.params.id])));
    } catch (error) { next(error); }
});
app.delete('/api/admin/products/:id', requireOwner, async (request, response, next) => {
    try {
        const product = await db.get('SELECT id FROM products WHERE id = ?', [request.params.id]);
        if (!product) return response.status(404).json({ error: 'Product not found.' });
        await db.run('DELETE FROM cart_items WHERE product_id = ?', [request.params.id]);
        const result = await db.run('DELETE FROM products WHERE id = ?', [request.params.id]);
        if (!result.changes) return response.status(404).json({ error: 'Product not found.' });
        return response.status(204).end();
    } catch (error) { next(error); }
});

app.get('/api/cart', requireUser, async (request, response, next) => { try { const rows = await db.all('SELECT cart_items.*, products.title, products.price, products.discount_percent, products.stock FROM cart_items JOIN products ON products.id = cart_items.product_id WHERE user_id = ? ORDER BY cart_items.id DESC', [request.user.id]); response.json(rows.map((item) => ({ ...item, price: activePrice(item), originalPrice: Number(item.price), discountPercent: Number(item.discount_percent || 0), image: item.variant, lineTotal: activePrice(item) * item.quantity, selected: true }))); } catch (error) { next(error); } });
app.post('/api/cart', requireUser, async (request, response, next) => {
    try {
        const { productId, variant, size, note = '', rating = 0, quantity = 1 } = request.body || {};
        const product = await db.get('SELECT * FROM products WHERE id = ?', [productId]);
        const options = product ? parseJsonColumn(product.options_json) : [];
        const sizes = product ? parseJsonColumn(product.sizes_json) : [];
        if (!product || !options.some((option) => option.image === variant) || !sizes.includes(size) || (note !== '' && !validText(note, 1000)) || !Number.isInteger(quantity) || quantity < 1 || quantity > 99 || !Number.isInteger(Number(rating)) || rating < 0 || rating > 5) return response.status(400).json({ error: 'Invalid cart item.' });
        const existing = await db.get('SELECT id, quantity FROM cart_items WHERE user_id = ? AND product_id = ? AND variant = ? AND size = ? AND note = ? AND rating = ?', [request.user.id, productId, variant, size, note, rating]);
        const selectedVariant = productOptions(product).find((option) => option.image === variant);
        const availableStock = selectedVariant?.stock || 0;
        if (existing && existing.quantity + quantity > availableStock) return response.status(409).json({ error: 'There is not enough stock for that color variant.' });
        if (!existing && quantity > availableStock) return response.status(409).json({ error: 'There is not enough stock for that color variant.' });
        if (existing) await db.run('UPDATE cart_items SET quantity = quantity + ? WHERE id = ? AND user_id = ?', [quantity, existing.id, request.user.id]);
        else await db.run('INSERT INTO cart_items (user_id, product_id, variant, size, note, rating, quantity) VALUES (?, ?, ?, ?, ?, ?, ?)', [request.user.id, productId, variant, size, note, rating, quantity]);
        return response.status(201).json({ message: 'Item added to cart.' });
    } catch (error) { next(error); }
});
app.patch('/api/cart/:id', requireUser, async (request, response, next) => { try { const quantity = Number(request.body?.quantity); const item = await db.get('SELECT cart_items.id, cart_items.variant, products.options_json FROM cart_items JOIN products ON products.id = cart_items.product_id WHERE cart_items.id = ? AND cart_items.user_id = ?', [request.params.id, request.user.id]); if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) return response.status(400).json({ error: 'Quantity must be between 1 and 99.' }); if (!item) return response.status(404).json({ error: 'Cart item not found.' }); const selectedVariant = productOptions({ options_json: item.options_json, stock: 0 }).find((option) => option.image === item.variant); if (!selectedVariant || quantity > selectedVariant.stock) return response.status(409).json({ error: 'There is not enough stock for that color variant.' }); const result = await db.run('UPDATE cart_items SET quantity = ? WHERE id = ? AND user_id = ?', [quantity, request.params.id, request.user.id]); if (!result.changes) return response.status(404).json({ error: 'Cart item not found.' }); response.json({ message: 'Cart updated.' }); } catch (error) { next(error); } });
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
        const items = await db.all(`SELECT cart_items.id AS cart_item_id, cart_items.*, products.title, products.price, products.discount_percent, products.stock, products.options_json FROM cart_items JOIN products ON products.id = cart_items.product_id WHERE cart_items.user_id = ? AND cart_items.id IN (${placeholders})`, [request.user.id, ...ids]);
        if (items.length !== ids.length) return response.status(400).json({ error: 'One or more cart items are no longer available.' });
        if (items.some((item) => item.quantity > (productOptions(item).find((option) => option.image === item.variant)?.stock || 0))) return response.status(409).json({ error: 'One or more items exceed the available stock. Update your cart and try again.' });
        const amountKobo = items.reduce((total, item) => total + activePrice(item) * item.quantity * 100, 0);
        if (prior) {
            if (Number(prior.amount_kobo) !== amountKobo) return response.status(409).json({ error: 'This checkout attempt does not match the current cart.' });
            orderReference = prior.order_reference;
        } else {
            orderReference = `ARHYXL-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
            try {
                await db.transaction(async (tx) => {
                    const order = await tx.run('INSERT INTO orders (order_reference, idempotency_key, user_id, amount_kobo, customer_name, customer_email, customer_phone, delivery_address) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [orderReference, idempotencyKey, request.user.id, amountKobo, name.trim(), email.trim().toLowerCase(), phone.trim(), address.trim()]);
                    for (const item of items) { const price = activePrice(item); await tx.run('INSERT INTO order_items (order_id, cart_item_id, product_id, title, variant, size, unit_price_kobo, quantity, line_total_kobo, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [order.lastInsertRowid, item.cart_item_id, item.product_id, item.title, item.variant, item.size, price * 100, item.quantity, price * item.quantity * 100, item.note]); }
                });
            } catch (error) {
                const duplicate = error.code === 'ER_DUP_ENTRY' || error.code === 'SQLITE_CONSTRAINT_UNIQUE' || error.code === 'SQLITE_CONSTRAINT_PRIMARYKEY';
                if (!duplicate) throw error;
                const existingOrder = await db.get('SELECT * FROM orders WHERE user_id = ? AND idempotency_key = ?', [request.user.id, idempotencyKey]);
                if (!existingOrder || Number(existingOrder.amount_kobo) !== amountKobo) return response.status(409).json({ error: 'This checkout attempt already exists with different cart details. Start checkout again.' });
                orderReference = existingOrder.order_reference;
                if (existingOrder.paystack_reference && existingOrder.authorization_url) return response.json({ orderReference, amountKobo, authorizationUrl: existingOrder.authorization_url, message: 'This checkout attempt already exists.' });
            }
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
        if (paid) {
            const items = await tx.all('SELECT product_id, variant, quantity FROM order_items WHERE order_id = ?', [order.id]);
            for (const item of items) {
                const product = await tx.get('SELECT * FROM products WHERE id = ?', [item.product_id]);
                const options = productOptions(product);
                const variant = options.find((option) => option.image === item.variant);
                if (!variant || variant.stock < item.quantity) throw new Error('Payment succeeded but stock is no longer available.');
                variant.stock -= item.quantity;
                await tx.run('UPDATE products SET options_json = ?, stock = ? WHERE id = ?', [JSON.stringify(options), options.reduce((total, option) => total + option.stock, 0), item.product_id]);
            }
            await tx.run('DELETE FROM cart_items WHERE user_id = ? AND id IN (SELECT cart_item_id FROM order_items WHERE order_id = ?)', [order.user_id, order.id]);
        }
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
    const sql = db.client === 'mysql' ? 'INSERT INTO products (id, title, description, price, sizes_json, options_json) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE title=VALUES(title), description=VALUES(description), sizes_json=VALUES(sizes_json)' : 'INSERT OR IGNORE INTO products (id, title, description, price, sizes_json, options_json) VALUES (?, ?, ?, ?, ?, ?)';
    for (const [id, title, description, price, sizes, options] of productSeed) await db.run(sql, [id, title, description, price, JSON.stringify(sizes), JSON.stringify(options.map(([label, image]) => ({ label, image, price })))]);
};
const provisionOwner = async () => {
    const email = configuredOwnerEmail;
    if (!hasConfiguredOwner) return;
    const hash = await bcrypt.hash(ownerPassword, 12);
    await db.run('UPDATE users SET role = ? WHERE role = ?', ['customer', 'owner']);
    const existing = await db.get('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) await db.run('UPDATE users SET password_hash = ?, role = ? WHERE id = ?', [hash, 'owner', existing.id]);
    else await db.run('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)', ['Store Owner', email, hash, 'owner']);
};
const start = async () => {
    await db.init();
    await seedProducts();
    await provisionOwner();
    if (!hasConfiguredOwner) console.warn('[Owner] profile not provisioned: set OWNER_EMAIL and OWNER_PASSWORD in the backend environment.');
    console.log(`[Paystack] secret configured: ${hasUsablePaystackSecret}; callback: ${paystackCallbackUrl}`);
    if (process.env.NODE_ENV === 'production' && paystackCallbackUrl.includes('localhost')) console.warn('[Paystack] Production callback URL points to localhost. Set PAYSTACK_CALLBACK_URL to the public confirmation URL.');
    app.listen(port, host, () => console.log(`arhyXL server running on http://localhost:${port}`));
};
start().catch((error) => { console.error(`Database startup failed. Check DB_CLIENT and database credentials: ${error.message}`); process.exit(1); });
module.exports = app;
