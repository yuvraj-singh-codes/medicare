import Link from "next/link";
import { ReactNode } from "react";

type Props = {
  title: string;
  subtitle: string;
  footer?: {
    text: string;
    href: string;
    label: string;
  };
  children: ReactNode;
};

export function AuthCard({ title, subtitle, footer, children }: Props) {
  return (
    <div className="w-full max-w-md rounded-3xl bg-white/80 p-8 shadow-xl ring-1 ring-black/5 backdrop-blur">
      <div className="mb-8 space-y-2">
        <p className="text-sm font-medium text-sky-700">MediCare Assistant</p>
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        <p className="text-sm text-slate-600">{subtitle}</p>
      </div>
      {children}
      {footer ? (
        <div className="mt-8 text-center text-sm text-slate-600">
          {footer.text}{" "}
          <Link
            href={footer.href}
            className="font-semibold text-sky-700 hover:text-sky-800"
          >
            {footer.label}
          </Link>
        </div>
      ) : null}
    </div>
  );
}

