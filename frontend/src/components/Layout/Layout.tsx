import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Container,
  Tabs,
  Tab
} from '@mui/material';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Determina quale tab è attiva in base al path corrente
  const getCurrentTab = () => {
    const path = location.pathname;
    if (path.startsWith('/products')) return 'products';
    if (path.startsWith('/customers')) return 'customers';
    if (path.startsWith('/sales')) return 'sales';
    if (path.startsWith('/admin')) return 'admin';
    return 'dashboard';
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: string) => {
    navigate(`/${newValue}`);
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Gestionale Negozio - {user?.username}
          </Typography>
          <Button color="inherit" onClick={logout}>
            Logout
          </Button>
        </Toolbar>
        
        {/* Barra di navigazione */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'primary.dark' }}>
          <Tabs
            value={getCurrentTab()}
            onChange={handleTabChange}
            textColor="inherit"
            indicatorColor="secondary"
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              '& .MuiTab-root': {
                color: 'rgba(255, 255, 255, 0.7)',
                '&.Mui-selected': {
                  color: 'white',
                }
              }
            }}
          >
            <Tab label="Dashboard" value="dashboard" />
            <Tab label="Prodotti" value="products" />
            <Tab label="Clienti" value="customers" />
            <Tab label="Vendite" value="sales" />
            {user?.role === 'admin' && (
              <Tab label="Amministrazione" value="admin" />
            )}
          </Tabs>
        </Box>
      </AppBar>
      
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {children}
      </Container>
    </Box>
  );
};

export default Layout;
