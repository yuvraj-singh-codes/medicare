"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { TextField } from "@/components/auth/TextField";
import { validateSignup } from "@/lib/validation";

type FormState = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};

const mapErrors = (errors: { field: string; message: string }[]) => {
  const next: Record<string, string> = {};
  errors.forEach((err) => {
    next[err.field] = err.message;
  });
  return next;
};

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "error" | "success">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const redirectIfAuthenticated = async () => {
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store" });
        const result = await response.json();
        if (response.ok && result.authenticated) {
          router.replace("/chat");
        }
      } catch (error) {
        console.error("Session check failed", error);
      }
    };
    redirectIfAuthenticated();
  }, [router]);

  const handleChange = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
    setStatus("idle");
    setMessage("");
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const clientErrors = validateSignup(form);
    if (clientErrors.length) {
      setErrors(mapErrors(clientErrors));
      setStatus("error");
      setMessage("");
      return;
    }
    setSubmitting(true);
    setStatus("idle");
    setMessage("");
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        setErrors(mapErrors(result.errors ?? []));
        setStatus("error");
        setMessage("");
        return;
      }
      setStatus("success");
      setMessage("Account created. You can sign in now.");
      setTimeout(() => router.push("/login?created=1"), 800);
    } catch (error) {
      setStatus("error");
      setMessage("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthCard
      title="Create your account"
      subtitle="Start secure conversations with your medical assistant"
      footer={{
        text: "Already have an account?",
        href: "/login",
        label: "Sign in",
      }}
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <TextField
          label="Full name"
          name="name"
          type="text"
          autoComplete="name"
          value={form.name}
          error={errors.name}
          onChange={(e) => handleChange("name", e.target.value)}
          placeholder="Dr. Jamie Carter"
        />
        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          value={form.email}
          error={errors.email}
          onChange={(e) => handleChange("email", e.target.value)}
          placeholder="you@example.com"
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            label="Password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={form.password}
            error={errors.password}
            onChange={(e) => handleChange("password", e.target.value)}
            placeholder="••••••••"
          toggleablePassword
          />
          <TextField
            label="Confirm password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={form.confirmPassword}
            error={errors.confirmPassword}
            onChange={(e) => handleChange("confirmPassword", e.target.value)}
            placeholder="••••••••"
          toggleablePassword
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="flex h-11 w-full items-center justify-center rounded-xl bg-sky-700 text-sm font-semibold text-white transition hover:bg-sky-800 focus:outline-none focus:ring-2 focus:ring-sky-200 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? "Creating account..." : "Create account"}
        </button>
        <p className="text-xs text-slate-500">
          By continuing you agree to the privacy policy and allow secure storage
          of your chat history.
        </p>
        {message ? (
          <div
            className={`rounded-xl border px-3 py-2 text-sm ${
              status === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-rose-200 bg-rose-50 text-rose-700"
            }`}
          >
            {message}
          </div>
        ) : null}
      </form>
    </AuthCard>
  );
}

