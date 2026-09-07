import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);

    const result = await query(
      `SELECT
         m.id,
         j.jig_code AS "jigId",
         m.movement_type AS "movementType",
         m.employee_id AS "employeeId",
         m.employee_name AS "employeeName",
         m.machine,
         m.location,
         m.notes,
         m.created_at AS "createdAt"
       FROM jig_movements m
       JOIN jigs j ON j.id = m.jig_id
       ORDER BY m.created_at DESC
       LIMIT $1`,
      [limit]
    );

    res.json({ success: true, count: result.rowCount, data: result.rows });
  } catch (error) {
    next(error);
  }
});

export default router;
