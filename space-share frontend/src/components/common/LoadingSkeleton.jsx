import React from 'react';

export const VenueCardSkeleton = () => {
  return (
    <div className="bg-surface-container-lowest rounded-2xl overflow-hidden border border-outline-variant/30 shadow-card animate-pulse">
      <div className="w-full h-52 bg-surface-container-high" />
      <div className="p-5 space-y-3">
        <div className="flex justify-between items-center">
          <div className="h-4 bg-surface-container-high rounded w-28" />
          <div className="h-4 bg-surface-container-high rounded w-12" />
        </div>
        <div className="h-6 bg-surface-container-high rounded w-3/4" />
        <div className="h-4 bg-surface-container-high rounded w-1/2" />
        <div className="pt-3 border-t border-outline-variant/20 flex justify-between items-center">
          <div className="h-6 bg-surface-container-high rounded w-24" />
          <div className="h-8 bg-surface-container-high rounded-xl w-24" />
        </div>
      </div>
    </div>
  );
};

export const TableRowSkeleton = () => {
  return (
    <tr className="animate-pulse border-b border-outline-variant/20">
      <td className="py-4 px-4"><div className="h-4 bg-surface-container-high rounded w-32" /></td>
      <td className="py-4 px-4"><div className="h-4 bg-surface-container-high rounded w-24" /></td>
      <td className="py-4 px-4"><div className="h-4 bg-surface-container-high rounded w-20" /></td>
      <td className="py-4 px-4"><div className="h-6 bg-surface-container-high rounded-full w-20" /></td>
      <td className="py-4 px-4 text-right"><div className="h-8 bg-surface-container-high rounded-xl w-16 ml-auto" /></td>
    </tr>
  );
};
