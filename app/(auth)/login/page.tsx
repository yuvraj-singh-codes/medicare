"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { TextField } from "@/components/auth/TextField";
import { validateLogin } from "@/lib/validation";

type FormState = {
  email: string;
  password: string;
};

const mapErrors = (errors: { field: string; message: string }[]) => {
  const next: Record<string, string> = {};
  errors.forEach((err) => {
    next[err.field] = err.message;
  });
  return next;
};

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "error" | "success">("idle");
  const [message, setMessage] = useState("");
  const [created, setCreated] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("created") === "1") {
      setCreated(true);
      setMessage("Account created. Please sign in.");
      setStatus("success");
    }
  }, []);

  const handleChange = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
    setStatus("idle");
    setMessage("");
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const clientErrors = validateLogin(form);
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
      const response = await fetch("/api/auth/login", {
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
      setMessage("Signed in. Redirecting to chat...");
      setTimeout(() => router.push("/chat"), 600);
    } catch (error) {
      setStatus("error");
      setMessage("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to continue your medical conversations"
      footer={{
        text: "New here?",
        href: "/signup",
        label: "Create an account",
      }}
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
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
        <TextField
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={form.password}
          error={errors.password}
          onChange={(e) => handleChange("password", e.target.value)}
          placeholder="••••••••"
          toggleablePassword
        />
        <button
          type="submit"
          disabled={submitting}
          className="flex h-11 w-full items-center justify-center rounded-xl bg-sky-700 text-sm font-semibold text-white transition hover:bg-sky-800 focus:outline-none focus:ring-2 focus:ring-sky-200 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? "Signing in..." : "Sign in"}
        </button>
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

