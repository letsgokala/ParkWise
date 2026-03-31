import 'dotenv/config';
import bcrypt from 'bcryptjs';
import cors from 'cors';
import express from 'express';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { Pool } from 'pg';
import { seedFacilities } from './seedFacilities';

const app = express();
const port = Number(process.env.PORT || 4000);
const jwtSecret = process.env.JWT_SECRET || 'parkwise-local-secret';
const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';

const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || '',
  database: process.env.PGDATABASE || 'parkwise',
});

app.use(cors({ origin: clientUrl, credentials: true }));
app.use(express.json());

type Role = 'driver' | 'parking_admin' | 'sys_admin';

interface JwtPayload {
  uid: string;
  role: Role;
}

interface AuthenticatedRequest extends express.Request {
  user?: JwtPayload;
}

const signToken = (payload: JwtPayload) =>
  jwt.sign(payload, jwtSecret, { expiresIn: '7d' });

const requireAuth = (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  try {
    req.user = jwt.verify(token, jwtSecret) as JwtPayload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired session.' });
  }
};

const requireRole = (roles: Role[]) => (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
  if (!req.user || !roles.includes(req.user.role)) {
    res.status(403).json({ error: 'You do not have access to this resource.' });
    return;
  }
  next();
};

const mapUser = (row: any) => ({
  uid: row.id,
  email: row.email,
  role: row.role,
  displayName: row.display_name,
});

const mapFacility = (row: any) => ({
  facilityId: row.id,
  facilityName: row.facility_name,
  address: row.address,
  latitude: Number(row.latitude),
  longitude: Number(row.longitude),
  totalSpaces: Number(row.total_spaces),
  availableSpaces: Number(row.available_spaces),
  pricePerHour: Number(row.price_per_hour),
  status: row.status,
  createdAt: row.created_at,
});

async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('driver', 'parking_admin', 'sys_admin')),
      display_name TEXT NOT NULL,
      phone_number TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS parking_locations (
      id TEXT PRIMARY KEY,
      facility_name TEXT NOT NULL,
      address TEXT NOT NULL,
      latitude DOUBLE PRECISION NOT NULL,
      longitude DOUBLE PRECISION NOT NULL,
      total_spaces INTEGER NOT NULL CHECK (total_spaces >= 0),
      available_spaces INTEGER NOT NULL CHECK (available_spaces >= 0),
      price_per_hour DOUBLE PRECISION NOT NULL CHECK (price_per_hour >= 0),
      status TEXT NOT NULL CHECK (status IN ('Pending', 'Verified', 'Full', 'Suspended')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS drivers (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      phone_number TEXT NOT NULL,
      account_status TEXT NOT NULL DEFAULT 'Active' CHECK (account_status IN ('Active', 'Suspended', 'Banned')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS parking_admins (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      facility_id TEXT UNIQUE REFERENCES parking_locations(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  for (const facility of seedFacilities) {
    await pool.query(
      `
        INSERT INTO parking_locations (
          id, facility_name, address, latitude, longitude,
          total_spaces, available_spaces, price_per_hour, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO NOTHING
      `,
      [
        facility.id,
        facility.facilityName,
        facility.address,
        facility.latitude,
        facility.longitude,
        facility.totalSpaces,
        facility.availableSpaces,
        facility.pricePerHour,
        facility.status,
      ]
    );
  }

  const sysAdminEmail = process.env.SYS_ADMIN_EMAIL || 'sysadmin@parkwise.local';
  const sysAdminPassword = process.env.SYS_ADMIN_PASSWORD || 'ParkWiseAdmin123!';
  const sysAdminName = process.env.SYS_ADMIN_NAME || 'System Admin';

  const existingSysAdmin = await pool.query('SELECT id FROM users WHERE email = $1', [sysAdminEmail]);
  if (existingSysAdmin.rowCount === 0) {
    const passwordHash = await bcrypt.hash(sysAdminPassword, 10);
    await pool.query(
      `
        INSERT INTO users (id, email, password_hash, role, display_name)
        VALUES ($1, $2, $3, 'sys_admin', $4)
      `,
      [randomUUID(), sysAdminEmail, passwordHash, sysAdminName]
    );
  }
}

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: 'Database connection failed.' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, phone, role } = req.body as {
    name?: string;
    email?: string;
    password?: string;
    phone?: string;
    role?: Role;
  };

  if (!name || !email || !password || !role || !['driver', 'parking_admin'].includes(role)) {
    res.status(400).json({ error: 'Missing required registration fields.' });
    return;
  }

  if (role === 'driver' && !phone) {
    res.status(400).json({ error: 'Phone number is required for drivers.' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rowCount) {
      await client.query('ROLLBACK');
      res.status(409).json({ error: 'That email is already in use.' });
      return;
    }

    const userId = randomUUID();
    const passwordHash = await bcrypt.hash(password, 10);

    await client.query(
      `
        INSERT INTO users (id, email, password_hash, role, display_name, phone_number)
        VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [userId, email.toLowerCase(), passwordHash, role, name, phone || null]
    );

    if (role === 'driver') {
      await client.query(
        `
          INSERT INTO drivers (user_id, phone_number)
          VALUES ($1, $2)
        `,
        [userId, phone]
      );
    } else {
      await client.query(
        `
          INSERT INTO parking_admins (user_id, facility_id)
          VALUES ($1, NULL)
        `,
        [userId]
      );
    }

    await client.query('COMMIT');

    const user = { uid: userId, email: email.toLowerCase(), role, displayName: name };
    res.status(201).json({ token: signToken({ uid: userId, role }), user });
  } catch (error: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message || 'Failed to register user.' });
  } finally {
    client.release();
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }

  try {
    const result = await pool.query(
      `
        SELECT id, email, password_hash, role, display_name
        FROM users
        WHERE email = $1
      `,
      [email.toLowerCase()]
    );

    const row = result.rows[0];
    if (!row) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const isValid = await bcrypt.compare(password, row.password_hash);
    if (!isValid) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const user = mapUser(row);
    res.json({ token: signToken({ uid: user.uid, role: user.role }), user });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to sign in.' });
  }
});

app.get('/api/auth/me', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, role, display_name FROM users WHERE id = $1',
      [req.user!.uid]
    );

    const row = result.rows[0];
    if (!row) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    res.json({ user: mapUser(row) });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load current user.' });
  }
});

app.get('/api/parking-locations', async (req, res) => {
  const statuses = typeof req.query.statuses === 'string' ? req.query.statuses.split(',') : [];

  try {
    const values: any[] = [];
    let whereClause = '';

    if (statuses.length > 0) {
      whereClause = `WHERE status = ANY($1)`;
      values.push(statuses);
    }

    const result = await pool.query(
      `
        SELECT id, facility_name, address, latitude, longitude, total_spaces, available_spaces, price_per_hour, status, created_at
        FROM parking_locations
        ${whereClause}
        ORDER BY facility_name ASC
      `,
      values
    );

    res.json({ facilities: result.rows.map(mapFacility) });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load parking locations.' });
  }
});

app.get('/api/admin/facility', requireAuth, requireRole(['parking_admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const result = await pool.query(
      `
        SELECT p.id, p.facility_name, p.address, p.latitude, p.longitude, p.total_spaces, p.available_spaces, p.price_per_hour, p.status, p.created_at
        FROM parking_admins pa
        LEFT JOIN parking_locations p ON p.id = pa.facility_id
        WHERE pa.user_id = $1
      `,
      [req.user!.uid]
    );

    const row = result.rows[0];
    if (!row || !row.id) {
      res.json({ facility: null });
      return;
    }

    res.json({ facility: mapFacility(row) });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load assigned facility.' });
  }
});

app.patch('/api/admin/facility', requireAuth, requireRole(['parking_admin']), async (req: AuthenticatedRequest, res) => {
  const { availableSpaces, pricePerHour } = req.body as { availableSpaces?: number; pricePerHour?: number };

  if (typeof availableSpaces !== 'number' || typeof pricePerHour !== 'number') {
    res.status(400).json({ error: 'Invalid facility update payload.' });
    return;
  }

  try {
    const assignment = await pool.query(
      'SELECT facility_id FROM parking_admins WHERE user_id = $1',
      [req.user!.uid]
    );

    const facilityId = assignment.rows[0]?.facility_id;
    if (!facilityId) {
      res.status(400).json({ error: 'No facility is assigned to this admin.' });
      return;
    }

    const facilityResult = await pool.query(
      'SELECT total_spaces FROM parking_locations WHERE id = $1',
      [facilityId]
    );

    const totalSpaces = facilityResult.rows[0]?.total_spaces;
    if (typeof totalSpaces !== 'number') {
      res.status(404).json({ error: 'Assigned facility not found.' });
      return;
    }

    const safeAvailableSpaces = Math.max(0, Math.min(totalSpaces, availableSpaces));
    const safePrice = Math.max(0, pricePerHour);
    const status = safeAvailableSpaces === 0 ? 'Full' : 'Verified';

    const updated = await pool.query(
      `
        UPDATE parking_locations
        SET available_spaces = $1, price_per_hour = $2, status = $3
        WHERE id = $4
        RETURNING id, facility_name, address, latitude, longitude, total_spaces, available_spaces, price_per_hour, status, created_at
      `,
      [safeAvailableSpaces, safePrice, status, facilityId]
    );

    res.json({ facility: mapFacility(updated.rows[0]) });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update facility.' });
  }
});

app.get('/api/sysadmin/overview', requireAuth, requireRole(['sys_admin']), async (_req, res) => {
  try {
    const [facilitiesResult, usersResult, adminsResult] = await Promise.all([
      pool.query(
        `
          SELECT id, facility_name, address, latitude, longitude, total_spaces, available_spaces, price_per_hour, status, created_at
          FROM parking_locations
          ORDER BY facility_name ASC
        `
      ),
      pool.query(
        `
          SELECT id, email, role, display_name, created_at
          FROM users
          ORDER BY created_at DESC
        `
      ),
      pool.query(
        `
          SELECT u.id AS user_id, u.display_name, u.email, pa.facility_id
          FROM users u
          JOIN parking_admins pa ON pa.user_id = u.id
          WHERE u.role = 'parking_admin'
          ORDER BY u.display_name ASC
        `
      ),
    ]);

    res.json({
      facilities: facilitiesResult.rows.map(mapFacility),
      users: usersResult.rows.map((row) => ({
        uid: row.id,
        email: row.email,
        role: row.role,
        displayName: row.display_name,
        createdAt: row.created_at,
      })),
      admins: adminsResult.rows.map((row) => ({
        adminId: row.user_id,
        name: row.display_name,
        email: row.email,
        facilityID: row.facility_id,
      })),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load system admin data.' });
  }
});

app.post('/api/sysadmin/facilities', requireAuth, requireRole(['sys_admin']), async (req, res) => {
  const { facilityName, address, latitude, longitude, totalSpaces, pricePerHour, status } = req.body;
  if (!facilityName || !address) {
    res.status(400).json({ error: 'Facility name and address are required.' });
    return;
  }

  try {
    const result = await pool.query(
      `
        INSERT INTO parking_locations (
          id, facility_name, address, latitude, longitude,
          total_spaces, available_spaces, price_per_hour, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $6, $7, $8)
        RETURNING id, facility_name, address, latitude, longitude, total_spaces, available_spaces, price_per_hour, status, created_at
      `,
      [
        randomUUID(),
        facilityName,
        address,
        Number(latitude),
        Number(longitude),
        Number(totalSpaces),
        Number(pricePerHour),
        status || 'Verified',
      ]
    );

    res.status(201).json({ facility: mapFacility(result.rows[0]) });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create facility.' });
  }
});

app.delete('/api/sysadmin/facilities/:id', requireAuth, requireRole(['sys_admin']), async (req, res) => {
  try {
    await pool.query('DELETE FROM parking_locations WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete facility.' });
  }
});

app.post('/api/sysadmin/assign-admin', requireAuth, requireRole(['sys_admin']), async (req, res) => {
  const { adminId, facilityId } = req.body as { adminId?: string; facilityId?: string };
  if (!facilityId) {
    res.status(400).json({ error: 'Facility id is required.' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      'UPDATE parking_admins SET facility_id = NULL WHERE facility_id = $1',
      [facilityId]
    );

    if (adminId) {
      await client.query(
        'UPDATE parking_admins SET facility_id = NULL WHERE user_id = $1',
        [adminId]
      );
      await client.query(
        'UPDATE parking_admins SET facility_id = $1 WHERE user_id = $2',
        [facilityId, adminId]
      );
    }

    await client.query('COMMIT');
    res.status(204).send();
  } catch (error: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message || 'Failed to assign parking admin.' });
  } finally {
    client.release();
  }
});

initializeDatabase()
  .then(() => {
    app.listen(port, () => {
      console.log(`ParkWise API running on http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  });
