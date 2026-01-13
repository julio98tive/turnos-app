
import type { UserProfile, Shift } from '../../types';
import { ShiftCalendar } from '../shifts/ShiftCalendar';
import { useMemo } from 'react';

export const UserDashboard = ({ currentUser, shifts, users }: { currentUser: UserProfile, shifts: Shift[], users: UserProfile[] }) => {

    const shiftsToDisplay = useMemo(() => {
        if (!currentUser || !users || !shifts) return [];

        // Los roles de Agente e Ingeniero solo deben ver los turnos de su propio rol.
        if (currentUser.role === 'AGENTE' || currentUser.role === 'INGENIERO') {
            const userIdsWithSameRole = users
                .filter(user => user.role === currentUser.role)
                .map(user => user.id);

            return shifts.filter(shift => userIdsWithSameRole.includes(shift.userId));
        }

        // Por defecto (o para otros roles si los hubiera), mostrar solo los turnos propios.
        return shifts.filter(shift => shift.userId === currentUser.id);

    }, [currentUser, shifts, users]);

    return (
        <div>
            <div className='bg-white p-4 rounded-lg shadow-md mb-6'>
                 <h3 className="text-xl font-bold">Dashboard de Empleado</h3>
                 <p className='text-gray-600'>Bienvenido, {currentUser.fullName || currentUser.email}</p>
                 <p className='text-gray-600'>Rol: {currentUser.role}</p>
            </div>

            <h4 className="text-lg font-bold mb-2">Calendario de Turnos de {currentUser.role}S</h4>
            <ShiftCalendar shifts={shiftsToDisplay} users={users} currentUser={currentUser} />
        </div>
    );
};
