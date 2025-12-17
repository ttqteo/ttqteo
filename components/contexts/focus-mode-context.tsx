"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";

const FOCUS_MODE_KEY = "editor-focus-mode";

interface FocusModeContextType {
  focusMode: boolean;
  setFocusMode: (value: boolean) => void;
  toggleFocusMode: () => void;
}

const FocusModeContext = createContext<FocusModeContextType | undefined>(
  undefined
);

export function FocusModeProvider({ children }: { children: ReactNode }) {
  const [focusMode, setFocusModeState] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Load from sessionStorage on mount
  useEffect(() => {
    setMounted(true);
    const saved = sessionStorage.getItem(FOCUS_MODE_KEY);
    if (saved === "true") {
      setFocusModeState(true);
    }
  }, []);

  // Save to sessionStorage when changed
  const setFocusMode = useCallback((value: boolean) => {
    setFocusModeState(value);
    sessionStorage.setItem(FOCUS_MODE_KEY, String(value));

    // Add/remove class to body for CSS-based hiding
    if (value) {
      document.body.classList.add("focus-mode");
    } else {
      document.body.classList.remove("focus-mode");
    }
  }, []);

  const toggleFocusMode = useCallback(() => {
    setFocusMode(!focusMode);
  }, [focusMode, setFocusMode]);

  // Apply focus mode class on initial load
  useEffect(() => {
    if (mounted && focusMode) {
      document.body.classList.add("focus-mode");
    }
  }, [mounted, focusMode]);

  // Keyboard shortcut: Cmd/Ctrl + Shift + F
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "f") {
        e.preventDefault();
        toggleFocusMode();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleFocusMode]);

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <FocusModeContext.Provider
        value={{ focusMode: false, setFocusMode, toggleFocusMode }}
      >
        {children}
      </FocusModeContext.Provider>
    );
  }

  return (
    <FocusModeContext.Provider
      value={{ focusMode, setFocusMode, toggleFocusMode }}
    >
      {children}
    </FocusModeContext.Provider>
  );
}

export function useFocusMode() {
  const context = useContext(FocusModeContext);
  if (context === undefined) {
    throw new Error("useFocusMode must be used within a FocusModeProvider");
  }
  return context;
}
