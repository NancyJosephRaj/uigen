import { test, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SignInForm } from "../SignInForm";
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

test("renders email and password fields", () => {
  render(<SignInForm />);

  expect(screen.getByLabelText("Email")).toBeDefined();
  expect(screen.getByLabelText("Password")).toBeDefined();
  expect(screen.getByRole("button", { name: "Sign In" })).toBeDefined();
});

test("calls signIn with email and password on submit", async () => {
  mockUseAuth.signIn.mockResolvedValue({ success: true });

  render(<SignInForm />);

  await userEvent.type(screen.getByLabelText("Email"), "user@example.com");
  await userEvent.type(screen.getByLabelText("Password"), "password123");
  await userEvent.click(screen.getByRole("button", { name: "Sign In" }));

  expect(mockUseAuth.signIn).toHaveBeenCalledWith("user@example.com", "password123");
});

test("calls onSuccess when sign in succeeds", async () => {
  mockUseAuth.signIn.mockResolvedValue({ success: true });
  const onSuccess = vi.fn();

  render(<SignInForm onSuccess={onSuccess} />);

  await userEvent.type(screen.getByLabelText("Email"), "user@example.com");
  await userEvent.type(screen.getByLabelText("Password"), "password123");
  await userEvent.click(screen.getByRole("button", { name: "Sign In" }));

  expect(onSuccess).toHaveBeenCalled();
});

test("shows error message when sign in fails", async () => {
  mockUseAuth.signIn.mockResolvedValue({ success: false, error: "Invalid credentials" });

  render(<SignInForm />);

  await userEvent.type(screen.getByLabelText("Email"), "user@example.com");
  await userEvent.type(screen.getByLabelText("Password"), "wrongpassword");
  await userEvent.click(screen.getByRole("button", { name: "Sign In" }));

  expect(screen.getByText("Invalid credentials")).toBeDefined();
});

test("shows fallback error when sign in fails without message", async () => {
  mockUseAuth.signIn.mockResolvedValue({ success: false });

  render(<SignInForm />);

  await userEvent.type(screen.getByLabelText("Email"), "user@example.com");
  await userEvent.type(screen.getByLabelText("Password"), "password123");
  await userEvent.click(screen.getByRole("button", { name: "Sign In" }));

  expect(screen.getByText("Failed to sign in")).toBeDefined();
});

test("does not call onSuccess when sign in fails", async () => {
  mockUseAuth.signIn.mockResolvedValue({ success: false, error: "Invalid credentials" });
  const onSuccess = vi.fn();

  render(<SignInForm onSuccess={onSuccess} />);

  await userEvent.type(screen.getByLabelText("Email"), "user@example.com");
  await userEvent.type(screen.getByLabelText("Password"), "wrongpassword");
  await userEvent.click(screen.getByRole("button", { name: "Sign In" }));

  expect(onSuccess).not.toHaveBeenCalled();
});

test("disables fields and button while loading", () => {
  (useAuth as any).mockReturnValue({ ...mockUseAuth, isLoading: true });

  render(<SignInForm />);

  expect(screen.getByLabelText("Email")).toHaveProperty("disabled", true);
  expect(screen.getByLabelText("Password")).toHaveProperty("disabled", true);
  expect(screen.getByRole("button")).toHaveProperty("disabled", true);
});

test("shows loading text on button while loading", () => {
  (useAuth as any).mockReturnValue({ ...mockUseAuth, isLoading: true });

  render(<SignInForm />);

  expect(screen.getByRole("button").textContent).toBe("Signing in...");
});

test("clears error message on new submission", async () => {
  mockUseAuth.signIn
    .mockResolvedValueOnce({ success: false, error: "Invalid credentials" })
    .mockResolvedValueOnce({ success: true });

  render(<SignInForm />);

  await userEvent.type(screen.getByLabelText("Email"), "user@example.com");
  await userEvent.type(screen.getByLabelText("Password"), "wrongpassword");
  await userEvent.click(screen.getByRole("button", { name: "Sign In" }));

  expect(screen.getByText("Invalid credentials")).toBeDefined();

  await userEvent.click(screen.getByRole("button", { name: "Sign In" }));

  expect(screen.queryByText("Invalid credentials")).toBeNull();
});
