"use client";

import { useState } from "react";
import Link from "next/link";
import { forgotPassword } from "@/actions";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    const result = await forgotPassword(email);
    setMessage(result.message || result.error || "");
    setStatus("done");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-sm border p-8 max-w-md w-full">
        <h1 className="text-xl font-semibold mb-1">Forgot password</h1>
        <p className="text-gray-500 text-sm mb-6">
          Enter your email and we&apos;ll send a reset link.
        </p>

        {status === "done" ? (
          <div className="text-center">
            <div className="text-4xl mb-4">📬</div>
            <p className="text-gray-700 text-sm mb-6">{message}</p>
            <Link href="/" className="text-sm text-blue-600 hover:underline">Back to home</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="you@example.com"
              />
            </div>
            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full bg-black text-white py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {status === "loading" ? "Sending..." : "Send reset link"}
            </button>
            <p className="text-center text-sm text-gray-500">
              <Link href="/" className="text-blue-600 hover:underline">Back to home</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
