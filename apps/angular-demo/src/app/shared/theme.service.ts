/** App theming. Plata is the brand default; dark/high-contrast remain for the theme toggle. */
import { Injectable } from '@angular/core';

export type ThemeName = 'plata' | 'dark' | 'high-contrast';

export interface ThemeTokens {
  background: string;
  surface: string;
  foreground: string;
  accent: string;
  radius: string;
}

const THEMES: Record<ThemeName, ThemeTokens> = {
  plata: { background: '#f7f7f8', surface: '#ffffff', foreground: '#0a0a0a', accent: '#ff5000', radius: '10px' },
  dark: { background: '#101114', surface: '#1a1c20', foreground: '#f4f4f5', accent: '#ff711f', radius: '10px' },
  'high-contrast': { background: '#000000', surface: '#000000', foreground: '#ffffff', accent: '#ffd400', radius: '4px' },
};

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private current: ThemeName = 'plata';

  setTheme(name: ThemeName): void {
    this.current = name;
  }

  get theme(): ThemeName {
    return this.current;
  }

  tokens(): ThemeTokens {
    return THEMES[this.current];
  }

  toggle(): ThemeName {
    this.current = this.current === 'plata' ? 'dark' : 'plata';
    return this.current;
  }

  cssVariables(): Record<string, string> {
    const t = this.tokens();
    return {
      '--ds-bg': t.background,
      '--ds-surface': t.surface,
      '--ds-fg': t.foreground,
      '--ds-accent': t.accent,
      '--ds-radius': t.radius,
    };
  }
}
