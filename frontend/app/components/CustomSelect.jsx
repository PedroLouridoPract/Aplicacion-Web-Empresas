import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

export default function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Seleccionar...",
  className = "",
  disabled = false,
  size = "md",
  variant = "default",
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, minWidth: 0 });
  const ref = useRef(null);
  const panelRef = useRef(null);

  const updatePos = useCallback(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, left: rect.left, minWidth: rect.width });
  }, []);

  useEffect(() => {
    function close(e) {
      if (
        ref.current && !ref.current.contains(e.target) &&
        (!panelRef.current || !panelRef.current.contains(e.target))
      ) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePos();
    window.addEventListener("scroll", updatePos, true);
    window.addEventListener("resize", updatePos);
    return () => {
      window.removeEventListener("scroll", updatePos, true);
      window.removeEventListener("resize", updatePos);
    };
  }, [open, updatePos]);

  const selected = options.find((o) => o.value === value);
  const label = selected ? selected.label : placeholder;
  const isPlaceholder = !selected;

  const sizeClasses =
    size === "sm"
      ? "px-3 text-sm h-12"
      : variant === "modal"
        ? "px-3 py-2.5 text-sm"
        : "px-3 text-sm h-12";

  const baseClasses =
    variant === "modal"
      ? "w-full rounded-xl border-2 border-[#f2f2f2] bg-[#f2f2f2] dark:bg-slate-800 dark:border-slate-700"
      : `rounded-xl border-2 shadow-sm bg-white dark:bg-slate-800 ${open ? "border-[#5F96F9]" : "border-gray-200 dark:border-slate-700"}`;

  function handleOpen() {
    if (disabled) return;
    updatePos();
    setOpen((o) => !o);
  }

  return (
    <div className={`relative inline-block ${className}`} ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={handleOpen}
        className={`flex items-center gap-2 whitespace-nowrap ${baseClasses} ${sizeClasses} font-medium transition-all cursor-pointer focus:outline-none ${
          disabled ? "opacity-60 cursor-not-allowed" : ""
        } ${isPlaceholder ? "text-gray-400 dark:text-slate-500" : "text-gray-700 dark:text-slate-300"}`}
        style={{ minWidth: 100 }}
      >
        <span className="flex-1 text-left truncate">{label}</span>
        <svg
          className={`w-3.5 h-3.5 ml-2 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          viewBox="0 0 15 15"
          fill="none"
        >
          <path d="M12.4469 5.59375L8.37187 9.66875C7.89062 10.15 7.10312 10.15 6.62187 9.66875L2.54688 5.59375" stroke="#B3B3B3" strokeWidth={1.5} strokeMiterlimit={10} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          className="fixed inline-flex flex-col rounded-xl bg-white dark:bg-slate-800 border-2 border-[#5F96F9] shadow-lg py-1 max-h-60 overflow-y-auto custom-select-dropdown"
          style={{ top: pos.top, left: pos.left, zIndex: 99999, minWidth: variant === "modal" ? pos.minWidth : undefined }}
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`text-left whitespace-nowrap px-4 py-2 text-sm transition hover:bg-slate-50 dark:hover:bg-slate-700 ${
                opt.value === value
                  ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-medium"
                  : "text-slate-700 dark:text-slate-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}
