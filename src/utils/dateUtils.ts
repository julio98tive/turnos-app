
// --- COLOMBIAN HOLIDAYS DATA ---
const COLOMBIAN_HOLIDAYS: { [year: number]: string[] } = {
    2024: [
        '2024-01-01', '2024-01-08', '2024-03-25', '2024-03-28', '2024-03-29',
        '2024-05-01', '2024-05-13', '2024-06-03', '2024-06-10', '2024-07-01',
        '2024-07-20', '2024-08-07', '2024-08-19', '2024-10-14', '2024-11-04',
        '2024-11-11', '2024-12-08', '2024-12-25',
    ],
    2025: [
        '2025-01-01', '2025-01-06', '2025-03-24', '2025-04-17', '2025-04-18',
        '2025-05-01', '2025-06-02', '2025-06-23', '2025-06-30', '2025-07-20',
        '2025-08-07', '2025-08-18', '2025-10-13', '2025-11-03', '2025-11-17',
        '2025-12-08', '2025-12-25',
    ],
};

/**
 * **NUEVA FUNCIÓN**
 * Devuelve un array de strings con los festivos de un año específico.
 * @param year - El año para el cual obtener los festivos.
 * @returns Un array de fechas en formato 'YYYY-MM-DD'.
 */
export const getColombianHolidaysForYear = (year: number): string[] => {
    return COLOMBIAN_HOLIDAYS[year] || [];
};

/**
 * Verifica si una fecha específica es un festivo en Colombia para ese año.
 * @param date - El objeto Date a verificar.
 * @returns `true` si es festivo, de lo contrario `false`.
 */
export const esFestivoColombia = (date: Date): boolean => {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;

    const holidaysForYear = getColombianHolidaysForYear(year);
    return holidaysForYear.includes(dateString);
};

/**
 * Verifica si una fecha es fin de semana (sábado o domingo) O si es un festivo.
 * Se usa la fecha en UTC para evitar problemas de zona horaria.
 * @param date - El objeto Date a verificar.
 * @returns `true` si es fin de semana o festivo, de lo contrario `false`.
 */
export const isWeekendOrHoliday = (date: Date): boolean => {
    const day = date.getUTCDay(); // 0 = Domingo, 6 = Sábado
    const isWeekend = day === 0 || day === 6;
    return isWeekend || esFestivoColombia(date);
};
