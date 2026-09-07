import { Router } from 'express';
import { pool, query } from '../db.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT
         m.id,
         j.jig_code AS "jigId",
         m.maintenance_type AS "maintenanceType",
         m.status,
         m.due_date AS "dueDate",
         m.completed_at AS "completedAt",
         m.completed_by AS "completedBy",
         m.notes,
         m.created_at AS "createdAt"
       FROM jig_maintenance m
       JOIN jigs j ON j.id = m.jig_id
       ORDER BY
         CASE WHEN m.status = 'Pending' THEN 0 ELSE 1 END,
         m.due_date ASC NULLS LAST`,
      []
    );

    res.json({ success: true, count: result.rowCount, data: result.rows });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { jigId, maintenanceType, dueDate = null, notes = null } = req.body;

    if (!jigId || !maintenanceType) {
      return res.status(400).json({ success: false, message: 'jigId and maintenanceType are required' });
    }

    const result = await query(
      `INSERT INTO jig_maintenance (jig_id, maintenance_type, due_date, notes)
       SELECT id, $2, $3, $4 FROM jigs WHERE jig_code = $1
       RETURNING *`,
      [jigId, maintenanceType, dueDate, notes]
    );

    if (!result.rowCount) {
      return res.status(404).json({ success: false, message: 'Jig not found' });
    }

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

router.post('/:maintenanceId/complete', async (req, res, next) => {
  const client = await pool.connect();

  try {
    const { completedBy, notes = null, nextInspection = null } = req.body;

    if (!completedBy) {
      return res.status(400).json({ success: false, message: 'completedBy is required' });
    }

    await client.query('BEGIN');

    const maintenance = await client.query(
      `UPDATE jig_maintenance
       SET status = 'Completed', completed_at = NOW(), completed_by = $2,
           notes = COALESCE($3, notes)
       WHERE id = $1
       RETURNING *`,
      [req.params.maintenanceId, completedBy, notes]
    );

    if (!maintenance.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Maintenance record not found' });
    }

    await client.query(
      `UPDATE jigs
       SET status = 'Available', last_inspection = CURRENT_DATE,
           next_inspection = COALESCE($2, next_inspection), updated_at = NOW()
       WHERE id = $1`,
      [maintenance.rows[0].jig_id, nextInspection]
    );

    await client.query('COMMIT');

    res.json({ success: true, message: 'Maintenance completed', data: maintenance.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

export default router;
