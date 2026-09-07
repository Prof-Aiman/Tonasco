import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  let database = 'not-configured';

  if (process.env.DATABASE_URL) {
    try {
      await query('SELECT 1');
      database = 'connected';
    } catch (error) {
      database = 'unavailable';
    }
  }

  res.json({
    success: true,
    service: 'Tonasco Jig Management API',
    status: 'online',
    database,
    time: new Date().toISOString()
  });
});

export default router;
