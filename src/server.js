require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const errorHandler = require('./middlewares/errorHandler');
const healthRoutes = require('./routes/health.routes');
const workerRoutes = require('./routes/worker.routes');
const roleRoutes = require('./routes/role.routes');
const ppeItemRoutes = require('./routes/ppeItem.routes');
const entryLogRoutes = require('./routes/entryLog.routes');
const openApiSpec = require('./docs/openapi.json');

const app = express();
const PORT = process.env.PORT || 5001;

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/ppe-items', ppeItemRoutes);
app.use('/api/entry-logs', entryLogRoutes);

// API contract and interactive API docs
app.get('/openapi.json', (req, res) => {
  res.json(openApiSpec);
});

app.use(
  '/docs',
  swaggerUi.serve,
  swaggerUi.setup(openApiSpec, {
    explorer: true,
    customSiteTitle: 'Turnstile PPE API Docs',
  })
);

// Root route
app.get('/', (req, res) => {
  res.send('Turnstile Backend API is running');
});

// Error Handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
