import { Router } from 'express';
import { pool, query } from '../db.js';

const router = Router();
const VALID_STATUSES = ['Available', 'In Use', 'Maintenance', 'Overdue'];

function normalizeJig(row) {
  return {
    id: row.jig_code,
    description: row.description,
    machine: row.machine,
    location: row.location,
    status: row.status,
    rfidUid: row.rfid_uid,
    qrCode: row.qr_code,
    lastInspection: row.last_inspection,
    nextInspection: row.next_inspection,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

router.get('/', async (req, res, next) => {
  try {
    const search = String(req.query.search || '').trim();
    const status = String(req.query.status || '').trim();

    const params = [];
    const where = [];

    if (search) {
      params.push(`%${search}%`);
      where.push(`(
        jig_code ILIKE $${params.length}
        OR description ILIKE $${params.length}
        OR COALESCE(machine, '') ILIKE $${params.length}
        OR COALESCE(location, '') ILIKE $${params.length}
      )`);
    }

    if (status) {
      params.push(status);
      where.push(`status = $${params.length}`);
    }

    const result = await query(
      `SELECT * FROM jigs
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY jig_code ASC`,
      params
    );

    res.json({ success: true, count: result.rowCount, data: result.rows.map(normalizeJig) });
  } catch (error) {
    next(error);
  }
});

router.get('/:jigCode', async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM jigs WHERE jig_code = $1', [req.params.jigCode]);

    if (!result.rowCount) {
      return res.status(404).json({ success: false, message: 'Jig not found' });
    }

    res.json({ success: true, data: normalizeJig(result.rows[0]) });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const {
      id,
      description,
      machine = null,
      location = null,
      status = 'Available',
      rfidUid = null,
      qrCode = null,
      lastInspection = null,
      nextInspection = null
    } = req.body;

    if (!id || !description) {
      return res.status(400).json({ success: false, message: 'id and description are required' });
    }

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid jig status' });
    }

    const result = await query(
      `INSERT INTO jigs
       (jig_code, description, machine, location, status, rfid_uid, qr_code, last_inspection, next_inspection)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [id, description, machine, location, status, rfidUid, qrCode, lastInspection, nextInspection]
    );

    res.status(201).json({ success: true, data: normalizeJig(result.rows[0]) });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ success: false, message: 'Jig ID, RFID UID, or QR code already exists' });
    }
    next(error);
  }
});

router.patch('/:jigCode', async (req, res, next) => {
  try {
    const allowed = {
      description: 'description',
      machine: 'machine',
      location: 'location',
      status: 'status',
      rfidUid: 'rfid_uid',
      qrCode: 'qr_code',
      lastInspection: 'last_inspection',
      nextInspection: 'next_inspection'
    };

    if (req.body.status && !VALID_STATUSES.includes(req.body.status)) {
      return res.status(400).json({ success: false, message: 'Invalid jig status' });
    }

    const sets = [];
    const values = [];

    for (const [inputKey, column] of Object.entries(allowed)) {
      if (Object.prototype.hasOwnProperty.call(req.body, inputKey)) {
        values.push(req.body[inputKey]);
        sets.push(`${column} = $${values.length}`);
      }
    }

    if (!sets.length) {
      return res.status(400).json({ success: false, message: 'No supported fields supplied' });
    }

    values.push(req.params.jigCode);

    const result = await query(
      `UPDATE jigs
       SET ${sets.join(', ')}, updated_at = NOW()
       WHERE jig_code = $${values.length}
       RETURNING *`,
      values
    );

    if (!result.rowCount) {
      return res.status(404).json({ success: false, message: 'Jig not found' });
    }

    res.json({ success: true, data: normalizeJig(result.rows[0]) });
  } catch (error) {
    next(error);
  }
});

router.post('/:jigCode/checkout', async (req, res, next) => {
  const client = await pool.connect();

  try {
    const { employeeId, employeeName, machine = null, location = null, notes = null } = req.body;

    if (!employeeId || !employeeName) {
      return res.status(400).json({ success: false, message: 'employeeId and employeeName are required' });
    }

    await client.query('BEGIN');

    const jigResult = await client.query(
      'SELECT * FROM jigs WHERE jig_code = $1 FOR UPDATE',
      [req.params.jigCode]
    );

    if (!jigResult.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Jig not found' });
    }

    if (jigResult.rows[0].status !== 'Available') {
      await client.query('ROLLBACK');
      return res.status(409).json({ success: false, message: `Jig is currently ${jigResult.rows[0].status}` });
    }

    await client.query(
      `UPDATE jigs
       SET status = 'In Use', machine = COALESCE($2, machine), location = COALESCE($3, location), updated_at = NOW()
       WHERE jig_code = $1`,
      [req.params.jigCode, machine, location]
    );

    const movement = await client.query(
      `INSERT INTO jig_movements
       (jig_id, movement_type, employee_id, employee_name, machine, location, notes)
       VALUES ($1, 'CHECK_OUT', $2, $3, $4, $5, $6)
       RETURNING *`,
      [jigResult.rows[0].id, employeeId, employeeName, machine, location, notes]
    );

    await client.query('COMMIT');

    res.status(201).json({ success: true, message: 'Jig checked out', data: movement.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

router.post('/:jigCode/return', async (req, res, next) => {
  const client = await pool.connect();

  try {
    const { employeeId, employeeName, location, notes = null } = req.body;

    if (!employeeId || !employeeName || !location) {
      return res.status(400).json({ success: false, message: 'employeeId, employeeName and location are required' });
    }

    await client.query('BEGIN');

    const jigResult = await client.query(
      'SELECT * FROM jigs WHERE jig_code = $1 FOR UPDATE',
      [req.params.jigCode]
    );

    if (!jigResult.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Jig not found' });
    }

    await client.query(
      `UPDATE jigs
       SET status = 'Available', location = $2, updated_at = NOW()
       WHERE jig_code = $1`,
      [req.params.jigCode, location]
    );

    const movement = await client.query(
      `INSERT INTO jig_movements
       (jig_id, movement_type, employee_id, employee_name, machine, location, notes)
       VALUES ($1, 'RETURN', $2, $3, $4, $5, $6)
       RETURNING *`,
      [jigResult.rows[0].id, employeeId, employeeName, jigResult.rows[0].machine, location, notes]
    );

    await client.query('COMMIT');

    res.status(201).json({ success: true, message: 'Jig returned', data: movement.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

export default router;
