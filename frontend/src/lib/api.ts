import { auth } from './firebase';

// URL para producción
const API_BASE_URL = 'https://us-central1-turnos-rotativos-app.cloudfunctions.net/api';

// Para desarrollo local, comentar la línea de arriba y descomentar esta:
//const API_BASE_URL = 'http://localhost:5002/turnos-rotativos-app/us-central1/api';

// Para verificar que la API está activa
const API_ACTIVE = true;

async function apiRequest(endpoint: string, options: RequestInit = {}) {
  // VERIFICAR QUE AUTH NO SEA NULL
  if (!auth) {
    throw new Error('Firebase Auth no está disponible');
  }

  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  const token = await user.getIdToken();
  
  console.log(`🔗 Llamando API: ${API_BASE_URL}${endpoint}`);
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error: ${error}`);
  }

  return response.json();
}

export const api = {
  // Health check
  health: () => apiRequest('/health'),
  
  // Turnos
  getShifts: () => apiRequest('/shifts'),
  
  createShift: (shiftData: any) => 
    apiRequest('/shifts', { 
      method: 'POST', 
      body: JSON.stringify(shiftData) 
    }),
  
  // Usuarios
  getUsers: () => apiRequest('/users'),
  
  updateUserRole: (userId: string, role: string) =>
    apiRequest(`/users/${userId}/role`, { 
      method: 'PUT', 
      body: JSON.stringify({ role }) 
    }),
};