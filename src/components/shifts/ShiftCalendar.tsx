
import React, { useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
// **AÑADIDO: Importar la utilidad de festivos local**
import { getColombianHolidaysForYear } from '../../utils/dateUtils'; 
import { Shift } from '../../types'; // Asumiendo que se llamará con shifts reales

interface CalendarEvent {
    id?: string;
    title: string;
    start: string | Date;
    end?: string | Date;
    allDay?: boolean;
    backgroundColor?: string;
    borderColor?: string;
    rendering?: string;
    extendedProps?: any;
}

interface ShiftCalendarProps {
    shifts: Shift[]; // Usamos el tipo Shift para más consistencia
}

// **MODIFICADO: El calendario ahora usa las props directamente y añade los festivos**
const ShiftCalendar: React.FC<ShiftCalendarProps> = ({ shifts }) => {

    // **AÑADIDO: Generar eventos de festivos desde la utilidad local**
    const holidayEvents = useMemo(() => {
        const currentYear = new Date().getFullYear();
        const holidays = getColombianHolidaysForYear(currentYear);
        // Si el utilitario tuviera años futuros, podríamos añadirlos también
        // const nextYearHolidays = getColombianHolidaysForYear(currentYear + 1);

        return holidays.map(holidayDate => ({
            title: 'Festivo',
            start: holidayDate,
            allDay: true,
            rendering: 'background',
            backgroundColor: '#FFD6D6', // Un rojo claro para el fondo del festivo
            borderColor: 'transparent'
        }));
    }, []);

    // **AÑADIDO: Mapear los turnos (shifts) a eventos del calendario**
    const shiftEvents: CalendarEvent[] = useMemo(() => shifts.map(shift => ({
        id: shift.id,
        title: `${shift.userName} (${shift.type === 'disponibilidad' ? 'On-call' : 'Turno'})`,
        start: shift.start.toDate(), // Convertir Timestamp de Firestore a Date
        end: shift.end.toDate(),
        backgroundColor: shift.role === 'INGENIERO' ? '#0284c7' : '#16a34a', // Azul para Ing, Verde para Agente
        borderColor: shift.role === 'INGENIERO' ? '#0284c7' : '#16a34a',
        extendedProps: {
            role: shift.role
        }
    })), [shifts]);

    const allEvents = useMemo(() => [...holidayEvents, ...shiftEvents], [holidayEvents, shiftEvents]);

    return (
        <div className="bg-white p-4 rounded-lg shadow-md">
            <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                headerToolbar={{
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,timeGridWeek,timeGridDay'
                }}
                events={allEvents}
                locale={esLocale}
                timeZone="America/Bogota"
                buttonText={{
                    today: 'hoy',
                    month: 'mes',
                    week: 'semana',
                    day: 'día',
                    list: 'lista'
                }}
                height="auto"
                eventDisplay='block'
                eventTimeFormat={{ hour: 'numeric', minute: '2-digit', meridiem: false }}
            />
        </div>
    );
};

export { ShiftCalendar };

