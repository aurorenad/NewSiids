import { createTheme } from '@mui/material/styles';

export const mdcTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1565C0',
      light: '#42A5F5',
      dark: '#0D47A1',
      contrastText: '#fff',
    },
    secondary: {
      main: '#00897B',
      light: '#4DB6AC',
      dark: '#00695C',
      contrastText: '#fff',
    },
    error: { main: '#D32F2F', contrastText: '#fff' },
    warning: { main: '#ED6C02', contrastText: '#fff' },
    info: { main: '#0288D1', contrastText: '#fff' },
    success: { main: '#2E7D32', contrastText: '#fff' },
    background: {
      default: '#F4F6FA',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1C1B1F',
      secondary: '#49454F',
    },
    divider: '#CAC4D0',
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: '"Roboto", "Segoe UI", Arial, sans-serif',
    h4: { fontWeight: 700, fontSize: '1.75rem', letterSpacing: '-0.01em' },
    h5: { fontWeight: 700, fontSize: '1.4rem', letterSpacing: '0' },
    h6: { fontWeight: 600, fontSize: '1.125rem' },
    subtitle1: { fontWeight: 500, fontSize: '1rem' },
    body1: { fontSize: '0.9375rem', lineHeight: 1.6 },
    body2: { fontSize: '0.8125rem', lineHeight: 1.5, color: '#49454F' },
    button: { textTransform: 'none', fontWeight: 600, letterSpacing: '0.02em' },
    caption: { fontSize: '0.75rem', color: '#79747E' },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale' },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: '1px solid #E0E0E0',
          backgroundImage: 'none',
        },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: '1px solid #E0E0E0',
          transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
          '&:hover': {
            boxShadow: '0 2px 12px rgba(21,101,192,0.08)',
            borderColor: '#BDBDBD',
          },
        },
      },
    },
    MuiButton: {
      defaultProps: { variant: 'contained', disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 20,
          padding: '8px 24px',
          minHeight: 40,
          fontWeight: 600,
          transition: 'all 0.2s ease',
        },
        contained: {
          '&:hover': { boxShadow: '0 1px 6px rgba(21,101,192,0.3)' },
        },
        outlined: {
          borderWidth: '1.5px',
          '&:hover': { borderWidth: '1.5px', backgroundColor: 'rgba(21,101,192,0.04)' },
        },
      },
    },
    MuiTextField: {
      defaultProps: { fullWidth: true, size: 'small', variant: 'outlined' },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 10,
            transition: 'border-color 0.2s ease',
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderWidth: 2 },
          },
        },
      },
    },
    MuiTableContainer: {
      styleOverrides: {
        root: { borderRadius: 12, border: '1px solid #E0E0E0' },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            backgroundColor: '#E8EAF6',
            color: '#1C1B1F',
            fontWeight: 600,
            fontSize: '0.8125rem',
            letterSpacing: '0.03em',
            borderBottom: '2px solid #C5CAE9',
          },
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          transition: 'background-color 0.15s ease',
          '&:hover': { backgroundColor: '#F5F5F5' },
          '&:last-child td': { borderBottom: 0 },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          padding: '12px 16px',
          fontSize: '0.8125rem',
          borderBottom: '1px solid #EEEEEE',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 8, fontWeight: 500, fontSize: '0.75rem' },
        sizeSmall: { height: 26 },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 24,
          border: 'none',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: { root: { fontWeight: 600, fontSize: '1.125rem', padding: '20px 24px 8px' } },
    },
    MuiDialogContent: {
      styleOverrides: { root: { padding: '12px 24px' } },
    },
    MuiDialogActions: {
      styleOverrides: { root: { padding: '12px 24px 20px' } },
    },
    MuiAppBar: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          color: '#1C1B1F',
          borderBottom: '1px solid #E0E0E0',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          border: 'none',
          boxShadow: '2px 0 8px rgba(0,0,0,0.04)',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          margin: '2px 8px',
          padding: '8px 16px',
          transition: 'all 0.15s ease',
          '&.Mui-selected': {
            backgroundColor: 'rgba(21,101,192,0.12)',
            color: '#1565C0',
            '&:hover': { backgroundColor: 'rgba(21,101,192,0.16)' },
            '& .MuiListItemIcon-root': { color: '#1565C0' },
          },
          '&:hover': { backgroundColor: 'rgba(21,101,192,0.06)' },
        },
      },
    },
    MuiListItemIcon: {
      styleOverrides: { root: { minWidth: 40, color: '#49454F' } },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 10, alignItems: 'center' },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: { borderRadius: 8, fontSize: '0.75rem' },
      },
    },
    MuiPopover: {
      styleOverrides: { paper: { borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' } },
    },
    MuiMenu: {
      styleOverrides: { paper: { borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' } },
    },
  },
});
