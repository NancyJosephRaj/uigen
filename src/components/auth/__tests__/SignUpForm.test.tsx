import { test, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SignUpForm } from "../SignUpForm";
import { useAuth } from "@/hooks/use-auth";

vi.mock("@/hooks/use-auth", () => ({
  useAuth: vi.fn(),
}));

const mockUseAuth = {
  signIn: vi.fn(),
  signUp: vi.fn(),
  isLoading: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  (useAuth as any).mockReturnValue(mockUseAuth);
});

afterEach(() => {
  cleanup();
});

test("renders email, password, and confirm password fields", () => {
  render(<SignUpForm />);

  expect(screen.getByLabelText("Email")).toBeDefined();
  expect(screen.getByLabelText("Password")).toBeDefined();
  expect(screen.getByLabelText("Confirm Password")).toBeDefined();
  expect(screen.getByRole("button", { name: "Sign Up" })).toBeDefined();
});

test("calls signUp with email and password on submit", async () => {
  mockUseAuth.signUp.mockResolvedValue({ success: true });

  render(<SignUpForm />);

  await userEvent.type(screen.getByLabelText("Email"), "user@example.com");
  await userEvent.type(screen.getByLabelText("Password"), "password123");
  await userEvent.type(screen.getByLabelText("Confirm Password"), "password123");
  await userEvent.click(screen.getByRole("button", { name: "Sign Up" }));

  expect(mockUseAuth.signUp).toHaveBeenCalledWith("user@example.com", "password123");
});

test("shows verification message when sign up succeeds", async () => {
  mockUseAuth.signUp.mockResolvedValue({
    success: true,
    message: "Account created! Check your email to verify your account.",
  });

  render(<SignUpForm />);

  await userEvent.type(screen.getByLabelText("Email"), "user@example.com");
  await userEvent.type(screen.getByLabelText("Password"), "password123");
  await userEvent.type(screen.getByLabelText("Confirm Password"), "password123");
  await userEvent.click(screen.getByRole("button", { name: "Sign Up" }));

  expect(screen.getByText("Check your inbox!")).toBeDefined();
});

test("shows error when passwords do not match", async () => {
  render(<SignUpForm />);

  await userEvent.type(screen.getByLabelText("Email"), "user@example.com");
  await userEvent.type(screen.getByLabelText("Password"), "password123");
  await userEvent.type(screen.getByLabelText("Confirm Password"), "different123");
  await userEvent.click(screen.getByRole("button", { name: "Sign Up" }));

  expect(screen.getByText("Passwords do not match")).toBeDefined();
  expect(mockUseAuth.signUp).not.toHaveBeenCalled();
});

test("shows error message when sign up fails", async () => {
  mockUseAuth.signUp.mockResolvedValue({ success: false, error: "Email already registered" });

  render(<SignUpForm />);

  await userEvent.type(screen.getByLabelText("Email"), "existing@example.com");
  await userEvent.type(screen.getByLabelText("Password"), "password123");
  await userEvent.type(screen.getByLabelText("Confirm Password"), "password123");
  await userEvent.click(screen.getByRole("button", { name: "Sign Up" }));

  expect(screen.getByText("Email already registered")).toBeDefined();
});

test("shows fallback error when sign up fails without message", async () => {
  mockUseAuth.signUp.mockResolvedValue({ success: false });

  render(<SignUpForm />);

  await userEvent.type(screen.getByLabelText("Email"), "user@example.com");
  await userEvent.type(screen.getByLabelText("Password"), "password123");
  await userEvent.type(screen.getByLabelText("Confirm Password"), "password123");
  await userEvent.click(screen.getByRole("button", { name: "Sign Up" }));

  expect(screen.getByText("Failed to sign up")).toBeDefined();
});

test("does not call onSuccess when sign up fails", async () => {
  mockUseAuth.signUp.mockResolvedValue({ success: false, error: "Email already registered" });
  const onSuccess = vi.fn();

  render(<SignUpForm onSuccess={onSuccess} />);

  await userEvent.type(screen.getByLabelText("Email"), "existing@example.com");
  await userEvent.type(screen.getByLabelText("Password"), "password123");
  await userEvent.type(screen.getByLabelText("Confirm Password"), "password123");
  await userEvent.click(screen.getByRole("button", { name: "Sign Up" }));

  expect(onSuccess).not.toHaveBeenCalled();
});

test("disables all fields and button while loading", () => {
  (useAuth as any).mockReturnValue({ ...mockUseAuth, isLoading: true });

  render(<SignUpForm />);

  expect(screen.getByLabelText("Email")).toHaveProperty("disabled", true);
  expect(screen.getByLabelText("Password")).toHaveProperty("disabled", true);
  expect(screen.getByLabelText("Confirm Password")).toHaveProperty("disabled", true);
  expect(screen.getByRole("button")).toHaveProperty("disabled", true);
});

test("shows loading text on button while loading", () => {
  (useAuth as any).mockReturnValue({ ...mockUseAuth, isLoading: true });

  render(<SignUpForm />);

  expect(screen.getByRole("button").textContent).toBe("Creating account...");
});

test("password field has minLength of 8", () => {
  render(<SignUpForm />);

  const passwordField = screen.getByLabelText("Password");
  expect(passwordField).toHaveProperty("minLength", 8);
});

test("shows minimum password length hint", () => {
  render(<SignUpForm />);

  expect(screen.getByText("Must be at least 8 characters long")).toBeDefined();
});
