import Socials from './Socials';

/**
 * Footer component with social links and copyright
 */
export default function Footer() {
  return (
    <footer className="mt-20 w-full border-t border-border">
      <div className="max-w-7xl mx-auto px-6">
        <div className="py-8 flex flex-col items-center gap-4">
          <Socials />
          <p className="text-sm text-muted-foreground text-center">
            © {new Date().getFullYear()} Lucci. The economic layer for open source.
          </p>
        </div>
      </div>
    </footer>
  );
}

