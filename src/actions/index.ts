"use server";

import bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { createSession, deleteSession, getSession } from "@/lib/auth";
import { sendVerificationEmail, sendPasswordResetEmail } from "@/lib/email";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export interface AuthResult {
  success: boolean;
  error?: string;
  message?: string;
}

export async function signUp(
  email: string,
  password: string
): Promise<AuthResult> {
  try {
    if (!email || !password)
      return { success: false, error: "Email and password are required" };

    if (password.length < 8)
      return { success: false, error: "Password must be at least 8 characters" };

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser)
      return { success: false, error: "Email already registered" };

    const hashedPassword = await bcrypt.hash(password, 10);
    const verifyToken = randomBytes(32).toString("hex");
    const verifyTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        verifyToken,
        verifyTokenExpiry,
      },
    });

    await sendVerificationEmail(email, verifyToken);

    return {
      success: true,
      message: "Account created! Check your email to verify your account.",
    };
  } catch (error) {
    console.error("Sign up error:", error);
    return { success: false, error: "An error occurred during sign up" };
  }
}

export async function verifyEmail(token: string): Promise<AuthResult> {
  try {
    const user = await prisma.user.findFirst({
      where: {
        verifyToken: token,
        verifyTokenExpiry: { gt: new Date() },
      },
    });

    if (!user)
      return { success: false, error: "Invalid or expired verification link" };

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verifyToken: null,
        verifyTokenExpiry: null,
      },
    });

    await createSession(user.id, user.email);
    return { success: true };
  } catch (error) {
    console.error("Verify email error:", error);
    return { success: false, error: "An error occurred during verification" };
  }
}

export async function forgotPassword(email: string): Promise<AuthResult> {
  try {
    const user = await prisma.user.findUnique({ where: { email } });

    // Always return success to prevent email enumeration
    if (!user)
      return { success: true, message: "If that email exists, a reset link has been sent." };

    const resetToken = randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1h

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiry },
    });

    await sendPasswordResetEmail(email, resetToken);

    return { success: true, message: "If that email exists, a reset link has been sent." };
  } catch (error) {
    console.error("Forgot password error:", error);
    return { success: false, error: "An error occurred. Please try again." };
  }
}

export async function resetPassword(
  token: string,
  password: string
): Promise<AuthResult> {
  try {
    if (password.length < 8)
      return { success: false, error: "Password must be at least 8 characters" };

    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: { gt: new Date() },
      },
    });

    if (!user)
      return { success: false, error: "Invalid or expired reset link" };

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    await createSession(user.id, user.email);
    return { success: true };
  } catch (error) {
    console.error("Reset password error:", error);
    return { success: false, error: "An error occurred. Please try again." };
  }
}

export async function signIn(
  email: string,
  password: string
): Promise<AuthResult> {
  try {
    if (!email || !password)
      return { success: false, error: "Email and password are required" };

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) return { success: false, error: "Invalid credentials" };

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword)
      return { success: false, error: "Invalid credentials" };

    if (!user.emailVerified)
      return { success: false, error: "Please verify your email before signing in" };

    await createSession(user.id, user.email);
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Sign in error:", error);
    return { success: false, error: "An error occurred during sign in" };
  }
}

export async function signOut() {
  await deleteSession();
  revalidatePath("/");
  redirect("/");
}

export async function getUser() {
  const session = await getSession();
  if (!session) return null;

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, email: true, emailVerified: true, createdAt: true },
    });
    return user;
  } catch (error) {
    console.error("Get user error:", error);
    return null;
  }
}
