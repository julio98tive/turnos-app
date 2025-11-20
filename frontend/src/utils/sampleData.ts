import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const sampleShifts = [
  {
    date: '2024-01-15',
    userName: 'Juan Pérez',
    email: 'juan@empresa.com',
    shiftType: 'mañana',
    role: 'agente',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    date: '2024-01-15', 
    userName: 'María García',
    email: 'maria@empresa.com',
    shiftType: 'tarde',
    role: 'ingeniero',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    date: '2024-01-16',
    userName: 'Carlos López',
    email: 'carlos@empresa.com', 
    shiftType: 'noche',
    role: 'agente',
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

export async function populateSampleData() {
  // VERIFICAR QUE DB NO SEA NULL
  if (!db) {
    console.error('❌ Firestore no está disponible');
    return false;
  }

  try {
    for (const shift of sampleShifts) {
      await addDoc(collection(db, 'shifts'), shift);
    }
    console.log('✅ Datos de prueba agregados exitosamente');
    return true;
  } catch (error) {
    console.error('❌ Error agregando datos de prueba:', error);
    return false;
  }
}