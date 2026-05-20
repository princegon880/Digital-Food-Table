const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:3000'
];

app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        // Allow in development but warning if mismatched
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true
  })
);

// Express Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve local upload files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Mount API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/items', require('./routes/items'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/public/menu', require('./routes/menu'));

// Diagnostics and Health check endpoint
app.get('/api/test-db', async (req, res) => {
  const supabase = require('./config/supabase');
  const diagnostics = {
    supabase_url_exists: !!process.env.SUPABASE_URL,
    supabase_key_exists: !!process.env.SUPABASE_KEY,
    supabase_url_val: process.env.SUPABASE_URL ? process.env.SUPABASE_URL.substring(0, 15) + '...' : null,
    supabase_key_length: process.env.SUPABASE_KEY ? process.env.SUPABASE_KEY.length : 0,
    db_mode: process.env.SUPABASE_URL && process.env.SUPABASE_KEY ? 'Official Supabase' : 'Offline/db.json file',
  };

  try {
    const start = Date.now();
    const { data, error } = await supabase.from('profiles').select('restaurant_name, slug');
    
    diagnostics.query_time_ms = Date.now() - start;
    
    if (error) {
      diagnostics.query_success = false;
      diagnostics.database_error = error;
    } else {
      diagnostics.query_success = true;
      diagnostics.profiles_count = data ? data.length : 0;
      diagnostics.profiles = data;
    }
  } catch (err) {
    diagnostics.query_success = false;
    diagnostics.exception = err.message || err;
  }

  res.json(diagnostics);
});

// Default base route
app.get('/', (req, res) => {
  res.json({ message: 'QR Menu SaaS API is running smoothly.' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Something went wrong on the server!' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Uploads folder served at http://localhost:${PORT}/uploads/`);
});
