/**
 * Layout for unauthenticated pages (login, register).
 * Centers the form vertically and horizontally, mirrors the mobile centered scroll view.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
      {children}
    </div>
  );
}
