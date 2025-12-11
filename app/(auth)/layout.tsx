import { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-indigo-50 text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-12 px-6 py-10 lg:flex-row lg:items-center lg:gap-16 lg:px-12">
        <div className="hidden w-full max-w-xl flex-col gap-6 lg:flex">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">
            Virtual Care
          </p>
          <h2 className="text-4xl font-semibold leading-tight text-slate-900">
            Talk to a medical assistant powered by trusted data
          </h2>
          <p className="text-lg text-slate-600">
            Create a secure account to access personalized guidance and keep
            your health conversations in one place.
          </p>
        </div>
        <div className="flex w-full items-center justify-center">
          {children}
        </div>
      </div>
    </div>
  );
}

