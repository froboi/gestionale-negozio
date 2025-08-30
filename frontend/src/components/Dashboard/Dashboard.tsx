import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Box,
  Paper
} from '@mui/material';
import {
  Inventory as ProductsIcon,
  People as CustomersIcon,
  ShoppingCart as SalesIcon,
  AdminPanelSettings as AdminIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const menuItems = [
    {
      title: 'Gestione Prodotti',
      description: 'Aggiungi, modifica e gestisci il catalogo prodotti del negozio',
      icon: <ProductsIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
      path: '/products',
      color: '#1976d2'
    },
    {
      title: 'Gestione Clienti',
      description: 'Gestisci i dati dei clienti e le loro informazioni',
      icon: <CustomersIcon sx={{ fontSize: 40, color: 'success.main' }} />,
      path: '/customers',
      color: '#2e7d32'
    },
    {
      title: 'Vendite',
      description: 'Gestisci le vendite e visualizza i report',
      icon: <SalesIcon sx={{ fontSize: 40, color: 'warning.main' }} />,
      path: '/sales',
      color: '#ed6c02'
    }
  ];

  if (user?.role === 'admin') {
    menuItems.push({
      title: 'Amministrazione',
      description: 'Gestisci utenti e configurazioni del sistema',
      icon: <AdminIcon sx={{ fontSize: 40, color: 'error.main' }} />,
      path: '/admin',
      color: '#d32f2f'
    });
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Dashboard
      </Typography>
      
      <Typography variant="body1" color="text.secondary" paragraph>
        Benvenuto nel sistema di gestione del negozio. Seleziona una sezione per iniziare.
      </Typography>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        {menuItems.map((item, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Card 
              sx={{ 
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 3
                }
              }}
            >
              <CardContent sx={{ flexGrow: 1, textAlign: 'center', pt: 3 }}>
                <Box sx={{ mb: 2 }}>
                  {item.icon}
                </Box>
                <Typography variant="h6" component="h2" gutterBottom>
                  {item.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {item.description}
                </Typography>
              </CardContent>
              <CardActions sx={{ justifyContent: 'center', pb: 2 }}>
                <Button
                  variant="contained"
                  onClick={() => navigate(item.path)}
                  sx={{
                    backgroundColor: item.color,
                    '&:hover': {
                      backgroundColor: item.color,
                      filter: 'brightness(0.9)'
                    }
                  }}
                >
                  Apri
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ mt: 4, p: 2, bgcolor: 'grey.50' }}>
        <Typography variant="h6" gutterBottom>
          Informazioni Sistema
        </Typography>
        <Typography variant="body2" color="text.secondary">
          <strong>Utente:</strong> {user?.username} ({user?.role})
        </Typography>
        <Typography variant="body2" color="text.secondary">
          <strong>Ultimo accesso:</strong> {new Date().toLocaleString('it-IT')}
        </Typography>
      </Paper>
    </Box>
  );
};

export default Dashboard;
