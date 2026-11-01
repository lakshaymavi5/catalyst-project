import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Sun, Moon, LogOut, Wrench } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [isDark, setIsDark] = useState<boolean>(() => {
    return document.documentElement.classList.contains('dark') ||
      (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  return (
    <header className="bg-base-surface border-b border-base-border sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-3 group text-ink-primary">
          <div className="w-8 h-8 rounded-control bg-accent text-accent-text flex items-center justify-center">
            <Wrench className="w-4 h-4" />
          </div>
          <div>
            <span className="font-heading font-semibold text-lg tracking-tight block">
              Device Repair Assistant
            </span>
            <span className="text-[11px] text-ink-muted hidden sm:block tracking-wide">
              Official Diagnostic & Replacement Network
            </span>
          </div>
        </Link>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {isAuthenticated && user?.role === 'repairman' && (
            <div className="hidden sm:flex items-center gap-1.5 p-1 bg-base-muted/60 border border-base-border rounded-control text-xs">
              <Link
                to="/"
                className="px-2.5 py-1 rounded-control text-ink-primary hover:text-accent font-medium transition-colors"
              >
                Customer Flow
              </Link>
              <Link
                to="/dispatch"
                className="px-2.5 py-1 rounded-control text-ink-primary hover:text-accent font-medium transition-colors flex items-center gap-1"
              >
                <span>Shopkeeper Board</span>
              </Link>
            </div>
          )}

          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="p-2 rounded-control text-ink-secondary hover:text-ink-primary hover:bg-base-muted border border-transparent hover:border-base-border transition-colors"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {isAuthenticated && user ? (
            <div className="flex items-center gap-3 pl-2 border-l border-base-border">
              <div className="text-right hidden md:block">
                <span className="text-xs font-medium text-ink-primary block leading-tight">
                  {user.fullName}
                </span>
                <span className="text-[10px] text-accent uppercase tracking-wider block">
                  {user.role === 'repairman' ? (user.shopName ? `${user.shopName}` : 'Repair Specialist') : 'Customer'}
                </span>
              </div>
              <button
                type="button"
                onClick={logout}
                title="Sign out"
                aria-label="Sign out"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-ink-secondary hover:text-ink-primary bg-base-muted hover:bg-base-border rounded-control transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          ) : (
            <span className="text-xs text-ink-muted">Guest Session</span>
          )}
        </div>
      </div>
    </header>
  );
};
