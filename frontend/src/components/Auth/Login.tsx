'use client';
import { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { user } = useAuth();

  // 🔥 REDIRECCIÓN AUTOMÁTICA SI YA ESTÁ AUTENTICADO
  useEffect(() => {
    if (user) {
      console.log('✅ Login: Usuario ya autenticado, redirigiendo...');
      router.push('/dashboard');
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!auth) {
      setError('Error de configuración. Por favor, recarga la página.');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      console.log('🔐 Intentando login con:', email);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('✅ Login exitoso:', userCredential.user.email);
      
      // La redirección se manejará automáticamente por el useEffect de arriba
      // o por el hook useAuth en otros componentes
      
    } catch (error: any) {
      console.error('❌ Error de autenticación:', error);
      switch (error.code) {
        case 'auth/invalid-email':
          setError('El formato del email es inválido.');
          break;
        case 'auth/user-not-found':
          setError('No existe una cuenta con este email.');
          break;
        case 'auth/wrong-password':
          setError('La contraseña es incorrecta.');
          break;
        case 'auth/too-many-requests':
          setError('Demasiados intentos fallidos. Intenta más tarde.');
          break;
        default:
          setError('Error de autenticación. Por favor, intenta nuevamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdmin = async () => {
    if (!window.confirm("¿Estás seguro de crear un usuario administrador?")) return;
    
    if (!auth) {
      setError('Error de configuración. Por favor, recarga la página.');
      return;
    }

    setLoading(true);
    const adminEmail = "admin@turnos.com";
    const adminPassword = "Admin123!";
    
    try {
      console.log('👑 Creando usuario admin...');
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        adminEmail, 
        adminPassword
      );
      
      await updateProfile(userCredential.user, {
        displayName: "Administrador"
      });

      console.log('✅ Admin creado exitosamente');
      alert("✅ Usuario administrador creado exitosamente");
      
      // Autologin después de crear el admin
      setEmail(adminEmail);
      setPassword(adminPassword);
      
      // Intentar login automático
      await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
      
    } catch (error: any) {
      console.error('❌ Error creando admin:', error);
      if (error.code === 'auth/email-already-in-use') {
        setError('El usuario admin ya existe. Usa: admin@turnos.com / Admin123!');
        
        // Si ya existe, intentar login automático
        try {
          await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
        } catch (loginError) {
          setError('Usuario admin existe pero contraseña puede ser diferente.');
        }
      } else {
        setError('Error creando usuario admin: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Si ya está autenticado, mostrar loading
  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Redirigiendo al dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Iniciar Sesión
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sistema de Gestión de Turnos
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="alert alert-error">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <input
                type="email"
                required
                className="form-input"
                placeholder="Correo electrónico"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                className="form-input pr-10"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                {showPassword ? '👁️' : '🔒'}
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <button
              type="submit"
              disabled={loading || !auth}
              className="btn btn-primary w-full"
            >
              {loading ? 'Procesando...' : 'Iniciar Sesión'}
            </button>

            <button
              type="button"
              onClick={handleCreateAdmin}
              disabled={loading}
              className="btn btn-outline w-full"
            >
              {loading ? 'Creando...' : 'Crear Usuario Admin'}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => router.push('/register')}
              className="text-indigo-600 hover:text-indigo-500 text-sm font-medium"
              disabled={loading}
            >
              ¿No tienes cuenta? Regístrate aquí
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}