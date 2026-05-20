import express from 'express';
import pg from 'pg';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }
  next(err);
});

// PostgreSQL Connection Pool Setup
const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Ensure auth columns and tokens table exist
const ensureAuthSchema = async () => {
  try {
    await pool.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS password_hash text;`);
    await pool.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS username text;`);
    await pool.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS avatar_url text;`);
    await pool.query(`ALTER TABLE employees ALTER COLUMN role SET DEFAULT 'Staff';`);
    await pool.query(`CREATE TABLE IF NOT EXISTS password_reset_tokens (
      token text primary key,
      email text not null,
      expires_at timestamptz not null,
      created_at timestamptz default now()
    );`);
  } catch (err) {
    console.error('Failed to ensure auth schema:', err.message);
  }
};
ensureAuthSchema();

const getRequester = async (req) => {
  const userId = req.headers['x-user-id'];
  if (!userId) return null;
  const q = await pool.query('SELECT id, role FROM employees WHERE id = $1', [userId]);
  return q.rows[0] || null;
};

// 1. Connection Test Endpoint
app.get('/api/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW();');
    res.json({ success: true, message: "Connected to Docker Postgres!", time: result.rows[0].now });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. GET API: Fetch all active deliveries (Subsystem 3)
app.get('/api/deliveries', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM deliveries WHERE is_active = true ORDER BY created_at DESC;');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error fetching deliveries" });
  }
});

// 3. GET API: Fetch all active inventory items (Subsystem 1)
app.get('/api/inventory', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM inventory ORDER BY id ASC;');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error fetching inventory" });
  }
});

// 4. GET API: Fetch all active branches
app.get('/api/branches', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM branches WHERE is_active = true ORDER BY id ASC;');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error fetching branches" });
  }
});

/* ─── AUTH ENDPOINTS ───────────────────────────────────── */
app.post('/api/auth/signup', async (req, res) => {
  const { email, password, full_name, username, avatar_url } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  try {
    const existingAll = await pool.query('SELECT id FROM employees');
    const isFirstUser = existingAll.rows.length === 0;
    const existing = await pool.query('SELECT id FROM employees WHERE email = $1', [email]);
    if (existing.rows.length > 0) return res.status(409).json({ error: 'Account already exists' });
    const hash = await bcrypt.hash(password, 10);
    const id = `EMP-${Date.now()}`;
    const role = isFirstUser ? 'Admin' : 'Staff';
    await pool.query(
      'INSERT INTO employees (id, full_name, username, email, password_hash, avatar_url, role, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,now())',
      [id, full_name || email, username || (full_name || email), email, hash, avatar_url || null, role]
    );
    const user = { id, full_name: full_name || email, username: username || (full_name || email), email, role, avatar_url: avatar_url || null };
    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  try {
    const q = await pool.query('SELECT id, full_name, username, email, password_hash, role, avatar_url FROM employees WHERE email = $1', [email]);
    const user = q.rows[0];
    if (!user || !user.password_hash) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    res.json({ user: { id: user.id, full_name: user.full_name, username: user.username, email: user.email, role: user.role || 'Staff', avatar_url: user.avatar_url || null } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/employees', async (req, res) => {
  try {
    const requester = await getRequester(req);
    if (!requester) return res.status(401).json({ error: 'Unauthorized' });
    if (requester.role !== 'Admin') return res.status(403).json({ error: 'Forbidden' });
    const q = await pool.query(
      'SELECT id, full_name, username, email, role, department, branch_id, is_active, avatar_url FROM employees ORDER BY full_name ASC'
    );
    res.json(q.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

app.get('/api/employees/me', async (req, res) => {
  try {
    const requester = await getRequester(req);
    if (!requester) return res.status(401).json({ error: 'Unauthorized' });
    const q = await pool.query(
      'SELECT id, full_name, username, email, role, department, branch_id, is_active, avatar_url FROM employees WHERE id = $1',
      [requester.id]
    );
    res.json(q.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

app.patch('/api/employees/:id', async (req, res) => {
  const targetId = req.params.id;
  const { full_name, username, avatar_url, password, role } = req.body || {};
  try {
    const requester = await getRequester(req);
    if (!requester) return res.status(401).json({ error: 'Unauthorized' });
    if (targetId !== requester.id && requester.role !== 'Admin') return res.status(403).json({ error: 'Forbidden' });
    if (role && requester.role !== 'Admin') return res.status(403).json({ error: 'Only admins can change roles' });

    const updates = [];
    const values = [];
    let idx = 1;
    if (full_name) { updates.push(`full_name = $${idx++}`); values.push(full_name); }
    if (username) { updates.push(`username = $${idx++}`); values.push(username); }
    if (avatar_url !== undefined) { updates.push(`avatar_url = $${idx++}`); values.push(avatar_url); }
    if (role) { updates.push(`role = $${idx++}`); values.push(role); }
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      updates.push(`password_hash = $${idx++}`);
      values.push(hash);
    }
    if (updates.length === 0) return res.status(400).json({ error: 'No changes provided' });
    values.push(targetId);
    await pool.query(`UPDATE employees SET ${updates.join(', ')} WHERE id = $${idx}`, values);
    const q = await pool.query(
      'SELECT id, full_name, username, email, role, department, branch_id, is_active, avatar_url FROM employees WHERE id = $1',
      [targetId]
    );
    res.json(q.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update employee' });
  }
});


app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'email required' });
  try {
    const q = await pool.query('SELECT id FROM employees WHERE email = $1', [email]);
    if (q.rows.length === 0) return res.status(404).json({ error: 'No account with that email' });
    const token = crypto.randomBytes(24).toString('hex');
    const expires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour
    await pool.query('INSERT INTO password_reset_tokens(token, email, expires_at) VALUES($1,$2,$3)', [token, email, expires.toISOString()]);
    // For local testing return token in response (in production email it)
    res.json({ message: 'Password reset token created', token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create reset token' });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  const { token, password } = req.body || {};
  if (!token || !password) return res.status(400).json({ error: 'token and password required' });
  try {
    const q = await pool.query('SELECT email, expires_at FROM password_reset_tokens WHERE token = $1', [token]);
    const row = q.rows[0];
    if (!row) return res.status(400).json({ error: 'Invalid token' });
    if (new Date(row.expires_at) < new Date()) return res.status(400).json({ error: 'Token expired' });
    const hash = await bcrypt.hash(password, 10);
    await pool.query('UPDATE employees SET password_hash = $1 WHERE email = $2', [hash, row.email]);
    await pool.query('DELETE FROM password_reset_tokens WHERE token = $1', [token]);
    res.json({ message: 'Password updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

/* ─── SALES / DELIVERY ENDPOINTS NEEDED BY FRONTEND ───────── */
app.get('/api/sales/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const q = await pool.query('SELECT * FROM sales WHERE id = $1', [id]);
    if (q.rows.length === 0) return res.status(404).json(null);
    res.json(q.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch sale' });
  }
});

app.post('/api/deliveries', async (req, res) => {
  const d = req.body || {};
  if (!d.id || !d.sale_transaction_id) return res.status(400).json({ error: 'missing fields' });
  try {
    await pool.query(
      `INSERT INTO deliveries (id, sale_transaction_id, customer_name, item_description, quantity, delivery_address, assigned_courier, scheduled_date, delivery_type, remarks, current_status, created_by, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,now())`,
      [d.id, d.sale_transaction_id, d.customer_name, d.item_description, d.quantity, d.delivery_address, d.assigned_courier, d.scheduled_date || null, d.delivery_type || 'Outbound', d.remarks || null, d.current_status || 'Pending', d.created_by || 'system']
    );
    // insert initial history
    await pool.query('INSERT INTO delivery_status_history (delivery_id, old_status, new_status, changed_by) VALUES ($1,$2,$3,$4)', [d.id, null, d.current_status || 'Pending', d.created_by || 'system']);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create delivery' });
  }
});

app.patch('/api/deliveries/:id', async (req, res) => {
  const id = req.params.id;
  const { current_status, actual_delivery_date, changed_by, remark } = req.body || {};
  try {
    // fetch old status
    const q = await pool.query('SELECT current_status FROM deliveries WHERE id = $1', [id]);
    const old = q.rows[0]?.current_status || null;
    await pool.query('UPDATE deliveries SET current_status = $1, actual_delivery_date = $2, updated_at = now() WHERE id = $3', [current_status, actual_delivery_date || null, id]);
    await pool.query('INSERT INTO delivery_status_history (delivery_id, old_status, new_status, changed_by, remark) VALUES ($1,$2,$3,$4,$5)', [id, old, current_status, changed_by || 'system', remark || null]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update delivery' });
  }
});

app.get('/api/deliveries/:id/history', async (req, res) => {
  const id = req.params.id;
  try {
    const q = await pool.query('SELECT * FROM delivery_status_history WHERE delivery_id = $1 ORDER BY changed_at ASC', [id]);
    res.json(q.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});