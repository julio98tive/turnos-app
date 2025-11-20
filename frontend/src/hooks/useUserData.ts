'use client';
import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User } from 'firebase/auth';

interface UserData {
  role: string;
  name: string;
  email: string;
  isActive: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export function useUserData(user: User | null) {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUserData = async () => {
      // VERIFICAR QUE DB Y USER NO SEAN NULL
      if (!db || !user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');

        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data() as UserData);
        } else {
          setError('No se encontraron datos del usuario');
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
        setError('Error al cargar los datos del usuario');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

  return { userData, loading, error };
}