import type { UserProfile, Shift } from "../../types"; // CORREGIDO

export const ShiftList = ({ shifts, users }: { shifts: Shift[], users: UserProfile[] }) => { // CORREGIDO
    const userMap = new Map(users.map(u => [u.uid, u.email]));

    return (
        <div className="bg-white p-4 rounded-lg shadow-md">
            <ul className="space-y-3">
                {shifts.length > 0 ? shifts.map(shift => {
                    const start = new Date(shift.start);
                    const end = new Date(shift.end);
                    
                    return (
                        <li key={shift.id} className="p-3 bg-gray-50 rounded-md border">
                            <p><strong>Empleado:</strong> {userMap.get(shift.userId) || shift.userId}</p>
                            <p><strong>Fecha:</strong> {start.toLocaleDateString()}</p>
                            <p><strong>Horario:</strong> {start.toLocaleTimeString()} - {end.toLocaleTimeString()}</p>
                            <p><strong>Tipo:</strong> <span className={`capitalize px-2 py-1 text-xs rounded-full ${shift.type === 'rotativo' ? 'bg-green-200 text-green-800' : 'bg-yellow-200 text-yellow-800'}`}>{shift.type}</span></p>
                        </li>
                    );
                }) : <p>No hay turnos para mostrar.</p>}
            </ul>
        </div>
    );
};
