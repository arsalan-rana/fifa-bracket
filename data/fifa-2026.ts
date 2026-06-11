export type Phase =
  | 'group'
  | 'round32'
  | 'round16'
  | 'quarter'
  | 'semi'
  | 'final';

export interface Team {
  code: string;
  name: string;
  flag: string;
  group: string;
  primaryColor: string;
  secondaryColor: string;
  confederation: string;
}

export interface Fixture {
  matchNumber: number;
  phase: Phase;
  group?: string;
  team1: string; // team code
  team2: string; // team code
  venue: string;
  city: string;
  date: string; // ISO date string (UTC noon approximation)
  canDraw: boolean; // group stage can draw; knockout = false
  aiPrediction?: string; // team code or "DRAW"
}

export interface PhaseConfig {
  id: Phase;
  name: string;
  shortName: string;
  deadline: string; // ISO datetime
  color: string;
  icon: string;
  scoringType: 'fixed' | 'pool';
  fixedPoints?: number;
  poolPoints?: number;
  chipsAvailable: string[];
}

export interface BonusQuestion {
  id: string;
  question: string;
  phase: Phase;
  options?: string[]; // if multiple choice
  type: 'text' | 'team' | 'number';
  points: number;
  aiPrediction?: string;
}

export interface TournamentConfig {
  id: string;
  name: string;
  shortName: string;
  year: number;
  hostNations: string[];
  startDate: string;
  endDate: string;
  timezone: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
  };
  phases: PhaseConfig[];
  teams: Record<string, Team>;
  fixtures: Fixture[];
  bonusQuestions: BonusQuestion[];
  scoring: {
    latePenaltyPerDay: number;
    bonusPointsPerCorrect: number;
  };
}

// ─── TEAMS ──────────────────────────────────────────────────────────────────

export const TEAMS: Record<string, Team> = {
  // Group A
  MEX: { code: 'MEX', name: 'Mexico', flag: '🇲🇽', group: 'A', primaryColor: '#006847', secondaryColor: '#CE1126', confederation: 'CONCACAF' },
  KOR: { code: 'KOR', name: 'South Korea', flag: '🇰🇷', group: 'A', primaryColor: '#C60C30', secondaryColor: '#003478', confederation: 'AFC' },
  CZE: { code: 'CZE', name: 'Czech Republic', flag: '🇨🇿', group: 'A', primaryColor: '#D7141A', secondaryColor: '#11457E', confederation: 'UEFA' },
  RSA: { code: 'RSA', name: 'South Africa', flag: '🇿🇦', group: 'A', primaryColor: '#007A4D', secondaryColor: '#FFB612', confederation: 'CAF' },

  // Group B
  CAN: { code: 'CAN', name: 'Canada', flag: '🇨🇦', group: 'B', primaryColor: '#FF0000', secondaryColor: '#FFFFFF', confederation: 'CONCACAF' },
  BIH: { code: 'BIH', name: 'Bosnia & Herz.', flag: '🇧🇦', group: 'B', primaryColor: '#003DA5', secondaryColor: '#FCCA36', confederation: 'UEFA' },
  QAT: { code: 'QAT', name: 'Qatar', flag: '🇶🇦', group: 'B', primaryColor: '#8D1B3D', secondaryColor: '#FFFFFF', confederation: 'AFC' },
  SUI: { code: 'SUI', name: 'Switzerland', flag: '🇨🇭', group: 'B', primaryColor: '#DA291C', secondaryColor: '#FFFFFF', confederation: 'UEFA' },

  // Group C
  BRA: { code: 'BRA', name: 'Brazil', flag: '🇧🇷', group: 'C', primaryColor: '#009C3B', secondaryColor: '#FFDF00', confederation: 'CONMEBOL' },
  MAR: { code: 'MAR', name: 'Morocco', flag: '🇲🇦', group: 'C', primaryColor: '#C1272D', secondaryColor: '#006233', confederation: 'CAF' },
  HAI: { code: 'HAI', name: 'Haiti', flag: '🇭🇹', group: 'C', primaryColor: '#00209F', secondaryColor: '#D21034', confederation: 'CONCACAF' },
  SCO: { code: 'SCO', name: 'Scotland', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', group: 'C', primaryColor: '#003DA5', secondaryColor: '#FFFFFF', confederation: 'UEFA' },

  // Group D
  USA: { code: 'USA', name: 'USA', flag: '🇺🇸', group: 'D', primaryColor: '#002868', secondaryColor: '#BF0A30', confederation: 'CONCACAF' },
  PAR: { code: 'PAR', name: 'Paraguay', flag: '🇵🇾', group: 'D', primaryColor: '#D52B1E', secondaryColor: '#0038A8', confederation: 'CONMEBOL' },
  AUS: { code: 'AUS', name: 'Australia', flag: '🇦🇺', group: 'D', primaryColor: '#FFD700', secondaryColor: '#00843D', confederation: 'AFC' },
  TUR: { code: 'TUR', name: 'Türkiye', flag: '🇹🇷', group: 'D', primaryColor: '#E30A17', secondaryColor: '#FFFFFF', confederation: 'UEFA' },

  // Group E
  GER: { code: 'GER', name: 'Germany', flag: '🇩🇪', group: 'E', primaryColor: '#000000', secondaryColor: '#DD0000', confederation: 'UEFA' },
  CUR: { code: 'CUR', name: 'Curaçao', flag: '🇨🇼', group: 'E', primaryColor: '#002B7F', secondaryColor: '#F9E814', confederation: 'CONCACAF' },
  CIV: { code: 'CIV', name: "Ivory Coast", flag: '🇨🇮', group: 'E', primaryColor: '#F77F00', secondaryColor: '#009A44', confederation: 'CAF' },
  ECU: { code: 'ECU', name: 'Ecuador', flag: '🇪🇨', group: 'E', primaryColor: '#FFD100', secondaryColor: '#034EA2', confederation: 'CONMEBOL' },

  // Group F
  NED: { code: 'NED', name: 'Netherlands', flag: '🇳🇱', group: 'F', primaryColor: '#FF6600', secondaryColor: '#FFFFFF', confederation: 'UEFA' },
  JPN: { code: 'JPN', name: 'Japan', flag: '🇯🇵', group: 'F', primaryColor: '#003087', secondaryColor: '#BC002D', confederation: 'AFC' },
  SWE: { code: 'SWE', name: 'Sweden', flag: '🇸🇪', group: 'F', primaryColor: '#006AA7', secondaryColor: '#FECC02', confederation: 'UEFA' },
  TUN: { code: 'TUN', name: 'Tunisia', flag: '🇹🇳', group: 'F', primaryColor: '#E70013', secondaryColor: '#FFFFFF', confederation: 'CAF' },

  // Group G
  BEL: { code: 'BEL', name: 'Belgium', flag: '🇧🇪', group: 'G', primaryColor: '#EF3340', secondaryColor: '#000000', confederation: 'UEFA' },
  EGY: { code: 'EGY', name: 'Egypt', flag: '🇪🇬', group: 'G', primaryColor: '#CE1126', secondaryColor: '#FFFFFF', confederation: 'CAF' },
  IRN: { code: 'IRN', name: 'Iran', flag: '🇮🇷', group: 'G', primaryColor: '#239F40', secondaryColor: '#DA0000', confederation: 'AFC' },
  NZL: { code: 'NZL', name: 'New Zealand', flag: '🇳🇿', group: 'G', primaryColor: '#000000', secondaryColor: '#FFFFFF', confederation: 'OFC' },

  // Group H
  ESP: { code: 'ESP', name: 'Spain', flag: '🇪🇸', group: 'H', primaryColor: '#AA151B', secondaryColor: '#F1BF00', confederation: 'UEFA' },
  CPV: { code: 'CPV', name: 'Cape Verde', flag: '🇨🇻', group: 'H', primaryColor: '#003893', secondaryColor: '#CF2027', confederation: 'CAF' },
  SAU: { code: 'SAU', name: 'Saudi Arabia', flag: '🇸🇦', group: 'H', primaryColor: '#006C35', secondaryColor: '#FFFFFF', confederation: 'AFC' },
  URU: { code: 'URU', name: 'Uruguay', flag: '🇺🇾', group: 'H', primaryColor: '#5AAFD2', secondaryColor: '#FFFFFF', confederation: 'CONMEBOL' },

  // Group I
  FRA: { code: 'FRA', name: 'France', flag: '🇫🇷', group: 'I', primaryColor: '#002395', secondaryColor: '#ED2939', confederation: 'UEFA' },
  SEN: { code: 'SEN', name: 'Senegal', flag: '🇸🇳', group: 'I', primaryColor: '#00853F', secondaryColor: '#FDEF42', confederation: 'CAF' },
  IRQ: { code: 'IRQ', name: 'Iraq', flag: '🇮🇶', group: 'I', primaryColor: '#CE1126', secondaryColor: '#007A3D', confederation: 'AFC' },
  NOR: { code: 'NOR', name: 'Norway', flag: '🇳🇴', group: 'I', primaryColor: '#EF2B2D', secondaryColor: '#003087', confederation: 'UEFA' },

  // Group J
  ARG: { code: 'ARG', name: 'Argentina', flag: '🇦🇷', group: 'J', primaryColor: '#74ACDF', secondaryColor: '#FFFFFF', confederation: 'CONMEBOL' },
  ALG: { code: 'ALG', name: 'Algeria', flag: '🇩🇿', group: 'J', primaryColor: '#006233', secondaryColor: '#FFFFFF', confederation: 'CAF' },
  AUT: { code: 'AUT', name: 'Austria', flag: '🇦🇹', group: 'J', primaryColor: '#ED2939', secondaryColor: '#FFFFFF', confederation: 'UEFA' },
  JOR: { code: 'JOR', name: 'Jordan', flag: '🇯🇴', group: 'J', primaryColor: '#007A3D', secondaryColor: '#000000', confederation: 'AFC' },

  // Group K
  POR: { code: 'POR', name: 'Portugal', flag: '🇵🇹', group: 'K', primaryColor: '#006600', secondaryColor: '#FF0000', confederation: 'UEFA' },
  COD: { code: 'COD', name: 'DR Congo', flag: '🇨🇩', group: 'K', primaryColor: '#007FFF', secondaryColor: '#F7D100', confederation: 'CAF' },
  UZB: { code: 'UZB', name: 'Uzbekistan', flag: '🇺🇿', group: 'K', primaryColor: '#1EB53A', secondaryColor: '#0099B5', confederation: 'AFC' },
  COL: { code: 'COL', name: 'Colombia', flag: '🇨🇴', group: 'K', primaryColor: '#FCD116', secondaryColor: '#003087', confederation: 'CONMEBOL' },

  // Group L
  ENG: { code: 'ENG', name: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', group: 'L', primaryColor: '#FFFFFF', secondaryColor: '#C8102E', confederation: 'UEFA' },
  CRO: { code: 'CRO', name: 'Croatia', flag: '🇭🇷', group: 'L', primaryColor: '#FF0000', secondaryColor: '#FFFFFF', confederation: 'UEFA' },
  PAN: { code: 'PAN', name: 'Panama', flag: '🇵🇦', group: 'L', primaryColor: '#DA291C', secondaryColor: '#005BAB', confederation: 'CONCACAF' },
  GHA: { code: 'GHA', name: 'Ghana', flag: '🇬🇭', group: 'L', primaryColor: '#006B3F', secondaryColor: '#FCD116', confederation: 'CAF' },
};

// ─── FIXTURES ────────────────────────────────────────────────────────────────

export const GROUP_FIXTURES: Fixture[] = [
  // ── GROUP A ──
  { matchNumber: 1,  phase: 'group', group: 'A', team1: 'MEX', team2: 'RSA', venue: 'Estadio Azteca', city: 'Mexico City', date: '2026-06-11T19:00:00Z', canDraw: true, aiPrediction: 'MEX' },
  { matchNumber: 2,  phase: 'group', group: 'A', team1: 'KOR', team2: 'CZE', venue: 'Estadio Akron', city: 'Guadalajara', date: '2026-06-12T02:00:00Z', canDraw: true, aiPrediction: 'KOR' },
  { matchNumber: 3,  phase: 'group', group: 'A', team1: 'MEX', team2: 'KOR', venue: 'Estadio Akron', city: 'Guadalajara', date: '2026-06-19T03:00:00Z', canDraw: true, aiPrediction: 'MEX' },
  { matchNumber: 4,  phase: 'group', group: 'A', team1: 'CZE', team2: 'RSA', venue: 'Mercedes-Benz Stadium', city: 'Atlanta', date: '2026-06-18T16:00:00Z', canDraw: true, aiPrediction: 'CZE' },
  { matchNumber: 5,  phase: 'group', group: 'A', team1: 'RSA', team2: 'KOR', venue: 'Estadio Akron', city: 'Guadalajara', date: '2026-06-25T01:00:00Z', canDraw: true, aiPrediction: 'KOR' },
  { matchNumber: 6,  phase: 'group', group: 'A', team1: 'CZE', team2: 'MEX', venue: 'Estadio Azteca', city: 'Mexico City', date: '2026-06-25T01:00:00Z', canDraw: true, aiPrediction: 'MEX' },

  // ── GROUP B ──
  { matchNumber: 7,  phase: 'group', group: 'B', team1: 'CAN', team2: 'BIH', venue: 'BMO Field', city: 'Toronto', date: '2026-06-12T19:00:00Z', canDraw: true, aiPrediction: 'CAN' },
  { matchNumber: 8,  phase: 'group', group: 'B', team1: 'QAT', team2: 'SUI', venue: "Levi's Stadium", city: 'San Francisco', date: '2026-06-13T19:00:00Z', canDraw: true, aiPrediction: 'SUI' },
  { matchNumber: 9,  phase: 'group', group: 'B', team1: 'SUI', team2: 'BIH', venue: 'SoFi Stadium', city: 'Los Angeles', date: '2026-06-18T19:00:00Z', canDraw: true, aiPrediction: 'SUI' },
  { matchNumber: 10, phase: 'group', group: 'B', team1: 'CAN', team2: 'QAT', venue: 'BC Place', city: 'Vancouver', date: '2026-06-18T22:00:00Z', canDraw: true, aiPrediction: 'CAN' },
  { matchNumber: 11, phase: 'group', group: 'B', team1: 'SUI', team2: 'CAN', venue: 'BC Place', city: 'Vancouver', date: '2026-06-24T19:00:00Z', canDraw: true, aiPrediction: 'SUI' },
  { matchNumber: 12, phase: 'group', group: 'B', team1: 'BIH', team2: 'QAT', venue: 'Lumen Field', city: 'Seattle', date: '2026-06-24T19:00:00Z', canDraw: true, aiPrediction: 'BIH' },

  // ── GROUP C ──
  { matchNumber: 13, phase: 'group', group: 'C', team1: 'BRA', team2: 'MAR', venue: 'MetLife Stadium', city: 'New York/NJ', date: '2026-06-13T22:00:00Z', canDraw: true, aiPrediction: 'BRA' },
  { matchNumber: 14, phase: 'group', group: 'C', team1: 'HAI', team2: 'SCO', venue: 'Gillette Stadium', city: 'Boston', date: '2026-06-14T01:00:00Z', canDraw: true, aiPrediction: 'SCO' },
  { matchNumber: 15, phase: 'group', group: 'C', team1: 'SCO', team2: 'MAR', venue: 'Gillette Stadium', city: 'Boston', date: '2026-06-19T22:00:00Z', canDraw: true, aiPrediction: 'MAR' },
  { matchNumber: 16, phase: 'group', group: 'C', team1: 'BRA', team2: 'HAI', venue: 'Lincoln Financial Field', city: 'Philadelphia', date: '2026-06-20T01:00:00Z', canDraw: true, aiPrediction: 'BRA' },
  { matchNumber: 17, phase: 'group', group: 'C', team1: 'MAR', team2: 'HAI', venue: 'Mercedes-Benz Stadium', city: 'Atlanta', date: '2026-06-24T22:00:00Z', canDraw: true, aiPrediction: 'MAR' },
  { matchNumber: 18, phase: 'group', group: 'C', team1: 'SCO', team2: 'BRA', venue: 'Hard Rock Stadium', city: 'Miami', date: '2026-06-24T22:00:00Z', canDraw: true, aiPrediction: 'BRA' },

  // ── GROUP D ──
  { matchNumber: 19, phase: 'group', group: 'D', team1: 'USA', team2: 'PAR', venue: 'SoFi Stadium', city: 'Los Angeles', date: '2026-06-13T01:00:00Z', canDraw: true, aiPrediction: 'USA' },
  { matchNumber: 20, phase: 'group', group: 'D', team1: 'AUS', team2: 'TUR', venue: 'BC Place', city: 'Vancouver', date: '2026-06-14T04:00:00Z', canDraw: true, aiPrediction: 'TUR' },
  { matchNumber: 21, phase: 'group', group: 'D', team1: 'USA', team2: 'AUS', venue: 'Lumen Field', city: 'Seattle', date: '2026-06-19T19:00:00Z', canDraw: true, aiPrediction: 'USA' },
  { matchNumber: 22, phase: 'group', group: 'D', team1: 'TUR', team2: 'PAR', venue: "Levi's Stadium", city: 'San Francisco', date: '2026-06-20T04:00:00Z', canDraw: true, aiPrediction: 'TUR' },
  { matchNumber: 23, phase: 'group', group: 'D', team1: 'TUR', team2: 'USA', venue: 'SoFi Stadium', city: 'Los Angeles', date: '2026-06-26T02:00:00Z', canDraw: true, aiPrediction: 'USA' },
  { matchNumber: 24, phase: 'group', group: 'D', team1: 'PAR', team2: 'AUS', venue: "Levi's Stadium", city: 'San Francisco', date: '2026-06-26T02:00:00Z', canDraw: true, aiPrediction: 'PAR' },

  // ── GROUP E ──
  { matchNumber: 25, phase: 'group', group: 'E', team1: 'GER', team2: 'CUR', venue: 'NRG Stadium', city: 'Houston', date: '2026-06-14T17:00:00Z', canDraw: true, aiPrediction: 'GER' },
  { matchNumber: 26, phase: 'group', group: 'E', team1: 'CIV', team2: 'ECU', venue: 'Lincoln Financial Field', city: 'Philadelphia', date: '2026-06-14T23:00:00Z', canDraw: true, aiPrediction: 'CIV' },
  { matchNumber: 27, phase: 'group', group: 'E', team1: 'GER', team2: 'CIV', venue: 'BMO Field', city: 'Toronto', date: '2026-06-20T20:00:00Z', canDraw: true, aiPrediction: 'GER' },
  { matchNumber: 28, phase: 'group', group: 'E', team1: 'ECU', team2: 'CUR', venue: 'Arrowhead Stadium', city: 'Kansas City', date: '2026-06-21T00:00:00Z', canDraw: true, aiPrediction: 'ECU' },
  { matchNumber: 29, phase: 'group', group: 'E', team1: 'CUR', team2: 'CIV', venue: 'Lincoln Financial Field', city: 'Philadelphia', date: '2026-06-25T20:00:00Z', canDraw: true, aiPrediction: 'CIV' },
  { matchNumber: 30, phase: 'group', group: 'E', team1: 'ECU', team2: 'GER', venue: 'MetLife Stadium', city: 'New York/NJ', date: '2026-06-25T20:00:00Z', canDraw: true, aiPrediction: 'GER' },

  // ── GROUP F ──
  { matchNumber: 31, phase: 'group', group: 'F', team1: 'NED', team2: 'JPN', venue: 'AT&T Stadium', city: 'Dallas', date: '2026-06-14T20:00:00Z', canDraw: true, aiPrediction: 'NED' },
  { matchNumber: 32, phase: 'group', group: 'F', team1: 'SWE', team2: 'TUN', venue: 'Estadio BBVA', city: 'Guadalajara', date: '2026-06-15T02:00:00Z', canDraw: true, aiPrediction: 'SWE' },
  { matchNumber: 33, phase: 'group', group: 'F', team1: 'NED', team2: 'SWE', venue: 'NRG Stadium', city: 'Houston', date: '2026-06-20T17:00:00Z', canDraw: true, aiPrediction: 'NED' },
  { matchNumber: 34, phase: 'group', group: 'F', team1: 'TUN', team2: 'JPN', venue: 'Estadio BBVA', city: 'Guadalajara', date: '2026-06-21T04:00:00Z', canDraw: true, aiPrediction: 'JPN' },
  { matchNumber: 35, phase: 'group', group: 'F', team1: 'TUN', team2: 'NED', venue: 'Arrowhead Stadium', city: 'Kansas City', date: '2026-06-25T23:00:00Z', canDraw: true, aiPrediction: 'NED' },
  { matchNumber: 36, phase: 'group', group: 'F', team1: 'JPN', team2: 'SWE', venue: 'AT&T Stadium', city: 'Dallas', date: '2026-06-25T23:00:00Z', canDraw: true, aiPrediction: 'JPN' },

  // ── GROUP G ──
  { matchNumber: 37, phase: 'group', group: 'G', team1: 'BEL', team2: 'EGY', venue: 'Lumen Field', city: 'Seattle', date: '2026-06-15T22:00:00Z', canDraw: true, aiPrediction: 'BEL' },
  { matchNumber: 38, phase: 'group', group: 'G', team1: 'IRN', team2: 'NZL', venue: 'SoFi Stadium', city: 'Los Angeles', date: '2026-06-16T04:00:00Z', canDraw: true, aiPrediction: 'IRN' },
  { matchNumber: 39, phase: 'group', group: 'G', team1: 'BEL', team2: 'IRN', venue: 'SoFi Stadium', city: 'Los Angeles', date: '2026-06-21T19:00:00Z', canDraw: true, aiPrediction: 'BEL' },
  { matchNumber: 40, phase: 'group', group: 'G', team1: 'NZL', team2: 'EGY', venue: 'BC Place', city: 'Vancouver', date: '2026-06-22T01:00:00Z', canDraw: true, aiPrediction: 'EGY' },
  { matchNumber: 41, phase: 'group', group: 'G', team1: 'NZL', team2: 'BEL', venue: 'BC Place', city: 'Vancouver', date: '2026-06-27T03:00:00Z', canDraw: true, aiPrediction: 'BEL' },
  { matchNumber: 42, phase: 'group', group: 'G', team1: 'EGY', team2: 'IRN', venue: 'Lumen Field', city: 'Seattle', date: '2026-06-27T03:00:00Z', canDraw: true, aiPrediction: 'EGY' },

  // ── GROUP H ──
  { matchNumber: 43, phase: 'group', group: 'H', team1: 'ESP', team2: 'CPV', venue: 'Mercedes-Benz Stadium', city: 'Atlanta', date: '2026-06-15T17:00:00Z', canDraw: true, aiPrediction: 'ESP' },
  { matchNumber: 44, phase: 'group', group: 'H', team1: 'SAU', team2: 'URU', venue: 'Hard Rock Stadium', city: 'Miami', date: '2026-06-15T22:00:00Z', canDraw: true, aiPrediction: 'URU' },
  { matchNumber: 45, phase: 'group', group: 'H', team1: 'ESP', team2: 'SAU', venue: 'Mercedes-Benz Stadium', city: 'Atlanta', date: '2026-06-21T16:00:00Z', canDraw: true, aiPrediction: 'ESP' },
  { matchNumber: 46, phase: 'group', group: 'H', team1: 'URU', team2: 'CPV', venue: 'Hard Rock Stadium', city: 'Miami', date: '2026-06-21T22:00:00Z', canDraw: true, aiPrediction: 'URU' },
  { matchNumber: 47, phase: 'group', group: 'H', team1: 'CPV', team2: 'SAU', venue: 'NRG Stadium', city: 'Houston', date: '2026-06-27T00:00:00Z', canDraw: true, aiPrediction: 'SAU' },
  { matchNumber: 48, phase: 'group', group: 'H', team1: 'URU', team2: 'ESP', venue: 'Estadio Akron', city: 'Guadalajara', date: '2026-06-27T00:00:00Z', canDraw: true, aiPrediction: 'ESP' },

  // ── GROUP I ──
  { matchNumber: 49, phase: 'group', group: 'I', team1: 'FRA', team2: 'SEN', venue: 'MetLife Stadium', city: 'New York/NJ', date: '2026-06-16T19:00:00Z', canDraw: true, aiPrediction: 'FRA' },
  { matchNumber: 50, phase: 'group', group: 'I', team1: 'IRQ', team2: 'NOR', venue: 'Gillette Stadium', city: 'Boston', date: '2026-06-16T22:00:00Z', canDraw: true, aiPrediction: 'NOR' },
  { matchNumber: 51, phase: 'group', group: 'I', team1: 'FRA', team2: 'IRQ', venue: 'Lincoln Financial Field', city: 'Philadelphia', date: '2026-06-22T21:00:00Z', canDraw: true, aiPrediction: 'FRA' },
  { matchNumber: 52, phase: 'group', group: 'I', team1: 'NOR', team2: 'SEN', venue: 'BMO Field', city: 'Toronto', date: '2026-06-23T00:00:00Z', canDraw: true, aiPrediction: 'NOR' },
  { matchNumber: 53, phase: 'group', group: 'I', team1: 'NOR', team2: 'FRA', venue: 'Gillette Stadium', city: 'Boston', date: '2026-06-26T19:00:00Z', canDraw: true, aiPrediction: 'FRA' },
  { matchNumber: 54, phase: 'group', group: 'I', team1: 'SEN', team2: 'IRQ', venue: 'BMO Field', city: 'Toronto', date: '2026-06-26T19:00:00Z', canDraw: true, aiPrediction: 'SEN' },

  // ── GROUP J ──
  { matchNumber: 55, phase: 'group', group: 'J', team1: 'ARG', team2: 'ALG', venue: 'Arrowhead Stadium', city: 'Kansas City', date: '2026-06-17T01:00:00Z', canDraw: true, aiPrediction: 'ARG' },
  { matchNumber: 56, phase: 'group', group: 'J', team1: 'AUT', team2: 'JOR', venue: "Levi's Stadium", city: 'San Francisco', date: '2026-06-17T04:00:00Z', canDraw: true, aiPrediction: 'AUT' },
  { matchNumber: 57, phase: 'group', group: 'J', team1: 'ARG', team2: 'AUT', venue: 'AT&T Stadium', city: 'Dallas', date: '2026-06-22T17:00:00Z', canDraw: true, aiPrediction: 'ARG' },
  { matchNumber: 58, phase: 'group', group: 'J', team1: 'JOR', team2: 'ALG', venue: "Levi's Stadium", city: 'San Francisco', date: '2026-06-23T03:00:00Z', canDraw: true, aiPrediction: 'ALG' },
  { matchNumber: 59, phase: 'group', group: 'J', team1: 'ARG', team2: 'JOR', venue: 'NRG Stadium', city: 'Houston', date: '2026-06-28T02:00:00Z', canDraw: true, aiPrediction: 'ARG' },
  { matchNumber: 60, phase: 'group', group: 'J', team1: 'ALG', team2: 'AUT', venue: 'AT&T Stadium', city: 'Dallas', date: '2026-06-28T02:00:00Z', canDraw: true, aiPrediction: 'AUT' },

  // ── GROUP K ──
  { matchNumber: 61, phase: 'group', group: 'K', team1: 'POR', team2: 'COD', venue: 'NRG Stadium', city: 'Houston', date: '2026-06-17T17:00:00Z', canDraw: true, aiPrediction: 'POR' },
  { matchNumber: 62, phase: 'group', group: 'K', team1: 'UZB', team2: 'COL', venue: 'Estadio Azteca', city: 'Mexico City', date: '2026-06-18T02:00:00Z', canDraw: true, aiPrediction: 'COL' },
  { matchNumber: 63, phase: 'group', group: 'K', team1: 'POR', team2: 'UZB', venue: 'NRG Stadium', city: 'Houston', date: '2026-06-23T17:00:00Z', canDraw: true, aiPrediction: 'POR' },
  { matchNumber: 64, phase: 'group', group: 'K', team1: 'COL', team2: 'COD', venue: 'Estadio Akron', city: 'Guadalajara', date: '2026-06-24T02:00:00Z', canDraw: true, aiPrediction: 'COL' },
  { matchNumber: 65, phase: 'group', group: 'K', team1: 'POR', team2: 'COL', venue: 'Hard Rock Stadium', city: 'Miami', date: '2026-06-27T23:30:00Z', canDraw: true, aiPrediction: 'POR' },
  { matchNumber: 66, phase: 'group', group: 'K', team1: 'UZB', team2: 'COD', venue: 'Arrowhead Stadium', city: 'Kansas City', date: '2026-06-27T23:30:00Z', canDraw: true, aiPrediction: 'UZB' },

  // ── GROUP L ──
  { matchNumber: 67, phase: 'group', group: 'L', team1: 'ENG', team2: 'CRO', venue: 'AT&T Stadium', city: 'Dallas', date: '2026-06-17T20:00:00Z', canDraw: true, aiPrediction: 'ENG' },
  { matchNumber: 68, phase: 'group', group: 'L', team1: 'GHA', team2: 'PAN', venue: 'BMO Field', city: 'Toronto', date: '2026-06-17T23:00:00Z', canDraw: true, aiPrediction: 'GHA' },
  { matchNumber: 69, phase: 'group', group: 'L', team1: 'ENG', team2: 'GHA', venue: 'Gillette Stadium', city: 'Boston', date: '2026-06-23T20:00:00Z', canDraw: true, aiPrediction: 'ENG' },
  { matchNumber: 70, phase: 'group', group: 'L', team1: 'PAN', team2: 'CRO', venue: 'Gillette Stadium', city: 'Boston', date: '2026-06-23T23:00:00Z', canDraw: true, aiPrediction: 'CRO' },
  { matchNumber: 71, phase: 'group', group: 'L', team1: 'PAN', team2: 'ENG', venue: 'MetLife Stadium', city: 'New York/NJ', date: '2026-06-27T21:00:00Z', canDraw: true, aiPrediction: 'ENG' },
  { matchNumber: 72, phase: 'group', group: 'L', team1: 'CRO', team2: 'GHA', venue: 'Lincoln Financial Field', city: 'Philadelphia', date: '2026-06-27T21:00:00Z', canDraw: true, aiPrediction: 'CRO' },
];

// Knockout fixtures are created dynamically once group results are known.
// Placeholders for bracket display purposes.
export const KNOCKOUT_FIXTURES: Fixture[] = [
  // Round of 32 (16 matches)
  ...Array.from({ length: 16 }, (_, i) => ({
    matchNumber: 73 + i,
    phase: 'round32' as Phase,
    team1: 'TBD',
    team2: 'TBD',
    venue: 'TBD',
    city: 'TBD',
    date: `2026-06-${28 + Math.floor(i / 4)}T22:00:00Z`,
    canDraw: false,
  })),

  // Round of 16 (8 matches)
  ...Array.from({ length: 8 }, (_, i) => ({
    matchNumber: 89 + i,
    phase: 'round16' as Phase,
    team1: 'TBD',
    team2: 'TBD',
    venue: 'TBD',
    city: 'TBD',
    date: `2026-07-0${4 + Math.floor(i / 4)}T22:00:00Z`,
    canDraw: false,
  })),

  // Quarter-Finals (4 matches)
  ...Array.from({ length: 4 }, (_, i) => ({
    matchNumber: 97 + i,
    phase: 'quarter' as Phase,
    team1: 'TBD',
    team2: 'TBD',
    venue: 'TBD',
    city: 'TBD',
    date: `2026-07-${9 + Math.floor(i / 2)}T22:00:00Z`,
    canDraw: false,
  })),

  // Semi-Finals (2 matches)
  { matchNumber: 101, phase: 'semi', team1: 'TBD', team2: 'TBD', venue: 'AT&T Stadium', city: 'Dallas', date: '2026-07-14T22:00:00Z', canDraw: false },
  { matchNumber: 102, phase: 'semi', team1: 'TBD', team2: 'TBD', venue: 'Mercedes-Benz Stadium', city: 'Atlanta', date: '2026-07-15T22:00:00Z', canDraw: false },

  // Third Place
  { matchNumber: 103, phase: 'final', team1: 'TBD', team2: 'TBD', venue: 'Hard Rock Stadium', city: 'Miami', date: '2026-07-18T22:00:00Z', canDraw: false },

  // Final
  { matchNumber: 104, phase: 'final', team1: 'TBD', team2: 'TBD', venue: 'MetLife Stadium', city: 'New York/NJ', date: '2026-07-19T22:00:00Z', canDraw: false },
];

export const ALL_FIXTURES = [...GROUP_FIXTURES, ...KNOCKOUT_FIXTURES];

// ─── BONUS QUESTIONS ─────────────────────────────────────────────────────────

export const BONUS_QUESTIONS: BonusQuestion[] = [
  {
    id: 'golden-boot',
    question: 'Who will win the Golden Boot (top scorer)?',
    phase: 'group',
    type: 'text',
    points: 40,
    aiPrediction: 'Erling Haaland (Norway)',
  },
  {
    id: 'golden-ball',
    question: 'Who will win the Golden Ball (best player)?',
    phase: 'group',
    type: 'text',
    points: 30,
    aiPrediction: 'Vinicius Jr (Brazil)',
  },
  {
    id: 'golden-glove',
    question: 'Who will win the Golden Glove (best goalkeeper)?',
    phase: 'group',
    type: 'text',
    points: 30,
    aiPrediction: 'Emiliano Martínez (Argentina)',
  },
  {
    id: 'world-cup-winner',
    question: 'Which country will win the FIFA World Cup 2026?',
    phase: 'group',
    type: 'team',
    points: 25,
    aiPrediction: 'ESP',
  },
  {
    id: 'total-goals',
    question: 'How many total goals will be scored in the tournament? (closest answer wins)',
    phase: 'group',
    type: 'number',
    points: 40,
    aiPrediction: '163',
  },
  {
    id: 'host-usa-knockouts',
    question: 'Will host nation USA reach the Round of 16 or further?',
    phase: 'group',
    type: 'text',
    options: ['Yes', 'No'],
    points: 10,
    aiPrediction: 'Yes',
  },
  {
    id: 'argentina-defend',
    question: 'Will defending champion Argentina reach the Semi-Finals?',
    phase: 'group',
    type: 'text',
    options: ['Yes', 'No'],
    points: 10,
    aiPrediction: 'Yes',
  },
  {
    id: 'most-upsets',
    question: 'Which group will produce the most upsets?',
    phase: 'group',
    type: 'text',
    options: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'],
    points: 20,
    aiPrediction: 'D',
  },
  {
    id: 'host-canada-knockouts',
    question: 'Will host nation Canada reach the Round of 16 or further?',
    phase: 'group',
    type: 'text',
    options: ['Yes', 'No'],
    points: 10,
    aiPrediction: 'Yes',
  },
  {
    id: 'host-mexico-knockouts',
    question: 'Will host nation Mexico win Group A?',
    phase: 'group',
    type: 'text',
    options: ['Yes', 'No'],
    points: 15,
    aiPrediction: 'Yes',
  },
  {
    id: 'best-host-nation',
    question: 'Which host nation will finish highest in the tournament?',
    phase: 'group',
    type: 'text',
    options: ['USA', 'Mexico', 'Canada'],
    points: 20,
    aiPrediction: 'USA',
  },
];

// ─── PHASES ──────────────────────────────────────────────────────────────────

export const PHASES: PhaseConfig[] = [
  {
    id: 'group',
    name: 'Group Stage',
    shortName: 'Groups',
    deadline: '2026-06-11T19:00:00Z',
    color: '#003DA5',
    icon: '🏟️',
    scoringType: 'pool',
    poolPoints: 80,
    chipsAvailable: ['doubleUp', 'wildcard'],
  },
  {
    id: 'round32',
    name: 'Round of 32',
    shortName: 'R32',
    deadline: '2026-06-27T22:00:00Z',
    color: '#6366F1',
    icon: '⚽',
    scoringType: 'pool',
    poolPoints: 160,
    chipsAvailable: ['doubleUp', 'wildcard'],
  },
  {
    id: 'round16',
    name: 'Round of 16',
    shortName: 'R16',
    deadline: '2026-07-03T22:00:00Z',
    color: '#8B5CF6',
    icon: '⚡',
    scoringType: 'pool',
    poolPoints: 200,
    chipsAvailable: ['wildcard'],
  },
  {
    id: 'quarter',
    name: 'Quarter-Finals',
    shortName: 'QF',
    deadline: '2026-07-08T22:00:00Z',
    color: '#EC4899',
    icon: '🔥',
    scoringType: 'pool',
    poolPoints: 280,
    chipsAvailable: ['wildcard', 'banker'],
  },
  {
    id: 'semi',
    name: 'Semi-Finals',
    shortName: 'SF',
    deadline: '2026-07-13T22:00:00Z',
    color: '#F59E0B',
    icon: '💎',
    scoringType: 'pool',
    poolPoints: 350,
    chipsAvailable: ['wildcard', 'banker'],
  },
  {
    id: 'final',
    name: 'Final',
    shortName: 'Final',
    deadline: '2026-07-17T22:00:00Z',
    color: '#C9A73A',
    icon: '🏆',
    scoringType: 'pool',
    poolPoints: 500,
    chipsAvailable: ['wildcard', 'banker'],
  },
];

// ─── TOURNAMENT CONFIG ────────────────────────────────────────────────────────

export const TOURNAMENT: TournamentConfig = {
  id: 'fifa-2026',
  name: 'FIFA World Cup 2026',
  shortName: 'WC26',
  year: 2026,
  hostNations: ['USA', 'Canada', 'Mexico'],
  startDate: '2026-06-11',
  endDate: '2026-07-19',
  timezone: 'America/New_York',
  colors: {
    primary: '#003DA5',    // FIFA deep blue
    secondary: '#C9A73A',  // World Cup gold
    accent: '#BF0A30',     // USA red
    background: '#0A0F1E', // dark navy
    surface: '#111827',    // dark card
  },
  phases: PHASES,
  teams: TEAMS,
  fixtures: ALL_FIXTURES,
  bonusQuestions: BONUS_QUESTIONS,
  scoring: {
    latePenaltyPerDay: 5,
    bonusPointsPerCorrect: 20,
  },
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

export function getFixture(matchNumber: number): Fixture | undefined {
  return ALL_FIXTURES.find((f) => f.matchNumber === matchNumber);
}

export function getFixturesByPhase(phase: Phase): Fixture[] {
  return ALL_FIXTURES.filter((f) => f.phase === phase);
}

export function getFixturesByGroup(group: string): Fixture[] {
  return GROUP_FIXTURES.filter((f) => f.group === group);
}

export function getPhaseConfig(phase: Phase): PhaseConfig {
  return PHASES.find((p) => p.id === phase)!;
}

export function isPhaseOpen(phase: Phase): boolean {
  const config = getPhaseConfig(phase);
  return new Date() < new Date(config.deadline);
}

export function isPhasePastDeadline(phase: Phase): boolean {
  const config = getPhaseConfig(phase);
  return new Date() > new Date(config.deadline);
}

export function getCurrentPhase(): Phase {
  const now = new Date();
  for (const phase of PHASES) {
    if (now < new Date(phase.deadline)) return phase.id;
  }
  return 'final';
}

export function getTeam(code: string): Team | undefined {
  return TEAMS[code];
}

export const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
