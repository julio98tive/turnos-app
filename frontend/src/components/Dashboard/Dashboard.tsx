'use client';
import { User } from 'firebase/auth';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import ShiftCalendar from '@/components/Dashboard/ShiftCalendar';
import AdminPanel from '@/components/Admin/AdminPanel';
import { useAuth } from '@/hooks/useAuth';

interface DashboardProps {
  user: User;
}

export default function Dashboard({ user }: DashboardProps) {
  const router = useRouter();
  const { user: currentUser } = useAuth();

  const handleLogout = async () => {
    if (!auth) {
      console.error('Auth no está disponible');
      return;
    }

    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const isAdmin = user?.email?.includes('admin') || user?.email === 'admin@turnos.com';

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600">
                Bienvenido, {user.email} 
                {isAdmin && <span className="ml-2 bg-red-100 text-red-800 px-2 py-1 rounded text-sm">Admin</span>}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="btn btn-danger"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 space-y-6">
          {/* Panel de Admin */}
          {isAdmin && (
            <div className="bg-white rounded-lg shadow">
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-4">Panel de Administración</h2>
                <AdminPanel />
              </div>
            </div>
          )}

          {/* Calendario de Turnos */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">Calendario de Turnos</h2>
              <ShiftCalendar />
            </div>
          </div>

          {/* Información del Usuario */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">Información de la Cuenta</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p><strong>Email:</strong> {user.email}</p>
                  <p><strong>UID:</strong> {user.uid}</p>
                  <p><strong>Proveedor:</strong> {user.providerData[0]?.providerId}</p>
                </div>
                <div>
                  <p><strong>Verificado:</strong> {user.emailVerified ? 'Sí' : 'No'}</p>
                  <p><strong>Último acceso:</strong> {new Date(user.metadata.lastSignInTime!).toLocaleString()}</p>
                  <p><strong>Cuenta creada:</strong> {new Date(user.metadata.creationTime!).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}