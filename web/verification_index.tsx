import { createRoot } from 'react-dom/client';
import React from 'react';
import RoutineCard from './components/RoutineCard';

const mockRoutine = {
  id: 'test-1',
  name: 'Morning Workout',
  isActive: true,
  pattern: { type: 'daily' },
  time: '07:00 AM',
  duration: 45,
};

const mockRoutine2 = {
  id: 'test-2',
  name: 'Evening Reading',
  isActive: false,
  pattern: { type: 'daily' },
  time: '09:00 PM',
  duration: 30,
};

const App = () => {
  return (
    <div style={{ padding: '2rem', display: 'flex', gap: '1rem', flexDirection: 'column' }}>
      <RoutineCard routine={mockRoutine} onEdit={() => {}} onDelete={() => {}} onToggle={() => {}} />
      <RoutineCard routine={mockRoutine2} onEdit={() => {}} onDelete={() => {}} onToggle={() => {}} />
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
