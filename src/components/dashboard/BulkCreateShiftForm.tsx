
import { useState, FormEvent } from 'react';
import { db } from '../../firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { parse, ParseResult } from 'papaparse';
import type { UserProfile } from '../../types';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const BulkCreateShiftForm = ({ users = [] }: { users: UserProfile[] }) => {
    const [file, setFile] = useState<File | null>(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files ? e.target.files[0] : null;
        setError('');
        setSuccess('');
        if (selectedFile) {
            if (selectedFile.type !== 'text/csv') {
                setError('Error: El archivo debe tener formato CSV.');
                setFile(null);
            } else {
                setFile(selectedFile);
            }
        }
    };

    const handleBulkCreateShifts = (e: FormEvent) => {
        e.preventDefault();
        if (!file) {
            setError('Por favor, seleccione un archivo CSV para continuar.');
            return;
        }

        setIsLoading(true);
        setError('');
        setSuccess('');

        parse(file as any, {
            header: true,
            skipEmptyLines: true,
            // CAMBIO: Añadido el tipo de turno en el CSV
            complete: async (results: ParseResult<{ userId: string; fecha: string; turno: string }>) => {
                if (results.errors.length > 0) {
                    const errorMessages = results.errors.map(err => `Fila ${err.row}: ${err.message}`).join('\n- ');
                    setError(`Se encontraron errores al analizar el archivo CSV:\n- ${errorMessages}`);
                    setIsLoading(false);
                    return;
                }

                const shifts = results.data;
                let createdCount = 0;
                const errorMessages: string[] = [];

                for (const [index, shift] of shifts.entries()) {
                    const rowNum = index + 2;

                    if (!shift.userId || !shift.fecha) {
                        errorMessages.push(`Fila ${rowNum}: Faltan datos esenciales (email o fecha).`);
                        continue;
                    }

                    const user = users.find(u => u.email === shift.userId);
                    if (!user) {
                        errorMessages.push(`Fila ${rowNum}: Usuario con email '${shift.userId}' no encontrado.`);
                        continue;
                    }

                    if (!DATE_REGEX.test(shift.fecha)) {
                        errorMessages.push(`Fila ${rowNum}: El formato de fecha '${shift.fecha}' es inválido (debe ser YYYY-MM-DD).`);
                        continue;
                    }

                    let startDateTime: Date, endDateTime: Date;
                    let type: 'rotativo' | 'disponibilidad';

                    try {
                        const [year, month, day] = shift.fecha.split('-').map(Number);

                        if (user.role === 'INGENIERO') {
                            type = 'disponibilidad';
                             // 17:00 (5 PM) en Colombia es 22:00 en UTC. Date.UTC(año, mes-1, dia, hora, min)
                            startDateTime = new Date(Date.UTC(year, month - 1, day, 22, 0));

                            if (startDateTime.getUTCDay() !== 5) { // Viernes
                                errorMessages.push(`Fila ${rowNum}: La disponibilidad para ingenieros debe iniciar en viernes.`);
                                continue;
                            }
                            endDateTime = new Date(startDateTime.getTime() + 7 * 24 * 60 * 60 * 1000);

                        } else { // AGENTE
                            type = 'rotativo';
                            const shiftType = shift.turno?.toUpperCase().trim();

                            if (shiftType === 'DIA') {
                                // 6:00 AM Colombia es 11:00 UTC
                                startDateTime = new Date(Date.UTC(year, month - 1, day, 11, 0));
                                // 14:00 (2 PM) Colombia es 19:00 UTC
                                endDateTime = new Date(Date.UTC(year, month - 1, day, 19, 0));
                            } else if (shiftType === 'TARDE') {
                                 // 14:00 (2 PM) Colombia es 19:00 UTC
                                startDateTime = new Date(Date.UTC(year, month - 1, day, 19, 0));
                                // 22:00 (10 PM) Colombia es 03:00 UTC del día siguiente
                                endDateTime = new Date(Date.UTC(year, month - 1, day + 1, 3, 0));
                            } else {
                                errorMessages.push(`Fila ${rowNum}: Valor de 'turno' inválido para Agente. Debe ser DIA o TARDE.`);
                                continue;
                            }
                        }

                        if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
                           errorMessages.push(`Fila ${rowNum}: Fecha/hora inválida para '${shift.userId}'.`);
                           continue;
                        }

                        await addDoc(collection(db, 'shifts'), {
                            userId: user.uid,
                            role: user.role,
                            start: Timestamp.fromDate(startDateTime),
                            end: Timestamp.fromDate(endDateTime),
                            type,
                            source: 'BULK',
                            creationNotificationSent: false,
                            reminderNotificationSent: false
                        });
                        createdCount++;

                    } catch (err: any) {
                        errorMessages.push(`Fila ${rowNum}: Error al procesar: ${err.message}`);
                    }
                }

                if (errorMessages.length > 0) {
                    setError(`Errores en el archivo:\n- ${errorMessages.join('\n- ')}`);
                }
                if (createdCount > 0) {
                    setSuccess(`¡${createdCount} de ${shifts.length} turnos creados correctamente!`);
                }
                setIsLoading(false);
            }
        });
    };

    return (
        <form onSubmit={handleBulkCreateShifts} className="mt-4">
            {error && <p className="text-red-500 text-sm mb-2 whitespace-pre-wrap">{error}</p>}
            {success && <p className="text-green-500 text-sm mb-2">{success}</p>}
            <div className="flex flex-col space-y-4">
                <p className="text-sm text-gray-600">
                    Seleccione un archivo CSV para crear múltiples turnos. Descargue la plantilla para el formato correcto.
                </p>
                <input type="file" accept=".csv" onChange={handleFileChange} className="p-2 border rounded file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                <a href="/plantilla_turnos.csv" download className="text-blue-500 hover:underline">Descargar plantilla CSV</a>
                <button type="submit" className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:bg-gray-400 self-start" disabled={isLoading || !file}>
                    {isLoading ? 'Cargando...' : 'Crear Turnos desde CSV'}
                </button>
            </div>
        </form>
    );
};
