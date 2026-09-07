import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import healthRoutes from './routes/health.js';
import jigRoutes from './routes/jigs.js';
import movementRoutes from './routes/movements.js';
import maintenanceRoutes from './routes/maintenance.js';
import { errorHandler, notFound } from './middleware/error-handler.js';

const app = express();
const port = Number(process.env.PORT || 3000);

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:4200')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Origin is not allowed by CORS'));
  }
}));
app.use(express.json({ limit: '2mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.get('/', (req, res) => {
  res.json({
    name: 'Tonasco Jig Management API',
    version: '0.1.0',
    endpoints: {
      health: '/api/health',
      jigs: '/api/jigs',
      movements: '/api/movements',
      maintenance: '/api/maintenance'
    }
  });
});

app.use('/api/health', healthRoutes);
app.use('/api/jigs', jigRoutes);
app.use('/api/movements', movementRoutes);
app.use('/api/maintenance', maintenanceRoutes);

app.use(notFound);
app.use(errorHandler);

app.listen(port, '0.0.0.0', () => {
  console.log(`Tonasco Jig Management API running on port ${port}`);
});
