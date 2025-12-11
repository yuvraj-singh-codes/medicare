 "use client";

import { InputHTMLAttributes, useState } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  toggleablePassword?: boolean;
};

export function TextField({ label, error, className, toggleablePassword, ...props }: Props) {
  const id = props.id ?? props.name;
  const isPassword = props.type === "password";
  const [visible, setVisible] = useState(false);
  const inputType = isPassword && toggleablePassword ? (visible ? "text" : "password") : props.type;
  return (
    <div className="flex flex-col gap-1.5">
      <label
        className="text-sm font-medium text-slate-700"
        htmlFor={id}
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          className={`h-11 w-full rounded-xl border px-3 pr-10 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100 ${className ?? ""}`}
          {...props}
          type={inputType}
        />
        {isPassword && toggleablePassword ? (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute inset-y-0 right-2 flex items-center text-xs font-semibold text-slate-500 hover:text-slate-700"
            aria-label={visible ? "Hide password" : "Show password"}
          >
            {visible ? "Hide" : "Show"}
          </button>
        ) : null}
      </div>
      {error ? (
        <p className="text-xs font-medium text-rose-600">{error}</p>
      ) : null}
    </div>
  );
}

