/**
 * App Layout - Wrapper for all /app/* routes
 * Provides proper spacing for the floating navbar and clean background
 */
export default function AppLayout({ children }) {
  return (
    <div className="pt-20 bg-background min-h-screen">
      {children}
    </div>
  );
}

