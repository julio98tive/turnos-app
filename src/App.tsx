
import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, onSnapshot, Unsubscribe } from 'firebase/firestore'; // 1. Importar onSnapshot
import { auth, db } from './firebase';
import type { UserProfile, Shift } from './types';
import { Login } from './components/auth/Login';
import { AdminDashboard } from './components/dashboard/AdminDashboard';
import { UserDashboard } from './components/dashboard/UserDashboard';

export const App = () => {
    const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Este useEffect para la autenticación no cambia
    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    const userDocRef = doc(db, 'users', user.uid);
                    const userDoc = await getDoc(userDocRef);

                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        const userProfile: UserProfile = {
                            ...userData,
                            uid: user.uid,
                            id: user.uid, 
                            role: userData.role || 'SIN_ROL', 
                            fullName: userData.fullName,
                            email: userData.email,
                        };
                        setCurrentUser(userProfile);
                    } else {
                        setError("El perfil de usuario no existe en la base de datos.");
                        setCurrentUser(null); 
                    }
                } catch (err) {
                    console.error("Error al obtener el perfil de usuario:", err);
                    setError("No se pudo cargar el perfil del usuario.");
                    setCurrentUser(null);
                } finally {
                  // Solo deja de cargar cuando el usuario está resuelto
                  setIsLoading(false);
                }
            } else {
                setCurrentUser(null); 
                setIsLoading(false); // Deja de cargar si no hay usuario
            }
        });

        return () => unsubscribeAuth();
    }, []);

    // 2. useEffect modificado para escuchar en tiempo real
    useEffect(() => {
        if (!currentUser) {
            // Si no hay usuario, limpiamos los datos para evitar mostrar datos antiguos al hacer logout
            setUsers([]);
            setShifts([]);
            return;
        }

        setError(null);

        // Suscripción a la colección 'users'
        const unsubscribeUsers: Unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
            const usersList = snapshot.docs.map(doc => ({
                ...doc.data(),
                id: doc.id,
                uid: doc.id,
            } as UserProfile));
            setUsers(usersList);
        }, (err: any) => {
            console.error("Error al escuchar la colección de usuarios:", err);
            setError(`Error al cargar usuarios: ${err.message}`);
        });

        // Suscripción a la colección 'shifts'
        const unsubscribeShifts: Unsubscribe = onSnapshot(collection(db, 'shifts'), (snapshot) => {
            const shiftsList = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    ...data,
                    id: doc.id,
                    start: data.start.toDate(),
                    end: data.end.toDate(),
                } as Shift;
            });
            setShifts(shiftsList);
        }, (err: any) => {
            console.error("Error al escuchar la colección de turnos:", err);
            setError(`Error al cargar turnos: ${err.message}`);
        });

        // 3. Función de limpieza que se ejecuta cuando el usuario hace logout
        return () => {
            unsubscribeUsers();
            unsubscribeShifts();
        };

    }, [currentUser]); // Se ejecuta cada vez que 'currentUser' cambia

    const handleLogout = async () => {
        await auth.signOut();
    };

    if (isLoading) {
        return <div className="flex justify-center items-center min-h-screen">Cargando...</div>; 
    }

    return (
        <Router>
            <div className="min-h-screen bg-gray-100 text-gray-800">
                {currentUser && (
                    <header className="bg-white shadow-md">
                        <nav className="container mx-auto px-6 py-3 flex justify-between items-center">
                            <h1 className="text-xl font-bold text-blue-600">Gestor de Turnos</h1>
                            <button 
                                onClick={handleLogout} 
                                className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition duration-300">
                                Cerrar Sesión
                            </button>
                        </nav>
                    </header>
                )}

                <main className="container mx-auto px-6 py-8">
                    {error && <p className="text-red-500 bg-red-100 p-4 rounded-md mb-6">Error: {error}</p>}
                    <Routes>
                        <Route path="/login" element={!currentUser ? <Login /> : <Navigate to="/" />} />
                        <Route 
                            path="/" 
                            element={
                                !currentUser ? (
                                    <Navigate to="/login" />
                                ) : (
                                    currentUser.role === 'ADMIN' ? 
                                    <AdminDashboard currentUser={currentUser} users={users} shifts={shifts} /> :
                                    <UserDashboard currentUser={currentUser} users={users} shifts={shifts} />
                                )
                            }
                        />
                    </Routes>
                </main>
            </div>
        </Router>
    );
};
