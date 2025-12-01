import type { AppUser, Shift } from '../../types';
import { ShiftCalendar } from '../shifts/ShiftCalendar';

export const UserDashboard = ({ currentUser, shifts }: { currentUser: AppUser, shifts: Shift[] }) => {
    // The query in App.tsx already filters shifts for non-admin users,
    // so we can use the shifts prop directly.

    return (
        <div>
            <div className='bg-white p-4 rounded-lg shadow-md mb-6'>
                 <h3 className="text-xl font-bold">Dashboard de Empleado</h3>
                 {/* Use fullName for a personalized welcome message */}
                 <p className='text-gray-600'>Bienvenido, {currentUser.fullName || currentUser.email}</p>
                 <p className='text-gray-600'>Rol: {currentUser.role}</p>
            </div>

            <h4 className="text-lg font-bold mb-2">Mi Calendario de Turnos</h4>
            <ShiftCalendar shifts={shifts} />
        </div>
    );
};
