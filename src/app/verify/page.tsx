import { verifyEmail } from "@/actions";
import { redirect } from "next/navigation";

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-2xl shadow-sm border p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4">❌</div>
          <h1 className="text-xl font-semibold mb-2">Invalid Link</h1>
          <p className="text-gray-500 text-sm">This verification link is missing a token.</p>
        </div>
      </div>
    );
  }

  const result = await verifyEmail(token);

  if (result.success) {
    redirect("/");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-sm border p-8 max-w-md w-full text-center">
        <div className="text-4xl mb-4">❌</div>
        <h1 className="text-xl font-semibold mb-2">Verification Failed</h1>
        <p className="text-gray-500 text-sm mb-6">{result.error}</p>
        <a href="/" className="text-sm text-blue-600 hover:underline">Back to home</a>
      </div>
    </div>
  );
}
