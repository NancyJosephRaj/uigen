import { test, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthDialog } from "../AuthDialog";

vi.mock("../SignInForm", () => ({
  SignInForm: ({ onSuccess }: any) => (
    <div data-testid="sign-in-form">
      <button onClick={onSuccess}>sign-in-submit</button>
    </div>
  ),
}));

vi.mock("../SignUpForm", () => ({
  SignUpForm: ({ onSuccess }: any) => (
    <div data-testid="sign-up-form">
      <button onClick={onSuccess}>sign-up-submit</button>
    </div>
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

test("renders sign in form by default", () => {
  render(<AuthDialog open={true} onOpenChange={vi.fn()} />);

  expect(screen.getByTestId("sign-in-form")).toBeDefined();
  expect(screen.queryByTestId("sign-up-form")).toBeNull();
});

test("renders sign up form when defaultMode is signup", () => {
  render(<AuthDialog open={true} onOpenChange={vi.fn()} defaultMode="signup" />);

  expect(screen.getByTestId("sign-up-form")).toBeDefined();
  expect(screen.queryByTestId("sign-in-form")).toBeNull();
});

test("shows correct title for sign in mode", () => {
  render(<AuthDialog open={true} onOpenChange={vi.fn()} />);

  expect(screen.getByText("Welcome back")).toBeDefined();
});

test("shows correct title for sign up mode", () => {
  render(<AuthDialog open={true} onOpenChange={vi.fn()} defaultMode="signup" />);

  expect(screen.getByText("Create an account")).toBeDefined();
});

test("switches to sign up form when link is clicked", async () => {
  render(<AuthDialog open={true} onOpenChange={vi.fn()} />);

  await userEvent.click(screen.getByRole("button", { name: "Sign up" }));

  expect(screen.getByTestId("sign-up-form")).toBeDefined();
  expect(screen.queryByTestId("sign-in-form")).toBeNull();
});

test("switches to sign in form when link is clicked", async () => {
  render(<AuthDialog open={true} onOpenChange={vi.fn()} defaultMode="signup" />);

  await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

  expect(screen.getByTestId("sign-in-form")).toBeDefined();
  expect(screen.queryByTestId("sign-up-form")).toBeNull();
});

test("calls onOpenChange(false) when form succeeds", async () => {
  const onOpenChange = vi.fn();

  render(<AuthDialog open={true} onOpenChange={onOpenChange} />);

  await userEvent.click(screen.getByRole("button", { name: "sign-in-submit" }));

  expect(onOpenChange).toHaveBeenCalledWith(false);
});

test("does not render content when closed", () => {
  render(<AuthDialog open={false} onOpenChange={vi.fn()} />);

  expect(screen.queryByTestId("sign-in-form")).toBeNull();
  expect(screen.queryByTestId("sign-up-form")).toBeNull();
});

test("updates mode when defaultMode prop changes", async () => {
  const { rerender } = render(
    <AuthDialog open={true} onOpenChange={vi.fn()} defaultMode="signin" />
  );

  expect(screen.getByTestId("sign-in-form")).toBeDefined();

  rerender(<AuthDialog open={true} onOpenChange={vi.fn()} defaultMode="signup" />);

  expect(screen.getByTestId("sign-up-form")).toBeDefined();
});
