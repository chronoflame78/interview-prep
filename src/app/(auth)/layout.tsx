export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="bg-card w-full max-w-md rounded-lg border p-8 shadow-sm">
        {children}
      </div>
    </div>
  );
}
