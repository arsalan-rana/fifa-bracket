'use client';

import { createTheme } from '@mui/material/styles';

const typography = {
  fontFamily: '"Inter", "Roboto", "Helvetica", sans-serif',
  h1: { fontWeight: 800 },
  h2: { fontWeight: 700 },
  h3: { fontWeight: 700 },
  h4: { fontWeight: 600 },
  h5: { fontWeight: 600 },
  h6: { fontWeight: 600 },
};

const shape = { borderRadius: 12 };

export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#003DA5',
      light: '#1A5DC8',
      dark: '#002580',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#C9A73A',
      light: '#E0C265',
      dark: '#9F8120',
      contrastText: '#000000',
    },
    error: { main: '#EF4444' },
    warning: { main: '#F59E0B' },
    success: { main: '#22C55E' },
    background: {
      default: '#0A0F1E',
      paper: '#111827',
    },
    text: {
      primary: '#F9FAFB',
      secondary: '#9CA3AF',
    },
    divider: 'rgba(255,255,255,0.08)',
  },
  typography,
  shape,
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#111827',
          border: '1px solid rgba(255,255,255,0.06)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 8,
          '&.MuiButton-containedPrimary': {
            background: 'linear-gradient(135deg, #003DA5 0%, #1A5DC8 100%)',
            '&:hover': { background: 'linear-gradient(135deg, #002580 0%, #003DA5 100%)' },
          },
          '&.MuiButton-containedSecondary': {
            background: 'linear-gradient(135deg, #9F8120 0%, #C9A73A 100%)',
            '&:hover': { background: 'linear-gradient(135deg, #7A6218 0%, #9F8120 100%)' },
            color: '#000',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600 },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarWidth: 'thin',
          scrollbarColor: '#374151 transparent',
          '&::-webkit-scrollbar': { width: 6 },
          '&::-webkit-scrollbar-track': { background: 'transparent' },
          '&::-webkit-scrollbar-thumb': { background: '#374151', borderRadius: 3 },
        },
      },
    },
  },
});

export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#003DA5',
      light: '#1A5DC8',
      dark: '#002580',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#B8941A',
      light: '#D4A820',
      dark: '#8A6E12',
      contrastText: '#000000',
    },
    error: { main: '#DC2626' },
    warning: { main: '#D97706' },
    success: { main: '#16A34A' },
    background: {
      default: '#EEF2FF',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#001240',
      secondary: '#4B5E80',
    },
    divider: 'rgba(0,18,64,0.08)',
  },
  typography,
  shape,
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#FFFFFF',
          border: '1px solid rgba(0,18,64,0.08)',
          boxShadow: '0 1px 3px rgba(0,18,64,0.08)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 8,
          '&.MuiButton-containedPrimary': {
            background: 'linear-gradient(135deg, #003DA5 0%, #1A5DC8 100%)',
            '&:hover': { background: 'linear-gradient(135deg, #002580 0%, #003DA5 100%)' },
          },
          '&.MuiButton-containedSecondary': {
            background: 'linear-gradient(135deg, #8A6E12 0%, #B8941A 100%)',
            '&:hover': { background: 'linear-gradient(135deg, #6B5510 0%, #8A6E12 100%)' },
            color: '#000',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600 },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarWidth: 'thin',
          scrollbarColor: '#CBD5E1 transparent',
          '&::-webkit-scrollbar': { width: 6 },
          '&::-webkit-scrollbar-track': { background: 'transparent' },
          '&::-webkit-scrollbar-thumb': { background: '#CBD5E1', borderRadius: 3 },
        },
      },
    },
  },
});

// Keep default export for any legacy imports
export const theme = darkTheme;
