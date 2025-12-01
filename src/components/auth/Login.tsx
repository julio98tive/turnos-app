import { useState, useEffect, FormEvent } from 'react';
import { auth, db } from '../../firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc,
  getDocs,
  query,
  limit
} from 'firebase/firestore';
import type { Role } from '../../types';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('AGENTE');
  const [error, setError] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [isFirstUser, setIsFirstUser] = useState<boolean | null>(null);

  useEffect(() => {
    if (isRegister && isFirstUser === null) {
      const checkUsers = async () => {
        const usersRef = collection(db, "users");
        const q = query(usersRef, limit(1));
        const snapshot = await getDocs(q);
        const noUsersExist = snapshot.empty;
        setIsFirstUser(noUsersExist);
        if (noUsersExist) {
          setRole('ADMIN'); // Default to ADMIN if no users exist
        } else {
          setRole('AGENTE'); // Default to AGENTE otherwise
        }
      };
      checkUsers();
    }
  }, [isRegister, isFirstUser]);


  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isRegister) {
        // Re-check just before creation to prevent race conditions
        const usersRef = collection(db, "users");
        const q = query(usersRef, limit(1));
        const snapshot = await getDocs(q);
        const finalRole = snapshot.empty ? 'ADMIN' : role;
        
        if (!snapshot.empty && finalRole === 'ADMIN') {
            setError("El rol de Administrador ya ha sido asignado.");
            return;
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        // Save user role in Firestore
        await setDoc(doc(db, "users", user.uid), {
          email: user.email,
          role: finalRole
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="p-8 bg-white rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">{isRegister ? 'Registrarse' : 'Iniciar Sesión'}</h2>
        <form onSubmit={handleSubmit}>
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full p-2 mb-4 border rounded"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña"
            className="w-full p-2 mb-4 border rounded"
            required
          />
          {isRegister && isFirstUser !== null && (
            <div>
              <p className='text-sm text-gray-600 mb-2'>Seleccione su rol:</p>
              {isFirstUser ? (
                 <p className='p-2 w-full bg-green-100 text-green-800 border rounded'>Usted será registrado como <strong>ADMINISTRADOR</strong>.</p>
              ) : (
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                  className="w-full p-2 mb-4 border rounded"
                >
                  <option value="AGENTE">Agente</option>
                  <option value="INGENIERO">Ingeniero</option>
                </select>
              )}
            </div>
          )}
          <button type="submit" className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600">
            {isRegister ? 'Registrarse' : 'Entrar'}
          </button>
        </form>
        <button onClick={() => { setIsRegister(!isRegister); setIsFirstUser(null); }} className="mt-4 text-sm text-center w-full">
          {isRegister ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
        </button>
      </div>
    </div>
  );
};
