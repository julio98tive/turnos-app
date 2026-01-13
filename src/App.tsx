
import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
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

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
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
                }
            } else {
                setCurrentUser(null); 
            }
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            if (!currentUser) return; 

            setIsLoading(true);
            setError(null);

            try {
                const [usersSnapshot, shiftsSnapshot] = await Promise.all([
                    getDocs(collection(db, 'users')),
                    getDocs(collection(db, 'shifts'))
                ]);

                // CORRECCIÓN: Aseguramos que cada usuario tenga `id` y `uid`.
                const usersList = usersSnapshot.docs.map(doc => ({
                    ...doc.data(),
                    id: doc.id,
                    uid: doc.id, // Esta línea es la corrección clave
                } as UserProfile));
                setUsers(usersList);

                const shiftsList = shiftsSnapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        ...data,
                        id: doc.id,
                        start: data.start.toDate(),
                        end: data.end.toDate(),
                    } as Shift;
                });
                setShifts(shiftsList);

            } catch (err: any) {
                console.error("Error crítico al cargar los datos:", err);
                setError(`Se produjo un error al cargar los datos del dashboard: ${err.message}`);
            } finally {
                setIsLoading(false);
            }
        };

        if (currentUser) {
            fetchData();
        }
         else {
            setIsLoading(false);
        }

    }, [currentUser]);

    const handleLogout = async () => {
        await auth.signOut();
    };

    if (isLoading) {
        return <div>Cargando...</div>; 
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
