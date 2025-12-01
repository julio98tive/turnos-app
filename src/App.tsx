import { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import type { AppUser, Shift } from './types';
import { Login } from './components/auth/Login';
import { AdminDashboard } from './components/dashboard/AdminDashboard';
import { UserDashboard } from './components/dashboard/UserDashboard';

function App() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        const userRef = doc(db, 'users', firebaseUser.uid);
        const unsubscribeProfile = onSnapshot(userRef, (doc) => {
          if (doc.exists()) {
            setUser({ 
                uid: doc.id, 
                fullName: doc.data().fullName, // Add fullName here
                ...doc.data() 
            } as AppUser);
          } else {
            setUser(null);
          }
          setLoading(false);
        });
        return () => unsubscribeProfile();
      } else {
        setUser(null);
        setAllUsers([]);
        setShifts([]);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      const usersQuery = query(collection(db, 'users'));
      const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
        const usersData = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as AppUser));
        setAllUsers(usersData);
      });
      return () => unsubscribeUsers();
    } else {
        setAllUsers([]);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    let shiftsQuery;
    if (user.role === 'ADMIN') {
        shiftsQuery = query(collection(db, 'shifts'));
    } else {
        shiftsQuery = query(collection(db, 'shifts'), where('userId', '==', user.uid));
    }

    const unsubscribeShifts = onSnapshot(shiftsQuery, (snapshot) => {
      const shiftsData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            start: data.start.toDate(),
            end: data.end.toDate(),
        } as Shift;
       }).sort((a,b) => a.start.getTime() - b.start.getTime());

      if (user.role === 'ADMIN' && allUsers.length > 0) {
         const enrichedShifts = shiftsData.map(shift => {
            const shiftUser = allUsers.find(u => u.uid === shift.userId);
            return {
                ...shift, 
                userEmail: shiftUser?.email || 'Desconocido',
                userFullName: shiftUser?.fullName || shiftUser?.email || 'Desconocido' // Add fullName
            };
         });
         setShifts(enrichedShifts);
      } else {
        setShifts(shiftsData);
      }
    });

    return () => unsubscribeShifts();
  }, [user, allUsers]);

  const handleLogout = () => {
    signOut(auth);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><p>Cargando...</p></div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
       <nav className="bg-white shadow-md w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
                <h1 className="text-lg font-bold">Turnos Rotativos App</h1>
                {user && <button onClick={handleLogout} className="bg-red-500 text-white p-2 rounded hover:bg-red-600">Cerrar Sesión</button>}
            </div>
        </div>
    </nav>
    <main className="p-8">
       {user ? (
         user.role === 'ADMIN'
           ? <AdminDashboard currentUser={user} users={allUsers} shifts={shifts} />
           : <UserDashboard currentUser={user} shifts={shifts} />
       ) : (
         <Login />
       )}
    </main>
    </div>
  );
}

export default App;
