require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const errorHandler = require('./middlewares/errorHandler');
const healthRoutes = require('./routes/health.routes');

const app = express();
const PORT = process.env.PORT || 5001;

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/health', healthRoutes);

// Root route
app.get('/', (req, res) => {
  res.send('Turnstile Backend API is running');
});

// Error Handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
