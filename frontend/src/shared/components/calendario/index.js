/**
 * Calendario con vistas año / mes / semana / día.
 *
 *   <Calendar
 *     customBlocks={[{ duration: 60, type: 'bloque', label: '08:00' }, ...]}  // franjas del día
 *     startHour={8}
 *     events={[{ id, date, blockIndices: [0, 1], title, description?, color?, data? }]}
 *     onDateSelect={(date) => ...}
 *     onEventClick={(event) => ...}   // event.data = lo que pasaste
 *   />
 *
 * Los eventos se ubican por índice de franja (customBlocks); las franjas
 * con type 'break' no admiten eventos. Ver features/calendario para un
 * ejemplo que convierte fechas de inicio/fin a franjas (eventosAFranjas).
 * ScheduleTemplate: tabla de horario semanal (bloques × días) independiente.
 */
export { default as Calendar } from './Calendar';
export { default as ScheduleTemplate } from './ScheduleTemplate';
export { useCalendar, getRandomColor } from './hooks/useCalendar';
