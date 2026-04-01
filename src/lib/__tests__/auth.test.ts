// @vitest-environment node
import { test, expect, vi, beforeEach } from "vitest";

const mockCookieStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock("server-only", () => ({}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

import { createSession, getSession, deleteSession } from "@/lib/auth";

beforeEach(() => {
  vi.clearAllMocks();
});

test("createSession sets an httpOnly cookie", async () => {
  await createSession("user-123", "user@example.com");

  expect(mockCookieStore.set).toHaveBeenCalledOnce();

  const [name, _token, options] = mockCookieStore.set.mock.calls[0];
  expect(name).toBe("auth-token");
  expect(options.httpOnly).toBe(true);
  expect(options.path).toBe("/");
  expect(options.sameSite).toBe("lax");
});

test("createSession cookie expires in ~7 days", async () => {
  const before = Date.now();
  await createSession("user-123", "user@example.com");
  const after = Date.now();

  const [, , options] = mockCookieStore.set.mock.calls[0];
  const expiresMs = options.expires.getTime();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;

  expect(expiresMs).toBeGreaterThanOrEqual(before + sevenDays - 1000);
  expect(expiresMs).toBeLessThanOrEqual(after + sevenDays + 1000);
});

test("createSession stores a signed JWT token", async () => {
  await createSession("user-123", "user@example.com");

  const [, token] = mockCookieStore.set.mock.calls[0];
  const parts = token.split(".");
  expect(parts).toHaveLength(3);
});

test("getSession returns null when no cookie exists", async () => {
  mockCookieStore.get.mockReturnValue(undefined);

  const session = await getSession();

  expect(session).toBeNull();
});

test("getSession returns payload after createSession", async () => {
  let storedToken = "";
  mockCookieStore.set.mockImplementation((_name: string, token: string) => {
    storedToken = token;
  });
  mockCookieStore.get.mockImplementation(() => ({ value: storedToken }));

  await createSession("user-123", "user@example.com");
  const session = await getSession();

  expect(session).not.toBeNull();
  expect(session?.userId).toBe("user-123");
  expect(session?.email).toBe("user@example.com");
});

test("getSession returns null for a tampered token", async () => {
  mockCookieStore.get.mockReturnValue({ value: "invalid.token.value" });

  const session = await getSession();

  expect(session).toBeNull();
});

test("deleteSession removes the auth-token cookie", async () => {
  await deleteSession();

  expect(mockCookieStore.delete).toHaveBeenCalledWith("auth-token");
});
