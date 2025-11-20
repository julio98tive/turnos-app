'use client';
import { useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar que estamos en el cliente y auth está disponible
    if (typeof window === 'undefined' || !auth) {
      setLoading(false);
      return;
    }

    console.log('🔄 useAuth: Configurando observer de autenticación...');

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('🎯 useAuth: Estado cambiado - Usuario:', user?.email);
      setUser(user);
      setLoading(false);
    });

    return () => {
      console.log('🧹 useAuth: Limpiando observer');
      unsubscribe();
    };
  }, []);

  return { user, loading };
}