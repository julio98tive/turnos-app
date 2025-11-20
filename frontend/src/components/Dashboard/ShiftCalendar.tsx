'use client';
import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';

interface Shift {
  id: string;
  date: string;
  userName: string;
  email: string;
  shiftType: string;
  role: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function ShiftCalendar() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    const fetchShifts = async () => {
      // VERIFICAR QUE DB NO SEA NULL
      if (!db) {
        setError('Error de configuración de la base de datos');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');

        // Determinar el rol del usuario (en una app real, esto vendría de Firestore)
        const userRole = user?.email?.includes('admin') ? 'admin' : 'agente';
        
        let q;
        
        if (userRole === 'admin') {
          // Admin ve todos los turnos
          q = query(collection(db, 'shifts'), orderBy('date', 'desc'));
        } else if (userRole === 'agente') {
          // Agentes ven solo turnos de agentes
          q = query(
            collection(db, 'shifts'), 
            where('role', '==', 'agente'),
            orderBy('date', 'desc')
          );
        } else {
          // Ingenieros ven solo turnos de ingenieros
          q = query(
            collection(db, 'shifts'), 
            where('role', '==', 'ingeniero'),
            orderBy('date', 'desc')
          );
        }

        const querySnapshot = await getDocs(q);
        const shiftsData: Shift[] = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          shiftsData.push({
            id: doc.id,
            date: data.date,
            userName: data.userName,
            email: data.email,
            shiftType: data.shiftType,
            role: data.role,
            createdAt: data.createdAt?.toDate?.()?.toISOString(),
            updatedAt: data.updatedAt?.toDate?.()?.toISOString(),
          });
        });

        setShifts(shiftsData);
      } catch (err) {
        console.error('Error fetching shifts:', err);
        setError('Error al cargar los turnos');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchShifts();
    } else {
      setLoading(false);
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <span className="ml-2">Cargando turnos...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
          Calendario de Turnos
        </h3>
        
        {shifts.length === 0 ? (
          <p className="text-gray-500">No hay turnos programados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo de Turno
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rol
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {shifts.map((shift) => (
                  <tr key={shift.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(shift.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {shift.userName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {shift.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {shift.shiftType}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        shift.role === 'admin' 
                          ? 'bg-purple-100 text-purple-800'
                          : shift.role === 'ingeniero'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {shift.role}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}