import React from 'react';

const StatusBadge = ({ type, status, className = '' }) => {
  const normStatus = (status || '').toLowerCase();

  let bgClass = 'bg-secondary-container text-on-secondary-container';
  let icon = 'info';
  let label = status;

  if (type === 'verification') {
    if (normStatus === 'approved' || normStatus === 'verified') {
      bgClass = 'bg-tertiary-container/15 text-tertiary border border-tertiary/20';
      icon = 'verified';
      label = 'Verified';
    } else if (normStatus === 'pending') {
      bgClass = 'bg-amber-500/15 text-amber-700 border border-amber-500/20';
      icon = 'schedule';
      label = 'Under Review';
    } else if (normStatus === 'rejected') {
      bgClass = 'bg-error/15 text-error border border-error/20';
      icon = 'cancel';
      label = 'Rejected';
    } else {
      bgClass = 'bg-secondary-container text-secondary border border-outline-variant/30';
      icon = 'help_outline';
      label = 'Unverified';
    }
  } else if (type === 'booking') {
    if (normStatus === 'confirmed') {
      bgClass = 'bg-tertiary-container/15 text-tertiary border border-tertiary/20';
      icon = 'check_circle';
      label = 'Confirmed';
    } else if (normStatus === 'pending') {
      bgClass = 'bg-amber-500/15 text-amber-700 border border-amber-500/20';
      icon = 'hourglass_empty';
      label = 'Pending';
    } else if (normStatus === 'cancelled') {
      bgClass = 'bg-error/15 text-error border border-error/20';
      icon = 'close';
      label = 'Cancelled';
    } else if (normStatus === 'completed') {
      bgClass = 'bg-blue-500/15 text-blue-700 border border-blue-500/20';
      icon = 'task_alt';
      label = 'Completed';
    }
  } else if (type === 'payment') {
    if (normStatus === 'paid') {
      bgClass = 'bg-tertiary-container/15 text-tertiary border border-tertiary/20';
      icon = 'paid';
      label = 'Paid';
    } else if (normStatus === 'unpaid') {
      bgClass = 'bg-amber-500/15 text-amber-700 border border-amber-500/20';
      icon = 'pending';
      label = 'Unpaid';
    } else if (normStatus === 'refunded') {
      bgClass = 'bg-purple-500/15 text-purple-700 border border-purple-500/20';
      icon = 'currency_exchange';
      label = 'Refunded';
    } else if (normStatus === 'failed') {
      bgClass = 'bg-error/15 text-error border border-error/20';
      icon = 'error_outline';
      label = 'Failed';
    }
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide capitalize ${bgClass} ${className}`}
    >
      <span className="material-symbols-outlined text-[15px]">{icon}</span>
      <span>{label}</span>
    </span>
  );
};

export default StatusBadge;
