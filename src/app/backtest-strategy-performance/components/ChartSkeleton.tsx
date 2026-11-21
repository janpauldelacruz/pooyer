import React from 'react';

export default function ChartSkeleton({ height = 280 }: { height?: number }) {
  return <div className="w-full animate-pulse rounded-lg bg-muted" style={{ height }} />;
}