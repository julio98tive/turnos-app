
import { useState, FormEvent, useMemo } from 'react';
import { db, functions } from '../../firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import type { UserProfile, Shift, Role } from '../../types';
import { ShiftCalendar } from '../shifts/ShiftCalendar';
import { resetAdminPassword } from '../../utils/resetAdminPassword';
import { BulkCreateShiftForm } from './BulkCreateShiftForm';

// --- Componentes de UI Wrapper y Registro de Usuario (sin cambios) ---
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
        setIsLoading(true);
        setFormError('');
        setFormSuccess('');
        if (!fullName || !email || !password) {
            setFormError('Por favor, complete todos los campos.');
            setIsLoading(false);
            return;
        }
        try {
            const registerUser = httpsCallable(functions, 'registerUser');
            await registerUser({ fullName, email, password, role });
            setFormSuccess(`¡Usuario ${fullName} registrado con éxito!`);
            setFullName(''); setEmail(''); setPassword(''); setRole('AGENTE');
        } catch (err: any) { setFormError(err.message || "Ocurrió un error desconocido."); }
        finally { setIsLoading(false); }
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

// --- FIN de Componentes sin cambios ---

const CreateShiftForm = ({ users = [] }: { users: UserProfile[] }) => {
    const [selectedUserId, setSelectedUserId] = useState<string>('');
    const [shiftDate, setShiftDate] = useState('');
    const [shiftType, setShiftType] = useState<'DIA' | 'TARDE'>('DIA'); // Cambiado a DIA/TARDE
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const assignableUsers = useMemo(() => users.filter(u => u.role !== 'ADMIN'), [users]);
    const selectedUser = useMemo(() => users.find(u => u.uid === selectedUserId), [users, selectedUserId]);

    const handleCreateShift = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setSuccess('');
        if (!selectedUserId || !shiftDate || !selectedUser) {
            setError('Por favor, complete todos los campos.');
            setIsLoading(false);
            return;
        }

        let startDateTime: Date, endDateTime: Date;
        let type: 'rotativo' | 'disponibilidad';

        try {
            const [year, month, day] = shiftDate.split('-').map(Number);

            if (selectedUser.role === 'INGENIERO') {
                type = 'disponibilidad';
                // 17:00 (5 PM) en Colombia es 22:00 en UTC. Date.UTC(año, mes-1, dia, hora, min)
                startDateTime = new Date(Date.UTC(year, month - 1, day, 22, 0));

                if (startDateTime.getUTCDay() !== 5) { // Viernes
                    setError('La disponibilidad del ingeniero debe iniciar un viernes.');
                    setIsLoading(false);
                    return;
                }
                endDateTime = new Date(startDateTime.getTime() + 7 * 24 * 60 * 60 * 1000);

            } else { // AGENTE
                type = 'rotativo';
                if (shiftType === 'DIA') {
                    // 6:00 AM Colombia es 11:00 UTC
                    startDateTime = new Date(Date.UTC(year, month - 1, day, 11, 0));
                    // 14:00 (2 PM) Colombia es 19:00 UTC
                    endDateTime = new Date(Date.UTC(year, month - 1, day, 19, 0));
                } else { // TARDE
                    // 14:00 (2 PM) Colombia es 19:00 UTC
                    startDateTime = new Date(Date.UTC(year, month - 1, day, 19, 0));
                    // 22:00 (10 PM) Colombia es 03:00 UTC del día siguiente
                    endDateTime = new Date(Date.UTC(year, month - 1, day + 1, 3, 0));
                }
            }

            await addDoc(collection(db, 'shifts'), {
                userId: selectedUser.uid,
                role: selectedUser.role,
                start: Timestamp.fromDate(startDateTime),
                end: Timestamp.fromDate(endDateTime),
                type,
                source: 'SINGLE',
                creationNotificationSent: false,
                reminderNotificationSent: false,
            });

            setSuccess('¡Turno creado con éxito!');
            setSelectedUserId('');
            setShiftDate('');

        } catch (err: any) {
            console.error("Error al crear el turno: ", err);
            setError(`No se pudo crear el turno: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleCreateShift} className="mt-4">
            {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
            {success && <p className="text-green-500 text-sm mb-2">{success}</p>}
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <select value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)} className="p-2 border rounded" disabled={isLoading}>
                    <option value="">Seleccionar Empleado</option>
                    {assignableUsers.map(u => <option key={u.uid} value={u.uid}>{u.fullName} ({u.role})</option>)}
                </select>
                <input type="date" value={shiftDate} onChange={e => setShiftDate(e.target.value)} className="p-2 border rounded" placeholder="Fecha de Inicio" disabled={isLoading}/>

                {selectedUser?.role === 'AGENTE' && (
                    <select value={shiftType} onChange={e => setShiftType(e.target.value as 'DIA' | 'TARDE')} className="p-2 border rounded" disabled={isLoading}>
                        <option value="DIA">Turno DÍA (6:00 - 14:00)</option>
                        <option value="TARDE">Turno TARDE (14:00 - 22:00)</option>
                    </select>
                )}
                {selectedUser?.role === 'INGENIERO' && (
                    <div className="p-2 bg-gray-100 rounded text-sm flex items-center justify-center">Inicia Viernes 17:00</div>
                )}
            </div>
            <button type="submit" className="mt-4 bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:bg-gray-400" disabled={isLoading}>
                {isLoading ? 'Creando...' : 'Crear Turno'}
            </button>
        </form>
    );
}

const CreateShiftSection = ({ users = [], on_close }: { users: UserProfile[], on_close: () => void }) => {
    const [activeTab, setActiveTab] = useState<'INDIVIDUAL' | 'BULK'>('INDIVIDUAL');

    return (
        <FormWrapper title="Crear Turnos" on_close={on_close}>
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('INDIVIDUAL')}
                        className={`${activeTab === 'INDIVIDUAL' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                        Individual
                    </button>
                    <button
                        onClick={() => setActiveTab('BULK')}
                        className={`${activeTab === 'BULK' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                        Carga Masiva (CSV)
                    </button>
                </nav>
            </div>
            {activeTab === 'INDIVIDUAL' && <CreateShiftForm users={users} />}
            {activeTab === 'BULK' && <BulkCreateShiftForm users={users} />}
        </FormWrapper>
    );
};

export const AdminDashboard = ({ users = [], shifts = [], currentUser }: { currentUser: UserProfile, users: UserProfile[], shifts: Shift[] }) => {
    const [visibleForm, setVisibleForm] = useState<'REGISTER' | 'CREATE_SHIFT' | null>(null);

    if (!users || !shifts) {
        return <div>Cargando Dashboard...</div>;
    }

    const handleResetClick = () => {
        if (window.confirm("¿Estás seguro de que quieres restablecer la contraseña de la cuenta 'admin@turnos.com'? Esta acción no se puede deshacer.")) {
            resetAdminPassword();
        }
    };

    return (
        <div>
            <h3 className="text-xl font-bold mb-4">Dashboard Administrador</h3>

            <div className="bg-white p-4 rounded-lg shadow-md mb-6 flex flex-wrap gap-4">
                 <button onClick={() => setVisibleForm('CREATE_SHIFT')} className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600 flex-grow">
                    + Crear Turnos
                </button>
                <button onClick={() => setVisibleForm('REGISTER')} className="bg-green-500 text-white p-2 rounded hover:bg-green-600 flex-grow">
                    + Registrar Nuevo Usuario
                </button>
                <button onClick={handleResetClick} className="bg-red-500 text-white p-2 rounded hover:bg-red-600 flex-grow">
                    Restablecer Contraseña Admin
                </button>
            </div>

            {visibleForm === 'REGISTER' && <RegisterUserForm on_close={() => setVisibleForm(null)} />}
            {visibleForm === 'CREATE_SHIFT' && <CreateShiftSection users={users} on_close={() => setVisibleForm(null)} />}
            
            <h4 className="font-bold mb-2 mt-6">Calendario de Turnos</h4>
            <ShiftCalendar shifts={shifts} users={users} currentUser={currentUser} />
        </div>
    );
};