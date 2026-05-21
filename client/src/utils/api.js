const API_BASE_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000/api`;

const getHeaders = () => {
  const token = localStorage.getItem('token');
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
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: getHeaders()
    });
    return this.handleResponse(response);
  },

  async post(endpoint, body, isFormData = false) {
    const headers = getHeaders();
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
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(body)
    });
    return this.handleResponse(response);
  },

  async delete(endpoint) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: getHeaders()
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
        if (!window.location.pathname.startsWith('/menu')) {
          // Redirect dashboard users to login, but keep customers on menu
          window.location.href = '/login';
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
    const serverBaseUrl = API_BASE_URL.replace('/api', '');
    return `${serverBaseUrl}${relativePath}`;
  }
  
  return url;
};
