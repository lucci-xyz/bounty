import Link from 'next/link';

/**
 * Renders a simple 404 Not Found page informing the user they are on a missing route.
 * Includes a message, a suggestion, and a button to return to the home page.
 */
export default function NotFound() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-24 text-center">
      {/* Error code display */}
      <p className="mb-8 inline-flex items-center justify-center rounded-full bg-primary/10 px-5 py-2 text-[12px] font-semibold uppercase tracking-[0.4em] text-primary">
        404
      </p>

      {/* Main not found heading */}
      <h1 className="text-4xl md:text-5xl font-light tracking-tight mb-6 text-foreground/90">
        We couldn’t find that page
      </h1>

      {/* Explanation and helpful message */}
      <p className="text-base text-muted-foreground max-w-2xl mx-auto mb-14 leading-relaxed">
        The link you followed might be broken or the page may have been moved. Let’s get you
        back to something useful.
      </p>

      {/* Button to navigate back to home */}
      <div className="flex justify-center mt-6">
        <Link href="/">
          <button className="px-6 py-3 rounded-full text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
            Browse bounties
          </button>
        </Link>
      </div>
    </div>
  );
}