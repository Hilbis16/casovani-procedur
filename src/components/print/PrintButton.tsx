"use client";

interface Props {
  label?: string;
  className?: string;
}

export function PrintButton({ label = "Tisknout", className }: Props) {
  return (
    <button
      onClick={() => window.print()}
      className={className ?? "px-4 py-2 bg-gray-800 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors print:hidden"}
    >
      {label}
    </button>
  );
}
