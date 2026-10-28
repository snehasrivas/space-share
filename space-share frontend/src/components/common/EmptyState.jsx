import React from 'react';
import { Link } from 'react-router-dom';

const EmptyState = ({
  icon = 'event_busy',
  title = 'No items found',
  description = 'Try adjusting your filters or search terms.',
  actionLabel,
  actionLink,
  onAction,
}) => {
  return (
    <div className="w-full flex flex-col items-center justify-center p-12 text-center bg-surface-container-lowest rounded-2xl border border-outline-variant/30 my-6 shadow-sm">
      <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center text-primary mb-4">
        <span className="material-symbols-outlined text-3xl">{icon}</span>
      </div>
      <h3 className="text-xl font-bold font-headline text-on-surface mb-2">{title}</h3>
      <p className="text-on-surface-variant max-w-md text-sm mb-6 leading-relaxed">
        {description}
      </p>
      {actionLabel && actionLink && (
        <Link
          to={actionLink}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary-container text-white font-medium hover:bg-primary transition shadow-sm"
        >
          {actionLabel}
        </Link>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary-container text-white font-medium hover:bg-primary transition shadow-sm"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
