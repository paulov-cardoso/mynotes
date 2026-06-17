// ── Catálogo de Temas — Mynotes ─────────────────────────────────────────────


export type ThemeName = "pastel" | "colormode" | "darkmode";

export interface ThemeTokens {
  background: {
    gradient: string;
    navGradient: string;
  };
  surface: {
    glass: string;
    glassHover: string;
    glassStrong: string;
    solid: string;
  };
  border: {
    subtle: string;
    strong: string;
  };
  text: {
    primary: string;
    secondary: string;
    muted: string;
    faint: string;
  };
  shadowRgb: string;
  accent: {
    gradientFab: string;
    solid: string;
    ring: string;
    ringRgb: string;
    onAccent: string;
  };
  danger: {
    text: string;
    rgb: string;
  };
}

const pastel: ThemeTokens = {
  background: {
    gradient: "linear-gradient(155deg, #d4b8d4 0%, #e2cde2 45%, #eddaed 100%)",
    navGradient: "linear-gradient(155deg, #6b4e9e 0%, #a978b0 50%, #c9967a 100%)",
  },
  surface: {
    glass: "rgba(255,255,255,0.55)",
    glassHover: "rgba(255,255,255,0.85)",
    glassStrong: "rgba(255,255,255,0.92)",
    solid: "rgba(255,255,255,0.95)",
  },
  border: {
    subtle: "rgba(255,255,255,0.65)",
    strong: "rgba(255,255,255,0.80)",
  },
  text: {
    primary: "#2d1b5e",
    secondary: "#4a3470",
    muted: "#6b5a8a",
    faint: "#8b7aaa",
  },
  shadowRgb: "120,80,160",
  accent: {
    gradientFab: "linear-gradient(135deg, #9b7bc4 0%, #c79bd1 100%)",
    solid: "#7c5ab8",
    ring: "#a78bfa",
    ringRgb: "167,139,250",
    onAccent: "#ffffff",
  },
  danger: {
    text: "#dc2626",
    rgb: "239,68,68",
  },
};

const colormode: ThemeTokens = {
  background: {
    gradient:
      "linear-gradient(155deg, #1a1040 0%, #2d1558 40%, #3d1a44 70%, #5a2015 100%)",
    navGradient:
      "linear-gradient(155deg, #3a2d9e 0%, #6832b5 40%, #9a3aaa 65%, #c85838 100%)",
  },
  surface: {
    glass: "rgba(255,255,255,0.10)",
    glassHover: "rgba(255,255,255,0.18)",
    glassStrong: "#141420",
    solid: "#0f0f1a",
  },
  border: {
    subtle: "rgba(255,255,255,0.10)",
    strong: "rgba(255,255,255,0.18)",
  },
  text: {
    primary: "rgba(255,255,255,0.92)",
    secondary: "rgba(255,255,255,0.65)",
    muted: "rgba(255,255,255,0.45)",
    faint: "rgba(255,255,255,0.25)",
  },
  shadowRgb: "0,0,0",
  accent: {
    gradientFab: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
    solid: "#fb923c",
    ring: "#fb923c",
    ringRgb: "251,146,60",
    onAccent: "#ffffff",
  },
  danger: {
    text: "#f87171",
    rgb: "248,113,113",
  },
};

const darkmode: ThemeTokens = {
  background: {
    gradient: "linear-gradient(155deg, #000000 0%, #0d0d0d 50%, #000000 100%)",
    navGradient: "linear-gradient(155deg, #000000 0%, #050505 50%, #000000 100%)",
  },
  surface: {
    glass: "rgba(255,255,255,0.08)",
    glassHover: "rgba(255,255,255,0.16)",
    glassStrong: "#000000",
    solid: "#000000",
  },
  border: {
    subtle: "rgba(255,255,255,0.15)",
    strong: "rgba(255,255,255,0.40)",
  },
  text: {
    primary: "#ffffff",
    secondary: "rgba(255,255,255,0.70)",
    muted: "rgba(255,255,255,0.45)",
    faint: "rgba(255,255,255,0.25)",
  },
  shadowRgb: "255,255,255",
  accent: {
    gradientFab: "linear-gradient(135deg, #ffffff 0%, #d9d9d9 100%)",
    solid: "#ffffff",
    ring: "#ffffff",
    ringRgb: "255,255,255",
    onAccent: "#000000",
  },
  danger: {
    text: "#ff5c5c",
    rgb: "255,92,92",
  },
};

export const THEMES: Record<ThemeName, ThemeTokens> = {
  pastel,
  colormode,
  darkmode,
};

export const THEME_ORDER: ThemeName[] = ["pastel", "colormode", "darkmode"];
