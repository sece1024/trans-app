function EmptyState({ icon, title, description }) {
  return (
    <div className="empty-state" role="status">
      <div className="empty-state-icon" aria-hidden="true">{icon}</div>
      <p className="empty-state-title">{title}</p>
      {description && <p className="empty-state-description">{description}</p>}
    </div>
  );
}

export default EmptyState;
