'use client';
import { useState, useEffect } from 'react';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { api } from '@/lib/api';

interface ShiftForm {
  date: string;
  userName: string;
  email: string;
  shiftType: string;
  role: string;
}

interface User {
  id: string;
  email: string;
  role: 'admin' | 'agente' | 'ingeniero';
  name: string;
  isActive: boolean;
  createdAt?: string;
}

export default function AdminPanel() {
  const [formData, setFormData] = useState<ShiftForm>({
    date: new Date().toISOString().split('T')[0],
    userName: '',
    email: '',
    shiftType: '6am-2pm',
    role: 'agente'
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);

  // Cargar usuarios al montar el componente
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setUsersLoading(true);
      const usersData = await api.getUsers();
      setUsers(usersData);
    } catch (error) {
      console.error('Error cargando usuarios:', error);
      setMessage('❌ Error al cargar los usuarios');
    } finally {
      setUsersLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      await api.createShift(formData);
      
      setMessage('✅ Turno agregado exitosamente!');
      setFormData({
        date: new Date().toISOString().split('T')[0],
        userName: '',
        email: '',
        shiftType: '6am-2pm',
        role: 'agente'
      });
    } catch (error) {
      console.error('Error agregando turno:', error);
      setMessage('❌ Error al agregar el turno');
    } finally {
      setLoading(false);
    }
  };

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const csvContent = event.target?.result as string;
      
      setLoading(true);
      let successCount = 0;
      let errorCount = 0;

      const rows = csvContent.split('\n').slice(1); // Saltar encabezado

      for (const row of rows) {
        if (row.trim() === '') continue;
        
        const [date, userName, email, shiftType, role] = row.split(',');
        
        try {
          await api.createShift({
            date: date.trim(),
            userName: userName.trim(),
            email: email.trim(),
            shiftType: shiftType.trim(),
            role: role.trim()
          });
          successCount++;
        } catch (error) {
          console.error('Error agregando turno desde CSV:', error);
          errorCount++;
        }
      }
      
      setMessage(`✅ CSV procesado: ${successCount} exitosos, ${errorCount} errores`);
      setLoading(false);
      if (e.target) e.target.value = ''; // Reset input file
    };
    
    reader.readAsText(file);
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      await api.updateUserRole(userId, newRole);
      setMessage('✅ Rol de usuario actualizado correctamente');
      
      // Actualizar la lista local de usuarios
      setUsers(users.map(user => 
        user.id === userId ? { ...user, role: newRole as any } : user
      ));
    } catch (error) {
      console.error('Error actualizando rol:', error);
      setMessage('❌ Error al actualizar el rol del usuario');
    }
  };

  const activateUser = async (userId: string, activate: boolean) => {
    try {
      // Aquí podrías agregar una función en tu API para activar/desactivar usuarios
      setMessage(`✅ Usuario ${activate ? 'activado' : 'desactivado'} correctamente`);
      // Nota: Necesitarías agregar este endpoint en tu backend
    } catch (error) {
      console.error('Error cambiando estado de usuario:', error);
      setMessage('❌ Error al cambiar el estado del usuario');
    }
  };

  const getRoleBadge = (role: string) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-semibold";
    switch (role) {
      case 'admin':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'ingeniero':
        return `${baseClasses} bg-blue-100 text-blue-800`;
      case 'agente':
        return `${baseClasses} bg-green-100 text-green-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive 
      ? "px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800"
      : "px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800";
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Panel de Administración</h2>
      
      {message && (
        <div className={`mb-4 p-3 rounded ${
          message.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {message}
        </div>
      )}

      {/* Formulario individual para agregar turnos */}
      <form onSubmit={handleSubmit} className="mb-8 border-b pb-8">
        <h3 className="text-xl font-semibold mb-4">Agregar Turno Individual</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha
            </label>
            <input
              type="date"
              required
              value={formData.date}
              onChange={(e) => setFormData({...formData, date: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del Usuario
            </label>
            <input
              type="text"
              required
              value={formData.userName}
              onChange={(e) => setFormData({...formData, userName: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Ej: Juan Pérez"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="ejemplo@correo.com"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Turno
            </label>
            <select
              value={formData.shiftType}
              onChange={(e) => setFormData({...formData, shiftType: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="6am-2pm">6:00 AM - 2:00 PM</option>
              <option value="2pm-10pm">2:00 PM - 10:00 PM</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rol
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({...formData, role: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="agente">Agente</option>
              <option value="ingeniero">Ingeniero</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-md disabled:opacity-50"
        >
          {loading ? 'Agregando...' : 'Agregar Turno'}
        </button>
      </form>

      {/* Importación CSV */}
      <div className="mb-8 border-b pb-8">
        <h3 className="text-xl font-semibold mb-4">Importar desde CSV</h3>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600 mb-2">
            Formato del CSV: <strong>fecha,nombre,email,turno,rol</strong>
          </p>
          <p className="text-xs text-gray-500 mb-4">
            Ejemplo: 2024-01-15,Juan Pérez,juan@email.com,6am-2pm,agente
          </p>
          <input
            type="file"
            accept=".csv"
            onChange={handleCSVUpload}
            disabled={loading}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
          />
        </div>
      </div>

      {/* Gestión de usuarios - MEJORADA */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Gestión de Usuarios</h3>
          <button
            onClick={loadUsers}
            disabled={usersLoading}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm disabled:opacity-50"
          >
            {usersLoading ? 'Cargando...' : 'Actualizar'}
          </button>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600 mb-4">
            Usuarios registrados en el sistema ({users.length} total):
          </p>
          
          {usersLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Cargando usuarios...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {users.map((user) => (
                <div key={user.id} className="flex items-center justify-between bg-white p-4 rounded border">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <p className="font-medium">{user.name}</p>
                      <span className={getRoleBadge(user.role)}>
                        {user.role.toUpperCase()}
                      </span>
                      <span className={getStatusBadge(user.isActive)}>
                        {user.isActive ? 'ACTIVO' : 'INACTIVO'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{user.email}</p>
                    {user.createdAt && (
                      <p className="text-xs text-gray-500 mt-1">
                        Registrado: {new Date(user.createdAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <select
                      value={user.role}
                      onChange={(e) => updateUserRole(user.id, e.target.value)}
                      className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                    >
                      <option value="agente">Agente</option>
                      <option value="ingeniero">Ingeniero</option>
                      <option value="admin">Administrador</option>
                    </select>
                    
                    {/* <button
                      onClick={() => activateUser(user.id, !user.isActive)}
                      className={`px-3 py-1 rounded text-sm ${
                        user.isActive 
                          ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {user.isActive ? 'Desactivar' : 'Activar'}
                    </button> */}
                  </div>
                </div>
              ))}
              
              {users.length === 0 && (
                <p className="text-center text-gray-500 py-8">
                  No hay usuarios registrados aún
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}