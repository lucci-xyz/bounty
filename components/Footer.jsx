import Socials from './Socials';

/**
 * Footer component with social links and copyright
 */
export default function Footer() {
  return (
    <footer 
      className="mt-8 w-full max-w-[100vw]" 
      style={{ 
        backgroundColor: 'var(--color-background)'
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>
        <div className="py-8 flex flex-col items-center gap-3">
          <Socials />
          <div className="text-sm text-center w-full" style={{ color: 'var(--color-primary)' }}>
            <p>© {new Date().getFullYear()} Lucci. The economic layer for open source.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}

