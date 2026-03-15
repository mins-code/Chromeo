import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Layout } from './Layout';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';

// Mock dependencies
vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as any),
    Plus: () => <div data-testid="icon-plus" />,
  };
});

vi.mock('./MiniCalendar', () => ({
  default: () => <div data-testid="mini-calendar" />
}));

const mockProps = {
  currentView: 'dashboard' as const,
  onNavigate: vi.fn(),
  onAddTask: vi.fn(),
  userStats: {
    userName: 'Test User',
    pendingTasks: 5,
    totalTasks: 10,
    budgetRemaining: 1000,
  },
  currentTheme: 'light' as const,
  onThemeChange: vi.fn(),
  calendarTags: [],
  selectedTags: [],
  onToggleTag: vi.fn(),
  viewSourceMode: 'personal' as const,
  onViewSourceModeChange: vi.fn(),
};

describe('Layout Accessibility', () => {
  it('should have proper ARIA attributes on the Create button', async () => {
    render(
      <BrowserRouter>
        <Layout {...mockProps}>
          <div>Child Content</div>
        </Layout>
      </BrowserRouter>
    );

    // The create button contains the Plus icon and the text "Create"
    const createButton = screen.getAllByRole('button').find(
      btn => btn.textContent?.includes('Create') && btn.querySelector('[data-testid="icon-plus"]')
    );

    expect(createButton).toBeTruthy();
    expect(createButton?.getAttribute('aria-expanded')).toBe('false');
    expect(createButton?.getAttribute('aria-haspopup')).toBe('true');
  });

  it('should toggle aria-expanded when Create button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <BrowserRouter>
        <Layout {...mockProps}>
          <div>Child Content</div>
        </Layout>
      </BrowserRouter>
    );

    const createButton = screen.getAllByRole('button').find(
      btn => btn.textContent?.includes('Create') && btn.querySelector('[data-testid="icon-plus"]')
    );

    expect(createButton).toBeTruthy();

    // Initial state
    expect(createButton?.getAttribute('aria-expanded')).toBe('false');

    // Click to open
    await user.click(createButton!);
    expect(createButton?.getAttribute('aria-expanded')).toBe('true');

    // Click to close
    await user.click(createButton!);
    expect(createButton?.getAttribute('aria-expanded')).toBe('false');
  });

  it('should have proper ARIA attributes on Theme and Settings buttons', () => {
    render(
      <BrowserRouter>
        <Layout {...mockProps}>
          <div>Child Content</div>
        </Layout>
      </BrowserRouter>
    );

    // Get all buttons that match our new aria-labels
    const themeButtons = screen.getAllByRole('button', { name: 'Toggle theme' });
    const settingsButtons = screen.getAllByRole('button', { name: 'Settings' });

    // Ensure we found them
    expect(themeButtons.length).toBeGreaterThan(0);
    expect(settingsButtons.length).toBeGreaterThan(0);

    // Make sure they have titles
    themeButtons.forEach(btn => expect(btn.getAttribute('title')).toBe('Toggle Theme'));
    settingsButtons.forEach(btn => expect(btn.getAttribute('title')).toBe('Settings'));
  });
});
