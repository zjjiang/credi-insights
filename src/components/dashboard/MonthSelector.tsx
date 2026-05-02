"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface MonthSelectorProps {
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
}

export function MonthSelector({ year, month, onChange }: MonthSelectorProps) {
  function prev() {
    if (month === 1) {
      onChange(year - 1, 12);
    } else {
      onChange(year, month - 1);
    }
  }

  function next() {
    if (month === 12) {
      onChange(year + 1, 1);
    } else {
      onChange(year, month + 1);
    }
  }

  const label = `${year}年${String(month).padStart(2, "0")}月`;

  return (
    <div className="flex items-center gap-4">
      <button
        onClick={prev}
        className="rounded-full p-1 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="上个月"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <span className="min-w-[7rem] text-center text-base font-medium">
        {label}
      </span>
      <button
        onClick={next}
        className="rounded-full p-1 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="下个月"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
