// In development (Vite dev server at port 5173) → call Express at port 5000
// In production (Vercel or Express serving the SPA at port 5000) → use relative /api path
const IS_DEV = import.meta.env.DEV || (window.location.port !== '' && window.location.port !== '5000');

const API_BASE_URL = import.meta.env.VITE_API_URL || (
  IS_DEV
    ? `http://${window.location.hostname}:5000/api`
    : '/api'
);

let tokenResolver = null;

export const setTokenResolver = (resolver) => {
  tokenResolver = resolver;
};

const getHeaders = async () => {
  let token = null;
  let source = 'none';

  // 1. Try global Clerk session directly to avoid hook resolver race conditions
  if (window.Clerk?.session) {
    try {
      token = await window.Clerk.session.getToken();
      if (token) source = 'window.Clerk';
    } catch (err) {
      console.warn('Failed to resolve token from window.Clerk:', err);
    }
  }

  // 2. Try hook-based token resolver fallback
  if (!token && tokenResolver) {
    try {
      token = await tokenResolver();
      if (token) source = 'tokenResolver';
    } catch (err) {
      console.warn('Failed to resolve token from tokenResolver:', err);
    }
  }

  // 3. Try localStorage fallback for offline testing
  if (!token) {
    token = localStorage.getItem('token');
    if (token) source = 'localStorage';
  }

  console.log(`[API getHeaders] Resolved token from source: "${source}"`);

  const headers = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export const api = {
  async get(endpoint) {
    const headers = await getHeaders();
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers
    });
    return this.handleResponse(response);
  },

  async post(endpoint, body, isFormData = false) {
    const headers = await getHeaders();
    if (isFormData) {
      // Let fetch set Content-Type with boundary for files
      delete headers['Content-Type'];
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: isFormData ? body : JSON.stringify(body)
    });
    return this.handleResponse(response);
  },

  async put(endpoint, body) {
    const headers = await getHeaders();
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body)
    });
    return this.handleResponse(response);
  },

  async delete(endpoint) {
    const headers = await getHeaders();
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers
    });
    return this.handleResponse(response);
  },

  async handleResponse(response) {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('profile');
        
        // Don't redirect if already on auth pages or customer menu
        const path = window.location.pathname;
        const isAuthPage = path === '/login' || path === '/register' || path.startsWith('/menu');
        
        if (!isAuthPage) {
          const isClerkEnabled = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
          if (isClerkEnabled && window.Clerk) {
            window.Clerk.signOut()
              .catch(err => console.error('Failed to sign out of Clerk on 401:', err))
              .finally(() => {
                window.location.href = '/login?error=session_expired';
              });
            return new Promise(() => {});
          }
          window.location.href = '/login?error=session_expired';
        }
      }
      throw new Error(data.error || 'API Request Failed');
    }
    return data;
  }
};

export const resolveImageUrl = (url) => {
  if (!url || typeof url !== 'string' || url.trim() === '') return '';
  
  if (url.includes('/uploads/')) {
    const uploadsIndex = url.indexOf('/uploads/');
    const relativePath = url.substring(uploadsIndex); // "/uploads/..."
    // In dev or preview, uploads are served by Express at port 5000
    // In production (Vercel or Express serving SPA), use relative path
    if (IS_DEV) {
      return `http://${window.location.hostname}:5000${relativePath}`;
    }
    return relativePath; // relative URL works for both Vercel and local Express
  }
  
  return url;
};
