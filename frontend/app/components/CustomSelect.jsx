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
      ? "px-4 py-1.5 text-sm"
      : variant === "modal"
        ? "px-3 py-2.5 text-sm"
        : "px-4 py-2.5 text-sm";

  const baseClasses =
    variant === "modal"
      ? "w-full rounded-xl border-2 border-[#f2f2f2] bg-[#f2f2f2] dark:bg-slate-800 dark:border-slate-700"
      : "rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700";

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
        className={`${variant === "modal" ? "flex" : "inline-flex"} items-center gap-2 whitespace-nowrap ${baseClasses} ${sizeClasses} font-medium transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#5F96F9]/20 ${
          disabled ? "opacity-60 cursor-not-allowed" : ""
        } ${isPlaceholder ? "text-gray-400 dark:text-slate-500" : "text-gray-700 dark:text-slate-300"}`}
      >
        <span className={variant === "modal" ? "flex-1 text-left truncate" : ""}>{label}</span>
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

      {open && createPortal(
        <div
          ref={panelRef}
          className="fixed inline-flex flex-col rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg py-1 max-h-60 overflow-y-auto"
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
