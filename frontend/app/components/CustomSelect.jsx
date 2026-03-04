import React, { useState, useRef, useEffect } from "react";

export default function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Seleccionar...",
  className = "",
  disabled = false,
  size = "md",
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function close(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const selected = options.find((o) => o.value === value);
  const label = selected ? selected.label : placeholder;
  const isPlaceholder = !selected;

  const sizeClasses =
    size === "sm"
      ? "px-4 py-1.5 text-sm"
      : "px-4 py-2.5 text-sm";

  return (
    <div className={`relative inline-block ${className}`} ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 ${sizeClasses} font-medium transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${
          disabled ? "opacity-60 cursor-not-allowed" : ""
        } ${isPlaceholder ? "text-slate-400 dark:text-slate-500" : "text-slate-600 dark:text-slate-300"}`}
      >
        <span>{label}</span>
        <svg
          className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-[9999] rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg py-1 max-h-60 overflow-y-auto" style={{ minWidth: ref.current?.offsetWidth || "auto" }}>
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`w-full text-left whitespace-nowrap px-4 py-2 text-sm transition hover:bg-slate-50 dark:hover:bg-slate-700 ${
                opt.value === value
                  ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-medium"
                  : "text-slate-700 dark:text-slate-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
