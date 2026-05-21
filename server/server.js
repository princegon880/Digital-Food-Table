const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
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

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - Origin: ${req.get('origin') || 'none'}`);
  next();
});

// Serve local upload files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve static client assets
const clientBuildPath = path.join(__dirname, '../client/dist');
const hasClientBuild = fs.existsSync(clientBuildPath);
if (hasClientBuild) {
  app.use(express.static(clientBuildPath));
  console.log(`Serving client production build from: ${clientBuildPath}`);
} else {
  console.log(`Client production build not found at: ${clientBuildPath}. Will fallback to JSON messages.`);
}

// Mount API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/items', require('./routes/items'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/public/menu', require('./routes/menu'));

// Diagnostics and Health check endpoint
app.get('/api/test-db', async (req, res) => {
  const supabase = require('./config/supabase');
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;
  const hasValidUrl = url && !url.includes('your-project');
  const hasValidKey = key && !key.includes('your-anon-key') && !key.includes('your-service-role-key');
  const isOnlineMode = hasValidUrl && hasValidKey;

  const diagnostics = {
    supabase_url_exists: !!url,
    supabase_anon_key_exists: !!process.env.SUPABASE_ANON_KEY,
    supabase_key_exists: !!process.env.SUPABASE_KEY,
    supabase_url_val: url ? url.substring(0, 15) + '...' : null,
    supabase_key_length: key ? key.length : 0,
    db_mode: isOnlineMode ? 'Official Supabase' : 'Offline/db.json file',
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

// Get Server Network IP Address
app.get('/api/server-ip', (req, res) => {
  const os = require('os');
  const networkInterfaces = os.networkInterfaces();
  let localIp = 'localhost';
  for (const interfaceName in networkInterfaces) {
    for (const iface of networkInterfaces[interfaceName]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        localIp = iface.address;
        break;
      }
    }
  }
  res.json({ ip: localIp });
});

// Catch-all route to serve the React index.html for any frontend route
app.get('*', (req, res, next) => {
  // Exclude API routes and static asset files containing dots
  if (req.path.startsWith('/api/') || req.path.includes('.')) {
    return next();
  }
  if (hasClientBuild) {
    return res.sendFile(path.join(clientBuildPath, 'index.html'), (err) => {
      if (err) {
        next();
      }
    });
  }
  // Fallback if client is not built
  res.json({ message: 'QR Menu SaaS API is running smoothly. (Client build not found)' });
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
