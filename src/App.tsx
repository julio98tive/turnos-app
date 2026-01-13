
import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { collection, onSnapshot, query, doc, getDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile, Shift } from './types';
import { Login } from './components/auth/Login';
import { AdminDashboard } from './components/dashboard/AdminDashboard';
import { UserDashboard } from './components/dashboard/UserDashboard';

export const App = () => {
    const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [loading, setLoading] = useState(true);

    // 1. Manejo de autenticación
    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
            if (firebaseUser) {
                const userDocSnap = await getDoc(doc(db, 'users', firebaseUser.uid));
                if (userDocSnap.exists()) {
                    setCurrentUser({ uid: firebaseUser.uid, ...userDocSnap.data() } as UserProfile);
                } else { setCurrentUser(null); }
            } else { setCurrentUser(null); }
            setLoading(false);
        });
        return () => unsubscribeAuth();
    }, []);

    // 2. Carga de lista de usuarios
    useEffect(() => {
        if (!currentUser) {
            setUsers([]);
            return;
        }
        const unsubscribeUsers = onSnapshot(query(collection(db, 'users')),
            (snapshot) => setUsers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile))),
            (error) => console.error("Error al cargar usuarios:", error)
        );
        return () => unsubscribeUsers();
    }, [currentUser]);

    // 3. Carga de turnos con manejo de fechas robusto
    useEffect(() => {
        if (!currentUser) {
            setShifts([]);
            return;
        }
        
        const q = query(collection(db, 'shifts'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const processedShifts = snapshot.docs.map(doc => {
                const data = doc.data();
                
                let startStr: string | null = null;
                let endStr: string | null = null;

                // Manejar fecha de inicio (Timestamp o string)
                if (data.start?.toDate) { // Es un Timestamp de Firestore?
                    startStr = (data.start as Timestamp).toDate().toISOString();
                } else if (typeof data.start === 'string') { // Es un string?
                    const d = new Date(data.start);
                    if (!isNaN(d.getTime())) startStr = d.toISOString();
                }

                // Manejar fecha de fin (Timestamp o string)
                if (data.end?.toDate) { // Es un Timestamp de Firestore?
                    endStr = (data.end as Timestamp).toDate().toISOString();
                } else if (typeof data.end === 'string') { // Es un string?
                    const d = new Date(data.end);
                    if (!isNaN(d.getTime())) endStr = d.toISOString();
                }

                if (startStr && endStr && data.userId && data.type) {
                    return {
                        id: doc.id,
                        userId: data.userId,
                        start: startStr,
                        end: endStr,
                        type: data.type,
                    } as Shift;
                }
                
                console.warn(`Turno con ID: ${doc.id} fue omitido por formato de fecha inválido.`);
                return null;
            }).filter((s): s is Shift => s !== null);

            setShifts(processedShifts);
        }, (error) => {
            console.error("Error crítico al cargar los turnos:", error);
            setShifts([]);
        });

        return () => unsubscribe();
    }, [currentUser]);

    if (loading) {
        return <div className="flex justify-center items-center h-screen">Cargando...</div>;
    }

    return (
        <Router>
            <div className="min-h-screen bg-gray-100">
                <header className="bg-gray-800 text-white p-4 flex justify-between items-center">
                    <h1 className="text-xl font-bold">Gestor de Turnos</h1>
                    {currentUser && <button onClick={() => auth.signOut()} className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded">Cerrar Sesión</button>}
                </header>
                <main className="p-8">
                    <Routes>
                        <Route path="/login" element={!currentUser ? <Login /> : <Navigate to="/"/>} />
                        <Route path="/" element={currentUser ? (
                            currentUser.role === 'ADMIN' 
                                ? <AdminDashboard currentUser={currentUser} users={users} shifts={shifts} /> 
                                : <UserDashboard currentUser={currentUser} shifts={shifts} users={users} />
                        ) : <Navigate to="/login" />} />
                    </Routes>
                </main>
            </div>
        </Router>
    );
};
