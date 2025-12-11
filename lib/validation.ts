export type FieldError = {
  field: string;
  message: string;
};

const namePattern = /^[A-Za-z][A-Za-z'.\-\s]{1,59}$/;
const emailPattern =
  /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const passwordPattern =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\da-zA-Z]).{8,}$/;

export const validateSignup = (input: {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}): FieldError[] => {
  const errors: FieldError[] = [];
  const name = input.name.trim();
  if (!name || name.length < 2 || name.length > 60 || !namePattern.test(name)) {
    errors.push({
      field: "name",
      message: "Enter a valid name with letters, spaces, or hyphens",
    });
  }
  if (!input.email || !emailPattern.test(input.email)) {
    errors.push({ field: "email", message: "Enter a valid email" });
  }
  if (!input.password || !passwordPattern.test(input.password)) {
    errors.push({
      field: "password",
      message:
        "Use 8+ chars with upper, lower, number, and symbol",
    });
  }
  if (input.password !== input.confirmPassword) {
    errors.push({ field: "confirmPassword", message: "Passwords do not match" });
  }
  return errors;
};

export const validateLogin = (input: {
  email: string;
  password: string;
}): FieldError[] => {
  const errors: FieldError[] = [];
  if (!input.email || !emailPattern.test(input.email)) {
    errors.push({ field: "email", message: "Enter a valid email" });
  }
  if (!input.password) {
    errors.push({ field: "password", message: "Password is required" });
  }
  return errors;
};

