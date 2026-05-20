const { createClient } = require('@supabase/supabase-js');

if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
  console.log('Connecting to official online Supabase DB...');
  module.exports = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
} else {
  console.log('Running in local/offline database mode (using db.json)...');
  const fs = require('fs');
  const path = require('path');

const dbPath = path.join(__dirname, '../db.json');

// Helper to read DB
function readDb() {
  try {
    if (!fs.existsSync(dbPath)) {
      fs.writeFileSync(dbPath, JSON.stringify({ users: [], profiles: [], categories: [], menu_items: [], orders: [] }, null, 2), 'utf8');
    }
    const data = fs.readFileSync(dbPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading mock db.json, returning empty template:', error);
    return {
      users: [],
      profiles: [],
      categories: [],
      menu_items: [],
      orders: []
    };
  }
}

// Helper to write DB
function writeDb(data) {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Error writing mock db.json:', error);
  }
}

// Simple unique ID generator
function generateId() {
  return 'mock-uuid-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now().toString(36);
}

class QueryBuilder {
  constructor(table) {
    this.table = table;
    this.filters = [];
    this.sortField = null;
    this.sortAscending = true;
    this.isSingle = false;
    this.action = 'select'; // 'select', 'insert', 'update', 'delete'
    this.actionPayload = null;
    this.selectFields = '*';
  }

  select(fields = '*') {
    if (this.action === 'select' || !this.action) {
      this.action = 'select';
    }
    this.selectFields = fields;
    return this;
  }

  insert(rows) {
    this.action = 'insert';
    this.actionPayload = rows;
    return this;
  }

  update(updates) {
    this.action = 'update';
    this.actionPayload = updates;
    return this;
  }

  delete() {
    this.action = 'delete';
    return this;
  }

  eq(field, value) {
    this.filters.push({ field, value });
    return this;
  }

  order(field, options = { ascending: true }) {
    this.sortField = field;
    this.sortAscending = options.ascending !== false;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  async execute() {
    const db = readDb();
    let data = db[this.table] || [];

    if (this.action === 'select') {
      // Apply filters
      for (const filter of this.filters) {
        data = data.filter(row => row[filter.field] == filter.value);
      }

      // Handle joins (e.g. *, categories(*))
      if (this.table === 'menu_items' && this.selectFields.includes('categories')) {
        // Fetch categories to join
        const categories = db['categories'] || [];
        data = data.map(item => {
          const category = categories.find(c => c.id === item.category_id);
          return {
            ...item,
            categories: category || null
          };
        });
      }

      // Sort
      if (this.sortField) {
        data = [...data].sort((a, b) => {
          let valA = a[this.sortField];
          let valB = b[this.sortField];
          if (valA === undefined) return 1;
          if (valB === undefined) return -1;
          if (typeof valA === 'string') {
            return this.sortAscending 
              ? valA.localeCompare(valB)
              : valB.localeCompare(valA);
          }
          return this.sortAscending ? valA - valB : valB - valA;
        });
      }

      if (this.isSingle) {
        if (data.length === 0) {
          return { data: null, error: { message: `No rows found in table ${this.table}` } };
        }
        return { data: data[0], error: null };
      }

      return { data, error: null };

    } else if (this.action === 'insert') {
      const rowsToInsert = Array.isArray(this.actionPayload) 
        ? this.actionPayload 
        : [this.actionPayload];

      const insertedRows = rowsToInsert.map(row => {
        const newRow = { 
          id: row.id || generateId(),
          created_at: new Date().toISOString(),
          ...row 
        };
        db[this.table].push(newRow);
        return newRow;
      });

      writeDb(db);

      if (this.isSingle) {
        return { data: insertedRows[0], error: null };
      }
      return { data: insertedRows, error: null };

    } else if (this.action === 'update') {
      // Find matching items
      let matchedIndices = [];
      for (let i = 0; i < db[this.table].length; i++) {
        let match = true;
        for (const filter of this.filters) {
          if (db[this.table][i][filter.field] != filter.value) {
            match = false;
            break;
          }
        }
        if (match) {
          matchedIndices.push(i);
        }
      }

      const updatedRows = [];
      const payload = this.actionPayload || {};
      
      // Filter out undefined keys
      const cleanPayload = {};
      Object.keys(payload).forEach(key => {
        if (payload[key] !== undefined) {
          cleanPayload[key] = payload[key];
        }
      });

      for (const idx of matchedIndices) {
        db[this.table][idx] = {
          ...db[this.table][idx],
          ...cleanPayload
        };
        updatedRows.push(db[this.table][idx]);
      }

      if (updatedRows.length > 0) {
        writeDb(db);
      }

      if (this.isSingle) {
        if (updatedRows.length === 0) {
          return { data: null, error: { message: `No rows matched update in table ${this.table}` } };
        }
        return { data: updatedRows[0], error: null };
      }
      return { data: updatedRows, error: null };

    } else if (this.action === 'delete') {
      const initialLength = db[this.table].length;
      
      db[this.table] = db[this.table].filter(row => {
        let match = true;
        for (const filter of this.filters) {
          if (row[filter.field] != filter.value) {
            match = false;
            break;
          }
        }
        return !match;
      });

      if (db[this.table].length !== initialLength) {
        writeDb(db);
      }

      return { data: null, error: null };
    }

    return { data: null, error: new Error('Unknown database action') };
  }

  then(resolve, reject) {
    this.execute()
      .then(result => resolve(result))
      .catch(err => {
        console.error('Mock DB Execution error:', err);
        resolve({ data: null, error: err });
      });
  }
}

const authMock = {
  async signUp({ email, password }) {
    const db = readDb();
    
    // Check if user already exists
    const existing = db.users.find(u => u.email === email);
    if (existing) {
      return { data: { user: null }, error: { message: 'User already exists' } };
    }

    const userId = generateId();
    const newUser = { id: userId, email, password };
    db.users.push(newUser);
    writeDb(db);

    const session = {
      access_token: 'mock-token-' + userId,
      token: 'mock-token-' + userId
    };

    return {
      data: { user: { id: userId, email }, session },
      error: null
    };
  },

  async signInWithPassword({ email, password }) {
    const db = readDb();
    const user = db.users.find(u => u.email === email && u.password === password);
    
    if (!user) {
      return { data: { user: null, session: null }, error: { message: 'Invalid phone number or password' } };
    }

    const session = {
      access_token: 'mock-token-' + user.id
    };

    return {
      data: { user: { id: user.id, email: user.email }, session },
      error: null
    };
  },

  async getUser(token) {
    if (!token || !token.startsWith('mock-token-')) {
      return { data: { user: null }, error: { message: 'Invalid or missing mock token' } };
    }

    const userId = token.replace('mock-token-', '');
    const db = readDb();
    const user = db.users.find(u => u.id === userId);

    if (!user) {
      return { data: { user: null }, error: { message: 'Mock user not found' } };
    }

    return {
      data: { user: { id: user.id, email: user.email } },
      error: null
    };
  },

  admin: {
    async deleteUser(userId) {
      const db = readDb();
      db.users = db.users.filter(u => u.id !== userId);
      writeDb(db);
      return { data: {}, error: null };
    }
  }
};

const supabase = {
  auth: authMock,
  from(table) {
    return new QueryBuilder(table);
  }
};

module.exports = supabase;
}
