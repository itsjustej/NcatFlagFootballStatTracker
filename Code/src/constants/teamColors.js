export const TEAM_COLORS = {
  home: {
    primary: '#004B87',
    light:   '#2563eb',
    muted:   '#3b82f6',
    glow:    'rgba(0, 75, 135, 0.35)',
    bg:      'rgba(0, 75, 135, 0.75)',
  },
  away: {
    primary: '#C9A84C',
    light:   '#d4b85c',
    muted:   '#C9A84C',
    glow:    'rgba(201, 168, 76, 0.35)',
    bg:      'rgba(201, 168, 76, 0.75)',
  },
};

export function teamColor(side) {
  return TEAM_COLORS[side] ?? TEAM_COLORS.home;
}

export function possessionColor(possession) {
  return TEAM_COLORS[possession]?.primary ?? TEAM_COLORS.home.primary;
}
