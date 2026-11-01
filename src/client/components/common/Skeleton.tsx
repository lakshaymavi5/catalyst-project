import React from 'react';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', width, height }) => {
  return (
    <div
      role="status"
      aria-label="Loading content"
      className={`bg-base-muted/70 animate-pulse rounded-control ${className}`}
      style={{
        width: width !== undefined ? width : undefined,
        height: height !== undefined ? height : undefined
      }}
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
};
