
import type { UserProfile, Shift } from '../../types';
import { ShiftCalendar } from '../shifts/ShiftCalendar';

export const UserDashboard = ({ currentUser, shifts, users }: { currentUser: UserProfile, shifts: Shift[], users: UserProfile[] }) => {

    return (
        <div>
            <div className='bg-white p-4 rounded-lg shadow-md mb-6'>
                 <h3 className="text-xl font-bold">Dashboard de Empleado</h3>
                 <p className='text-gray-600'>Bienvenido, {currentUser.fullName || currentUser.email}</p>
                 <p className='text-gray-600'>Rol: {currentUser.role}</p>
            </div>

            <h4 className="text-lg font-bold mb-2">Mi Calendario de Turnos</h4>
            <ShiftCalendar shifts={shifts} users={users} currentUser={currentUser} />
        </div>
    );
};
