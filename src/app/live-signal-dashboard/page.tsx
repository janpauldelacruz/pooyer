import React from 'react';
import LiveSignalDashboard from '../components/LiveSignalDashboard';

// Alias route: the entry screen is built at src/app/page.tsx ("/"),
// this route renders the same dashboard so /live-signal-dashboard resolves.
export default function Page() {
  return <LiveSignalDashboard />;
}