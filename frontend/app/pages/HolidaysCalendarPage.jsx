import React, { useState, useMemo } from "react";
import CustomSelect from "../components/CustomSelect";

const REGIONS = [
  { value: "nacional", label: "Nacional (toda España)" },
  { value: "andalucia", label: "Andalucía" },
  { value: "aragon", label: "Aragón" },
  { value: "asturias", label: "Asturias" },
  { value: "baleares", label: "Islas Baleares" },
  { value: "canarias", label: "Islas Canarias" },
  { value: "cantabria", label: "Cantabria" },
  { value: "castilla_leon", label: "Castilla y León" },
  { value: "castilla_mancha", label: "Castilla-La Mancha" },
  { value: "cataluna", label: "Cataluña" },
  { value: "ceuta", label: "Ceuta" },
  { value: "extremadura", label: "Extremadura" },
  { value: "galicia", label: "Galicia" },
  { value: "madrid", label: "Madrid" },
  { value: "melilla", label: "Melilla" },
  { value: "murcia", label: "Murcia" },
  { value: "navarra", label: "Navarra" },
  { value: "pais_vasco", label: "País Vasco" },
  { value: "rioja", label: "La Rioja" },
  { value: "valencia", label: "Comunidad Valenciana" },
];

function getHolidays(year) {
  function easter(y) {
    const a = y % 19;
    const b = Math.floor(y / 100);
    const c = y % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(y, month - 1, day);
  }

  const easterDate = easter(year);
  const addDays = (d, n) => {
    const r = new Date(d);
    r.setDate(r.getDate() + n);
    return r;
  };

  const juevesSanto = addDays(easterDate, -3);
  const viernesSanto = addDays(easterDate, -2);
  const lunesPascua = addDays(easterDate, 1);
  const corpusChristi = addDays(easterDate, 60);

  const national = [
    { date: `${year}-01-01`, name: "Año Nuevo", regions: ["nacional"] },
    { date: `${year}-01-06`, name: "Día de Reyes", regions: ["nacional"] },
    { date: fmt(viernesSanto), name: "Viernes Santo", regions: ["nacional"] },
    { date: `${year}-05-01`, name: "Día del Trabajador", regions: ["nacional"] },
    { date: `${year}-08-15`, name: "Asunción de la Virgen", regions: ["nacional"] },
    { date: `${year}-10-12`, name: "Fiesta Nacional de España", regions: ["nacional"] },
    { date: `${year}-11-01`, name: "Día de Todos los Santos", regions: ["nacional"] },
    { date: `${year}-12-06`, name: "Día de la Constitución", regions: ["nacional"] },
    { date: `${year}-12-08`, name: "Inmaculada Concepción", regions: ["nacional"] },
    { date: `${year}-12-25`, name: "Navidad", regions: ["nacional"] },
  ];

  const regional = [
    { date: `${year}-02-28`, name: "Día de Andalucía", regions: ["andalucia"] },
    { date: fmt(juevesSanto), name: "Jueves Santo", regions: ["andalucia", "aragon", "asturias", "canarias", "cantabria", "castilla_leon", "castilla_mancha", "extremadura", "galicia", "madrid", "murcia", "navarra", "rioja", "ceuta", "melilla"] },
    { date: fmt(lunesPascua), name: "Lunes de Pascua", regions: ["baleares", "cataluna", "navarra", "pais_vasco", "valencia", "rioja"] },
    { date: `${year}-04-23`, name: "Día de Aragón / San Jorge", regions: ["aragon"] },
    { date: `${year}-04-23`, name: "Día de Castilla y León", regions: ["castilla_leon"] },
    { date: `${year}-05-02`, name: "Día de la Comunidad de Madrid", regions: ["madrid"] },
    { date: `${year}-05-17`, name: "Día de las Letras Gallegas", regions: ["galicia"] },
    { date: `${year}-05-30`, name: "Día de Canarias", regions: ["canarias"] },
    { date: `${year}-05-31`, name: "Día de Castilla-La Mancha", regions: ["castilla_mancha"] },
    { date: fmt(corpusChristi), name: "Corpus Christi", regions: ["castilla_mancha"] },
    { date: `${year}-06-09`, name: "Día de La Rioja", regions: ["rioja"] },
    { date: `${year}-06-09`, name: "Día de Murcia", regions: ["murcia"] },
    { date: `${year}-06-24`, name: "San Juan", regions: ["cataluna", "galicia", "valencia"] },
    { date: `${year}-07-25`, name: "Santiago Apóstol", regions: ["galicia", "pais_vasco", "navarra"] },
    { date: `${year}-07-28`, name: "Día de las Instituciones de Cantabria", regions: ["cantabria"] },
    { date: `${year}-08-05`, name: "Virgen de África", regions: ["ceuta"] },
    { date: `${year}-09-02`, name: "Día de Ceuta", regions: ["ceuta"] },
    { date: `${year}-09-08`, name: "Día de Asturias", regions: ["asturias"] },
    { date: `${year}-09-08`, name: "Día de Extremadura", regions: ["extremadura"] },
    { date: `${year}-09-11`, name: "Diada Nacional de Cataluña", regions: ["cataluna"] },
    { date: `${year}-09-15`, name: "Virgen de la Bien Aparecida", regions: ["cantabria"] },
    { date: `${year}-09-17`, name: "Fiesta de Melilla", regions: ["melilla"] },
    { date: `${year}-10-09`, name: "Día de la Comunidad Valenciana", regions: ["valencia"] },
    { date: `${year}-10-25`, name: "Día del País Vasco", regions: ["pais_vasco"] },
    { date: `${year}-11-09`, name: "Virgen de la Almudena", regions: ["madrid"] },
    { date: `${year}-12-03`, name: "Día de Navarra", regions: ["navarra"] },
    { date: `${year}-12-26`, name: "San Esteban", regions: ["cataluna", "baleares"] },
    { date: `${year}-03-01`, name: "Día de las Islas Baleares", regions: ["baleares"] },
    { date: `${year}-03-19`, name: "San José / Día del Padre", regions: ["valencia", "murcia"] },
  ];

  return [...national, ...regional];

  function fmt(d) {
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${mm}-${dd}`;
  }
}

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const DAY_HEADERS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"];

function getMonthGrid(year, month) {
  const firstDay = new Date(year, month, 1);
  let startWeekday = firstDay.getDay();
  if (startWeekday === 0) startWeekday = 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 1; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const rows = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }
  return rows;
}

function MonthCalendar({ year, month, holidayDates, today }) {
  const rows = getMonthGrid(year, month);
  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;

  return (
    <div className="rounded-xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_0_-1px_rgba(0,0,0,0.04),0_4px_6px_-1px_rgba(0,0,0,0.08)]">
      <h3 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">
        {MONTH_NAMES[month]}
      </h3>
      <table className="w-full table-fixed text-center text-xs">
        <thead>
          <tr>
            {DAY_HEADERS.map((d) => (
              <th key={d} className="pb-2 font-medium text-slate-400 dark:text-slate-500">{d}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((day, ci) => {
                if (day === null) return <td key={ci} className="py-1" />;
                const dateStr = `${monthKey}-${String(day).padStart(2, "0")}`;
                const holiday = holidayDates.get(dateStr);
                const isToday = dateStr === today;
                let dayClass;
                if (isToday) {
                  dayClass = "bg-indigo-400 text-white font-bold border-indigo-500";
                } else if (holiday?.national && holiday?.regional) {
                  dayClass = "bg-gradient-to-br from-indigo-100 to-violet-100 text-indigo-700 dark:from-indigo-500/20 dark:to-violet-500/20 dark:text-indigo-200 font-semibold border-indigo-300 dark:border-indigo-500/40";
                } else if (holiday?.national) {
                  dayClass = "bg-indigo-100 text-indigo-700 dark:bg-indigo-400/20 dark:text-indigo-300 font-semibold border-indigo-300 dark:border-indigo-500/40";
                } else if (holiday?.regional) {
                  dayClass = "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300 font-semibold border-violet-300 dark:border-violet-500/40";
                } else {
                  dayClass = "text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700";
                }
                return (
                  <td key={ci} className="py-1">
                    <span
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition border ${dayClass}`}
                      title={holiday?.names?.join(", ")}
                    >
                      {day}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function HolidaysCalendarPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [region, setRegion] = useState("galicia");

  const todayStr = useMemo(() => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
  }, []);

  const allHolidays = useMemo(() => getHolidays(year), [year]);

  const filteredHolidays = useMemo(() => {
    return allHolidays.filter(
      (h) => h.regions.includes("nacional") || h.regions.includes(region)
    );
  }, [allHolidays, region]);

  const holidayDateMap = useMemo(() => {
    const map = new Map();
    for (const h of filteredHolidays) {
      if (!map.has(h.date)) map.set(h.date, { names: [], national: false, regional: false });
      const entry = map.get(h.date);
      entry.names.push(h.name);
      if (h.regions.includes("nacional")) entry.national = true;
      else entry.regional = true;
    }
    return map;
  }, [filteredHolidays]);

  const holidaysByMonth = useMemo(() => {
    const grouped = {};
    for (const h of filteredHolidays) {
      const monthIdx = parseInt(h.date.slice(5, 7), 10) - 1;
      if (!grouped[monthIdx]) grouped[monthIdx] = [];
      grouped[monthIdx].push(h);
    }
    for (const k of Object.keys(grouped)) {
      grouped[k].sort((a, b) => a.date.localeCompare(b.date));
    }
    return grouped;
  }, [filteredHolidays]);

  const regionLabel = REGIONS.find((r) => r.value === region)?.label || region;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setYear((y) => y - 1)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-2xl font-bold text-slate-800 dark:text-slate-100 min-w-[80px] text-center tabular-nums">
            {year}
          </span>
          <button
            type="button"
            onClick={() => setYear((y) => y + 1)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Sidebar: region selector + holiday list */}
        <div className="w-full shrink-0 lg:w-64 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Región de festivos
            </label>
            <CustomSelect
              value={region}
              onChange={(val) => setRegion(val)}
              options={REGIONS}
              className="w-full"
            />
          </div>

          <div className="rounded-xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 max-h-[70vh] overflow-y-auto shadow-lg">
            <h3 className="mb-3 text-sm font-bold text-slate-800 dark:text-slate-100">
              Festivos {year}
            </h3>
            {Object.keys(holidaysByMonth).length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500">
                No hay festivos registrados.
              </p>
            ) : (
              <div className="space-y-4">
                {Array.from({ length: 12 }, (_, i) => i)
                  .filter((m) => holidaysByMonth[m])
                  .map((monthIdx) => (
                    <div key={monthIdx}>
                      <h4 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {MONTH_NAMES[monthIdx]}
                      </h4>
                      <div className="space-y-1.5">
                        {holidaysByMonth[monthIdx].map((h, i) => {
                          const dayNum = parseInt(h.date.slice(8, 10), 10);
                          const monthShort = MONTH_NAMES[monthIdx].slice(0, 3).toUpperCase();
                          const isNational = h.regions.includes("nacional");
                          return (
                            <div key={i} className="flex items-start gap-2">
                              <span
                                className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
                                  isNational
                                    ? "bg-indigo-400"
                                    : "bg-violet-400 dark:bg-violet-500"
                                }`}
                              />
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-slate-700 dark:text-slate-200 leading-tight">
                                  {h.name}
                                </p>
                                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                                  {dayNum} {monthShort}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-indigo-400" />
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Nacional</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-violet-400 dark:bg-violet-500" />
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Autonómico</span>
              </div>
            </div>
          </div>
        </div>

        {/* Calendar grid */}
        <div className="flex-1">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 12 }, (_, i) => (
              <MonthCalendar
                key={`${year}-${i}`}
                year={year}
                month={i}
                holidayDates={holidayDateMap}
                today={todayStr}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
