
// --- LÓGICA DINÁMICA PARA CÁLCULO DE FESTIVOS EN COLOMBIA ---

/**
 * Formatea un objeto Date a un string 'YYYY-MM-DD' en UTC.
 */
const toDateString = (date: Date): string => {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Mueve una fecha al siguiente lunes si no es lunes.
 * Si la fecha es domingo, se mueve al día siguiente (lunes).
 * Si es de martes a sábado, se calcula la distancia al próximo lunes.
 */
const moveToNextMonday = (date: Date): Date => {
    const day = date.getUTCDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
    if (day === 1) return date; // Ya es lunes
    const newDate = new Date(date);
    const daysToAdd = day === 0 ? 1 : (8 - day);
    newDate.setUTCDate(newDate.getUTCDate() + daysToAdd);
    return newDate;
};

/**
 * Calcula el Domingo de Pascua para un año dado usando el algoritmo de Gauss.
 * @returns La fecha del Domingo de Pascua en UTC.
 */
const getEasterSunday = (year: number): Date => {
    const a = year % 19;
    const b = year % 4;
    const c = year % 7;
    const k = Math.floor(year / 100);
    const p = Math.floor((13 + 8 * k) / 25);
    const q = Math.floor(k / 4);
    const M = (15 - p + k - q) % 30;
    const N = (4 + k - q) % 7;
    const d = (19 * a + M) % 30;
    const e = (2 * b + 4 * c + 6 * d + N) % 7;
    
    const day = (d + e < 10) ? d + e + 22 : d + e - 9;
    const month = (d + e < 10) ? 2 : 3; // 2 = Marzo, 3 = Abril

    if (day === 26 && month === 3) { // Abril
        return new Date(Date.UTC(year, 3, 19));
    }
    if (day === 25 && month === 3 && d === 28 && e === 6 && a > 10) { // Abril
        return new Date(Date.UTC(year, 3, 18));
    }
    return new Date(Date.UTC(year, month, day));
};

// Objeto para cachear los festivos ya calculados.
const holidaysCache: Record<number, string[]> = {};

/**
 * **FUNCIÓN PRINCIPAL MEJORADA**
 * Devuelve un array de strings con los festivos de un año específico, calculándolos dinámicamente.
 * @param year - El año para el cual obtener los festivos.
 * @returns Un array de fechas en formato 'YYYY-MM-DD'.
 */
export const getColombianHolidaysForYear = (year: number): string[] => {
    if (holidaysCache[year]) {
        return holidaysCache[year];
    }

    const easter = getEasterSunday(year);
    const holidays = [];

    // 1. Festivos Fijos
    holidays.push(new Date(Date.UTC(year, 0, 1)));   // Año Nuevo
    holidays.push(new Date(Date.UTC(year, 4, 1)));   // Día del Trabajo
    holidays.push(new Date(Date.UTC(year, 6, 20)));  // Independencia
    holidays.push(new Date(Date.UTC(year, 7, 7)));   // Batalla de Boyacá
    holidays.push(new Date(Date.UTC(year, 11, 8)));  // Inmaculada Concepción
    holidays.push(new Date(Date.UTC(year, 11, 25))); // Navidad

    // 2. Festivos movidos al próximo lunes ("Ley Emiliani")
    holidays.push(moveToNextMonday(new Date(Date.UTC(year, 0, 6))));   // Reyes Magos
    holidays.push(moveToNextMonday(new Date(Date.UTC(year, 2, 19))));  // San José
    holidays.push(moveToNextMonday(new Date(Date.UTC(year, 5, 29))));  // San Pedro y San Pablo
    holidays.push(moveToNextMonday(new Date(Date.UTC(year, 7, 15))));  // Asunción de la Virgen
    holidays.push(moveToNextMonday(new Date(Date.UTC(year, 9, 12))));  // Día de la Raza
    holidays.push(moveToNextMonday(new Date(Date.UTC(year, 10, 1))));  // Todos los Santos
    holidays.push(moveToNextMonday(new Date(Date.UTC(year, 10, 11)))); // Independencia de Cartagena

    // 3. Festivos basados en Pascua
    const JuevesSanto = new Date(easter); JuevesSanto.setUTCDate(easter.getUTCDate() - 3);
    const ViernesSanto = new Date(easter); ViernesSanto.setUTCDate(easter.getUTCDate() - 2);
    const Ascension = new Date(easter); Ascension.setUTCDate(easter.getUTCDate() + 39);
    const CorpusChristi = new Date(easter); CorpusChristi.setUTCDate(easter.getUTCDate() + 60);
    const SagradoCorazon = new Date(easter); SagradoCorazon.setUTCDate(easter.getUTCDate() + 68);

    holidays.push(JuevesSanto, ViernesSanto);
    holidays.push(moveToNextMonday(Ascension));
    holidays.push(moveToNextMonday(CorpusChristi));
    holidays.push(moveToNextMonday(SagradoCorazon));

    // Formatear y guardar en caché
    const holidayStrings = holidays.map(toDateString).sort();
    holidaysCache[year] = holidayStrings;
    
    return holidayStrings;
};

/**
 * Verifica si una fecha específica es un festivo en Colombia para ese año.
 */
export const esFestivoColombia = (date: Date): boolean => {
    const year = date.getUTCFullYear();
    const dateString = toDateString(date);
    const holidaysForYear = getColombianHolidaysForYear(year);
    return holidaysForYear.includes(dateString);
};

/**
 * Verifica si una fecha es fin de semana (sábado o domingo) O si es un festivo.
 */
export const isWeekendOrHoliday = (date: Date): boolean => {
    const day = date.getUTCDay(); // 0 = Domingo, 6 = Sábado
    const isWeekend = day === 0 || day === 6;
    return isWeekend || esFestivoColombia(date);
};
