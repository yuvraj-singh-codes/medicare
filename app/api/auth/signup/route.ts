import { NextResponse } from "next/server";
import { createUser } from "@/lib/user-store";
import { validateSignup } from "@/lib/validation";

export async function POST(request: Request) {
  const body = await request.json();
  const input = {
    name: (body.name as string | undefined)?.trim() ?? "",
    email: (body.email as string | undefined)?.trim() ?? "",
    password: (body.password as string | undefined) ?? "",
    confirmPassword: (body.confirmPassword as string | undefined) ?? "",
  };

  const errors = validateSignup(input);
  if (errors.length) {
    return NextResponse.json(
      { success: false, errors },
      { status: 400 }
    );
  }

  try {
    const user = await createUser({
      name: input.name,
      email: input.email,
      password: input.password,
    });
    return NextResponse.json({
      success: true,
      user,
      message: "Account created",
    });
  } catch (error) {
    const duplicate = error instanceof Error && error.message === "DUPLICATE_EMAIL";
    return NextResponse.json(
      {
        success: false,
        errors: [
          {
            field: "email",
            message: duplicate
              ? "Email already registered"
              : "Unable to create account",
          },
        ],
      },
      { status: duplicate ? 409 : 500 }
    );
  }
}

