/**
 * Reusable page header component with icon and description
 */
export default function PageHeader({ icon: Icon, iconColor = "var(--color-primary)", title, subtitle }) {
  return (
    <div className="page-header text-center animate-fade-in-up">
      <div className="flex items-center justify-center gap-3 mb-4">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(131, 238, 232, 0.15)' }}>
          <Icon size={32} color={iconColor} />
        </div>
      </div>
      <h1 className="page-title">
        {title}
      </h1>
      {subtitle && (
        <p className="page-subtitle">
          {subtitle}
        </p>
      )}
    </div>
  );
}

