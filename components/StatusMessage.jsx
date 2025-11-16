/**
 * Status message display component
 */
export default function StatusMessage({ message, type }) {
  if (!message) return null;

  return (
    <div className={`status ${type}`}>
      {message}
    </div>
  );
}

