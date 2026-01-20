
import React, { useMemo, useState, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import { EventContentArg, EventClickArg, EventMountArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import { db } from '../../firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import { getColombianHolidaysForYear } from '../../utils/dateUtils';
import type { UserProfile, Shift } from '../../types';

// --- Tipos y Constantes ---
const INGENIERO_COLOR = '#22c55e';
const FESTIVO_COLOR = '#fef3c7';
interface CalendarEvent { id: string; title: string; start: string; end?: string; allDay?: boolean; backgroundColor?: string; borderColor?: string; textColor?: string; display?: string; extendedProps: CalendarEventExtendedProps; }
interface CalendarEventExtendedProps { userId: string; type: 'rotativo' | 'disponibilidad'; userName: string; originalId: string; originalStart: string; originalEnd: string; }
interface ModalData { id: string; title: string; start: string; end: string; extendedProps: CalendarEventExtendedProps; }
interface ShiftCalendarProps { shifts?: Shift[]; users?: UserProfile[]; currentUser: UserProfile; }

// --- Función Auxiliar ---
const toBogotaLocalISOString = (date: Date): string => {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Bogota',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    }).formatToParts(date);
    const partMap = parts.reduce((acc, part) => { acc[part.type] = part.value; return acc; }, {} as Record<string, string>);
    const hour = partMap.hour === '24' ? '00' : partMap.hour;
    return `${partMap.year}-${partMap.month}-${partMap.day}T${hour}:${partMap.minute}:${partMap.second}`;
};

// --- Componente Modal (CORREGIDO) ---
const ShiftDetailModal = ({ event, onClose, onDelete, currentUser }: { event: ModalData; onClose: () => void; onDelete: (shiftId: string) => void; currentUser: UserProfile; }) => {
    const { type } = event.extendedProps;
    const formatToLocal = (dateString: string, options: Intl.DateTimeFormatOptions) => {
        if (!dateString) return 'Fecha inválida';
        return new Date(dateString).toLocaleString('es-CO', options);
    };
    const schedule = type === 'disponibilidad'
        ? `Del ${formatToLocal(event.start, { day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Bogota' })} al ${formatToLocal(event.end, { day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Bogota' })}`
        : `${formatToLocal(event.start, { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Bogota' })} - ${formatToLocal(event.end, { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Bogota' })}`;
    const handleDelete = () => { if (window.confirm(`¿Está seguro de que desea eliminar este turno?`)) onDelete(event.id); };
    const canDelete = currentUser.role === 'ADMIN';
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                <div className="flex justify-between items-start"><h4 className="font-bold text-xl mb-4">{event.title}</h4><button onClick={onClose} className="text-2xl font-bold text-gray-500 hover:text-gray-800">&times;</button></div>
                <p><strong className="font-semibold">Tipo:</strong> {type === 'disponibilidad' ? 'Disponibilidad Semanal' : 'Rotativo'}</p>
                <p className="mt-2"><strong className="font-semibold">Periodo:</strong></p>
                <p>{schedule}</p>
                <div className="flex space-x-2 mt-6"><button onClick={onClose} className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 w-full">Cerrar</button>{canDelete && (<button onClick={handleDelete} className="bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600 w-full">Eliminar Turno</button>)}</div>
            </div>
        </div>
    );
};

// --- Renderizador de Eventos (Sin cambios) ---
const renderEventContent = (eventInfo: EventContentArg) => {
    if (eventInfo.event.display === 'background') return null;
    let timeText = eventInfo.timeText;
    if (eventInfo.view.type === 'dayGridMonth' && !eventInfo.event.allDay && eventInfo.event.start && eventInfo.event.end) {
        const timeFormat: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' };
        const startTime = eventInfo.event.start.toLocaleTimeString('en-GB', timeFormat);
        const endTime = eventInfo.event.end.toLocaleTimeString('en-GB', timeFormat);
        timeText = `${startTime} - ${endTime}`;
    }
    return (
        <div className="fc-event-title-container">
            <div className="fc-event-title-name">{eventInfo.event.title}</div>
            {timeText && <div className="fc-event-title-time">{timeText}</div>}
        </div>
    );
};


// --- Componente Principal del Calendario ---
export const ShiftCalendar: React.FC<ShiftCalendarProps> = ({ shifts = [], users = [], currentUser }) => {
    const [selectedEvent, setSelectedEvent] = useState<ModalData | null>(null);
    const [viewedYear, setViewedYear] = useState(new Date().getFullYear());
    const calendarRef = useRef<FullCalendar>(null);

    const userNameByUid = useMemo(() => new Map(users.map(user => [user.uid, user.fullName])), [users]);
    const userRoleByUid = useMemo(() => new Map(users.map(user => [user.uid, user.role])), [users]);

    const holidayEvents: CalendarEvent[] = useMemo(() => getColombianHolidaysForYear(viewedYear).map((holidayDate, index) => ({
        id: `holiday-${viewedYear}-${index}`,
        title: 'Festivo',
        start: holidayDate, allDay: true, display: 'background',
        backgroundColor: FESTIVO_COLOR,
        extendedProps: { userId: '-', type: 'rotativo', userName: 'Festivo', originalId: `holiday-${viewedYear}-${index}`, originalStart: '', originalEnd: '' },
    })), [viewedYear]);

    // --- Procesador de Eventos (SOLUCIÓN FINAL RESTAURADA Y CORREGIDA) ---
    const shiftEvents: CalendarEvent[] = useMemo(() => {
        if (!shifts || !users || !currentUser) return [];
        const visibleShifts = shifts.filter(shift => {
            if (currentUser.role === 'ADMIN') return true;
            const shiftUserRole = userRoleByUid.get(shift.userId);
            return shiftUserRole === currentUser.role;
        });

        return visibleShifts.flatMap((shift): CalendarEvent[] => {
            const { id, userId, start, end, type } = shift;
            const userName = userNameByUid.get(userId) || 'Usuario Desconocido';

            const startDate = (start as any).toDate ? (start as any).toDate() : new Date(start);
            const endDate = (end as any).toDate ? (end as any).toDate() : new Date(end);

            if (type === 'disponibilidad') {
                const weekStartDateString = startDate.toLocaleDateString('es-CO', {
                    day: '2-digit', month: '2-digit', timeZone: 'America/Bogota'
                });
                const eventTitle = `${userName} (Sem. ${weekStartDateString})`;

                const events: CalendarEvent[] = [];
                let currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
                const finalDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

                // Bucle restaurado con la condición <= para incluir el último día.
                while (currentDate <= finalDate) {
                    events.push({
                        id: `${id}-${currentDate.toISOString()}`,
                        title: eventTitle,
                        start: toBogotaLocalISOString(currentDate),
                        allDay: true,
                        backgroundColor: INGENIERO_COLOR, borderColor: INGENIERO_COLOR, textColor: '#FFFFFF',
                        extendedProps: { userId, type, userName, originalId: id, originalStart: startDate.toISOString(), originalEnd: endDate.toISOString() },
                    });
                    currentDate.setDate(currentDate.getDate() + 1);
                }
                return events;
            }
            
            return [{
                id, title: userName,
                start: toBogotaLocalISOString(startDate),
                end: toBogotaLocalISOString(endDate),
                allDay: false,
                extendedProps: { userId, type, userName, originalId: id, originalStart: startDate.toISOString(), originalEnd: endDate.toISOString() },
            }];
        });
    }, [shifts, users, currentUser, userNameByUid, userRoleByUid]);

    const allEvents = useMemo(() => [...holidayEvents, ...shiftEvents], [holidayEvents, shiftEvents]);

    const handleEventClick = (clickInfo: EventClickArg) => {
        if (clickInfo.event.display === 'background') return;
        const { event } = clickInfo;
        setSelectedEvent({
            id: event.extendedProps.originalId,
            title: event.title,
            start: event.extendedProps.originalStart,
            end: event.extendedProps.originalEnd,
            extendedProps: event.extendedProps as CalendarEventExtendedProps
        });
    };
    
    const handleDeleteShift = async (shiftId: string) => {
        try {
            await deleteDoc(doc(db, 'shifts', shiftId));
            setSelectedEvent(null);
        } catch (error) { console.error("Error al eliminar el turno: ", error); alert('No se pudo eliminar el turno.'); }
    };
    
    const handleDatesSet = (dateInfo: any) => { const year = dateInfo.view.currentStart.getFullYear(); if (year !== viewedYear) setViewedYear(year); };
    const handleEventDidMount = (arg: EventMountArg) => { if (arg.event.extendedProps.type === 'rotativo') arg.el.classList.add('agent-event'); };

    return (
        <div className="bg-white p-4 rounded-lg shadow-md">
            <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' }}
                events={allEvents}
                eventClick={handleEventClick}
                locale={esLocale}
                buttonText={{ today: 'hoy', month: 'mes', week: 'semana', day: 'día' }}
                height="auto"
                eventContent={renderEventContent}
                datesSet={handleDatesSet}
                eventDidMount={handleEventDidMount}
                eventOrder="start"
                timeZone='America/Bogota'
                eventTimeFormat={{
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                }}
            />
            {selectedEvent && <ShiftDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} onDelete={handleDeleteShift} currentUser={currentUser}/>}
        </div>
    );
};
