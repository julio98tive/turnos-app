import { useState, FormEvent, useMemo } from 'react';
import { db, functions } from '../../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import type { AppUser, Shift, Role } from '../../types';
import { ShiftCalendar } from '../shifts/ShiftCalendar';
import { isWeekendOrHoliday } from '../../utils/dateUtils';

const FormWrapper = ({ title, children, on_close }: { title: string, children: React.ReactNode, on_close: () => void }) => (
    <div className="bg-white p-4 rounded-lg shadow-md mb-6 relative">
        <button onClick={on_close} className="absolute top-2 right-2 text-xl font-bold text-gray-500 hover:text-gray-800">&times;</button>
        <h4 className="font-bold mb-4">{title}</h4>
        {children}
    </div>
);

const RegisterUserForm = ({ on_close }: { on_close: () => void }) => {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<Role>('AGENTE');
    const [formError, setFormError] = useState('');
    const [formSuccess, setFormSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleRegisterUser = async (e: FormEvent) => {
        e.preventDefault();
        setFormError('');
        setFormSuccess('');
        setIsLoading(true);

        if (!fullName || !email || !password) {
            setFormError('Por favor, complete todos los campos.');
            setIsLoading(false);
            return;
        }

        try {
            const registerUser = httpsCallable(functions, 'registerUser');
            await registerUser({ fullName, email, password, role });
            setFormSuccess(`¡Usuario ${fullName} registrado con éxito!`);
            setFullName('');
            setEmail('');
            setPassword('');
            setRole('AGENTE');
        } catch (err: any) {
            setFormError(err.message || "Ocurrió un error desconocido.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <FormWrapper title="Registrar Nuevo Usuario" on_close={on_close}>
            <form onSubmit={handleRegisterUser}>
                {formError && <p className="text-red-500 text-sm mb-2">{formError}</p>}
                {formSuccess && <p className="text-green-500 text-sm mb-2">{formSuccess}</p>}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                    <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Nombre Completo" className="p-2 border rounded" disabled={isLoading} />
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="p-2 border rounded" disabled={isLoading} />
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Contraseña (mín. 6 caracteres)" className="p-2 border rounded" disabled={isLoading} />
                    <select value={role} onChange={e => setRole(e.target.value as Role)} className="p-2 border rounded" disabled={isLoading}>
                        <option value="AGENTE">Agente</option>
                        <option value="INGENIERO">Ingeniero</option>
                        <option value="ADMIN">Administrador</option>
                    </select>
                </div>
                <button type="submit" className="bg-green-500 text-white p-2 rounded hover:bg-green-600 disabled:bg-gray-400 mt-2" disabled={isLoading}>
                    {isLoading ? 'Registrando...' : 'Registrar Usuario'}
                </button>
            </form>
        </FormWrapper>
    );
}

const CreateShiftForm = ({ users, on_close }: { users: AppUser[], on_close: () => void }) => {
    const [selectedUserId, setSelectedUserId] = useState<string>('');
    const [shiftDate, setShiftDate] = useState('');
    const [shiftType, setShiftType] = useState<'A' | 'B'>('A');
    const [error, setError] = useState('');

    const assignableUsers = useMemo(() => users.filter(u => u.role !== 'ADMIN'), [users]);
    const selectedUserRole = useMemo(() => users.find(u => u.uid === selectedUserId)?.role, [users, selectedUserId]);

    const handleCreateShift = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        if (!selectedUserId || !shiftDate) return setError('Por favor, complete todos los campos.');
        const selectedUser = users.find(u => u.uid === selectedUserId);
        if (!selectedUser) return setError('Usuario no encontrado.');
        
        const date = new Date(shiftDate + 'T00:00:00');
        let start: Date, end: Date;
        let type: 'rotativo' | 'disponibilidad';

        if (selectedUser.role === 'INGENIERO') {
            if (!isWeekendOrHoliday(date)) return setError('Los ingenieros solo pueden ser asignados en fines de semana o festivos.');
            start = new Date(date.setUTCHours(6, 0, 0, 0));
            end = new Date(date.setUTCHours(22, 0, 0, 0));
            type = 'disponibilidad';
        } else { // AGENTE
            type = 'rotativo';
            if (shiftType === 'A') {
                start = new Date(date.setUTCHours(6, 0, 0, 0));
                end = new Date(date.setUTCHours(14, 0, 0, 0));
            } else {
                start = new Date(date.setUTCHours(14, 0, 0, 0));
                end = new Date(date.setUTCHours(22, 0, 0, 0));
            }
        }
        
        try {
            await addDoc(collection(db, 'shifts'), { userId: selectedUser.uid, role: selectedUser.role, start, end, type });
            on_close(); // Close form on success
        } catch (err) { setError('No se pudo crear el turno.'); }
    };

    return (
        <FormWrapper title="Crear Nuevo Turno" on_close={on_close}>
            <form onSubmit={handleCreateShift}>
                {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <select value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)} className="p-2 border rounded">
                        <option value="">Seleccionar Empleado</option>
                        {assignableUsers.map(u => <option key={u.uid} value={u.uid}>{u.fullName} ({u.role})</option>)} 
                    </select>
                    <input type="date" value={shiftDate} onChange={e => setShiftDate(e.target.value)} className="p-2 border rounded"/>
                    
                    {selectedUserRole === 'AGENTE' && (
                        <select value={shiftType} onChange={e => setShiftType(e.target.value as 'A' | 'B')} className="p-2 border rounded">
                            <option value="A">Turno A (06:00 - 14:00)</option>
                            <option value="B">Turno B (14:00 - 22:00)</option>
                        </select>
                    )}
                    {selectedUserRole === 'INGENIERO' && (
                        <div className="p-2 bg-gray-100 rounded text-sm flex items-center justify-center">Disponibilidad (On-call)</div>
                    )}
                </div>
                <button type="submit" className="mt-4 bg-blue-500 text-white p-2 rounded hover:bg-blue-600">Crear Turno</button>
            </form>
        </FormWrapper>
    );
}


export const AdminDashboard = ({ users, shifts }: { currentUser: AppUser, users: AppUser[], shifts: Shift[] }) => {
    const [visibleForm, setVisibleForm] = useState<'REGISTER' | 'CREATE_SHIFT' | null>(null);

    return (
        <div>
            <h3 className="text-xl font-bold mb-4">Dashboard Administrador</h3>

            {/* Action Buttons */}
            <div className="bg-white p-4 rounded-lg shadow-md mb-6 flex space-x-4">
                 <button onClick={() => setVisibleForm('CREATE_SHIFT')} className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600 flex-1">
                    + Crear Nuevo Turno
                </button>
                <button onClick={() => setVisibleForm('REGISTER')} className="bg-green-500 text-white p-2 rounded hover:bg-green-600 flex-1">
                    + Registrar Nuevo Usuario
                </button>
            </div>

            {/* Conditionally Rendered Forms */}
            {visibleForm === 'REGISTER' && <RegisterUserForm on_close={() => setVisibleForm(null)} />}
            {visibleForm === 'CREATE_SHIFT' && <CreateShiftForm users={users} on_close={() => setVisibleForm(null)} />}
            
            {/* The Calendar is always visible */}
            <h4 className="font-bold mb-2 mt-6">Calendario de Turnos</h4>
            <ShiftCalendar shifts={shifts} />
        </div>
    );
};
