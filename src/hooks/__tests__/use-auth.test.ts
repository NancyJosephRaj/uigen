import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAuth } from "@/hooks/use-auth";
import * as actions from "@/actions";
import * as anonTracker from "@/lib/anon-work-tracker";
import * as getProjectsModule from "@/actions/get-projects";
import * as createProjectModule from "@/actions/create-project";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/actions", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: vi.fn(),
  clearAnonWork: vi.fn(),
}));

vi.mock("@/actions/get-projects", () => ({
  getProjects: vi.fn(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: vi.fn(),
}));

const mockSignIn = vi.mocked(actions.signIn);
const mockSignUp = vi.mocked(actions.signUp);
const mockGetAnonWorkData = vi.mocked(anonTracker.getAnonWorkData);
const mockClearAnonWork = vi.mocked(anonTracker.clearAnonWork);
const mockGetProjects = vi.mocked(getProjectsModule.getProjects);
const mockCreateProject = vi.mocked(createProjectModule.createProject);

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAnonWorkData.mockReturnValue(null);
    mockGetProjects.mockResolvedValue([]);
    mockCreateProject.mockResolvedValue({ id: "new-proj-1" } as any);
  });

  // ─── Initial state ───────────────────────────────────────────────

  test("initializes with isLoading false", () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.isLoading).toBe(false);
  });

  test("exposes signIn, signUp, and isLoading", () => {
    const { result } = renderHook(() => useAuth());
    expect(typeof result.current.signIn).toBe("function");
    expect(typeof result.current.signUp).toBe("function");
    expect(typeof result.current.isLoading).toBe("boolean");
  });

  // ─── signIn – happy paths ─────────────────────────────────────────

  describe("signIn", () => {
    test("sets isLoading true during request then false after", async () => {
      let resolveSignIn!: (v: any) => void;
      mockSignIn.mockReturnValue(new Promise((r) => (resolveSignIn = r)));
      mockGetProjects.mockResolvedValue([{ id: "p1" } as any]);

      const { result } = renderHook(() => useAuth());

      let promise: Promise<any>;
      act(() => {
        promise = result.current.signIn("a@b.com", "password");
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveSignIn({ success: true });
        await promise;
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("returns the result from signInAction", async () => {
      mockSignIn.mockResolvedValue({ success: false, error: "Invalid credentials" });

      const { result } = renderHook(() => useAuth());
      const returnValue = await act(() => result.current.signIn("a@b.com", "wrong"));

      expect(returnValue).toEqual({ success: false, error: "Invalid credentials" });
    });

    test("calls signInAction with provided credentials", async () => {
      mockSignIn.mockResolvedValue({ success: false, error: "Invalid credentials" });

      const { result } = renderHook(() => useAuth());
      await act(() => result.current.signIn("user@example.com", "secret123"));

      expect(mockSignIn).toHaveBeenCalledWith("user@example.com", "secret123");
    });

    test("does not navigate on failed sign-in", async () => {
      mockSignIn.mockResolvedValue({ success: false, error: "Invalid credentials" });

      const { result } = renderHook(() => useAuth());
      await act(() => result.current.signIn("a@b.com", "wrong"));

      expect(mockPush).not.toHaveBeenCalled();
    });

    test("success with anon work: creates project, clears anon work, redirects", async () => {
      const anonWork = {
        messages: [{ id: "1", role: "user", content: "hi" }],
        fileSystemData: { "/App.jsx": {} },
      };
      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(anonWork as any);
      mockCreateProject.mockResolvedValue({ id: "anon-proj" } as any);

      const { result } = renderHook(() => useAuth());
      await act(() => result.current.signIn("a@b.com", "password"));

      expect(mockCreateProject).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: anonWork.messages,
          data: anonWork.fileSystemData,
        })
      );
      expect(mockClearAnonWork).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/anon-proj");
      expect(mockGetProjects).not.toHaveBeenCalled();
    });

    test("success with empty anon messages: skips anon path", async () => {
      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue({ messages: [], fileSystemData: {} } as any);
      mockGetProjects.mockResolvedValue([{ id: "existing-proj" } as any]);

      const { result } = renderHook(() => useAuth());
      await act(() => result.current.signIn("a@b.com", "password"));

      expect(mockCreateProject).not.toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/existing-proj");
    });

    test("success with null anon work and existing projects: redirects to first project", async () => {
      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([
        { id: "proj-1" } as any,
        { id: "proj-2" } as any,
      ]);

      const { result } = renderHook(() => useAuth());
      await act(() => result.current.signIn("a@b.com", "password"));

      expect(mockGetProjects).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/proj-1");
      expect(mockCreateProject).not.toHaveBeenCalled();
    });

    test("success with no existing projects: creates new project and redirects", async () => {
      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([]);
      mockCreateProject.mockResolvedValue({ id: "brand-new" } as any);

      const { result } = renderHook(() => useAuth());
      await act(() => result.current.signIn("a@b.com", "password"));

      expect(mockCreateProject).toHaveBeenCalledWith(
        expect.objectContaining({ messages: [], data: {} })
      );
      expect(mockPush).toHaveBeenCalledWith("/brand-new");
    });

    test("resets isLoading to false even when signInAction throws", async () => {
      mockSignIn.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        try {
          await result.current.signIn("a@b.com", "password");
        } catch {
          // expected
        }
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  // ─── signUp – happy paths ─────────────────────────────────────────

  describe("signUp", () => {
    test("sets isLoading true during request then false after", async () => {
      let resolveSignUp!: (v: any) => void;
      mockSignUp.mockReturnValue(new Promise((r) => (resolveSignUp = r)));
      mockGetProjects.mockResolvedValue([{ id: "p1" } as any]);

      const { result } = renderHook(() => useAuth());

      let promise: Promise<any>;
      act(() => {
        promise = result.current.signUp("a@b.com", "password");
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveSignUp({ success: true });
        await promise;
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("returns the result from signUpAction", async () => {
      mockSignUp.mockResolvedValue({ success: false, error: "Email already registered" });

      const { result } = renderHook(() => useAuth());
      const returnValue = await act(() => result.current.signUp("a@b.com", "password"));

      expect(returnValue).toEqual({ success: false, error: "Email already registered" });
    });

    test("calls signUpAction with provided credentials", async () => {
      mockSignUp.mockResolvedValue({ success: false, error: "Email already registered" });

      const { result } = renderHook(() => useAuth());
      await act(() => result.current.signUp("new@example.com", "secret123"));

      expect(mockSignUp).toHaveBeenCalledWith("new@example.com", "secret123");
    });

    test("does not navigate on failed sign-up", async () => {
      mockSignUp.mockResolvedValue({ success: false, error: "Email already registered" });

      const { result } = renderHook(() => useAuth());
      await act(() => result.current.signUp("a@b.com", "password"));

      expect(mockPush).not.toHaveBeenCalled();
    });

    test("success with anon work: creates project, clears anon work, redirects", async () => {
      const anonWork = {
        messages: [{ id: "1", role: "user", content: "hello" }],
        fileSystemData: { "/App.jsx": {} },
      };
      mockSignUp.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(anonWork as any);
      mockCreateProject.mockResolvedValue({ id: "signup-anon-proj" } as any);

      const { result } = renderHook(() => useAuth());
      await act(() => result.current.signUp("new@example.com", "password123"));

      expect(mockCreateProject).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: anonWork.messages,
          data: anonWork.fileSystemData,
        })
      );
      expect(mockClearAnonWork).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/signup-anon-proj");
    });

    test("success with no anon work and no projects: creates new project", async () => {
      mockSignUp.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([]);
      mockCreateProject.mockResolvedValue({ id: "first-proj" } as any);

      const { result } = renderHook(() => useAuth());
      await act(() => result.current.signUp("new@example.com", "password123"));

      expect(mockCreateProject).toHaveBeenCalledWith(
        expect.objectContaining({ messages: [], data: {} })
      );
      expect(mockPush).toHaveBeenCalledWith("/first-proj");
    });

    test("success with existing projects: redirects to first project", async () => {
      mockSignUp.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([{ id: "existing" } as any]);

      const { result } = renderHook(() => useAuth());
      await act(() => result.current.signUp("new@example.com", "password123"));

      expect(mockPush).toHaveBeenCalledWith("/existing");
    });

    test("resets isLoading to false even when signUpAction throws", async () => {
      mockSignUp.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        try {
          await result.current.signUp("a@b.com", "password");
        } catch {
          // expected
        }
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  // ─── Edge cases ───────────────────────────────────────────────────

  describe("edge cases", () => {
    test("anon work project name includes current time", async () => {
      const anonWork = {
        messages: [{ id: "1", role: "user", content: "hi" }],
        fileSystemData: {},
      };
      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(anonWork as any);
      mockCreateProject.mockResolvedValue({ id: "t-proj" } as any);

      const { result } = renderHook(() => useAuth());
      await act(() => result.current.signIn("a@b.com", "password"));

      const callArg = mockCreateProject.mock.calls[0][0];
      expect(callArg.name).toMatch(/^Design from /);
    });

    test("new project name is random and non-empty when no anon work and no projects", async () => {
      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([]);
      mockCreateProject.mockResolvedValue({ id: "rand-proj" } as any);

      const { result } = renderHook(() => useAuth());
      await act(() => result.current.signIn("a@b.com", "password"));

      const callArg = mockCreateProject.mock.calls[0][0];
      expect(callArg.name).toMatch(/^New Design #\d+$/);
    });

    test("clearAnonWork is not called when there is no anon work", async () => {
      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([{ id: "p1" } as any]);

      const { result } = renderHook(() => useAuth());
      await act(() => result.current.signIn("a@b.com", "password"));

      expect(mockClearAnonWork).not.toHaveBeenCalled();
    });
  });
});
