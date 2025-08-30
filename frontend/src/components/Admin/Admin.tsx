import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Chip,
  Tabs,
  Tab,
  IconButton,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import {
  PersonAdd as PersonAddIcon,
  Security as SecurityIcon,
  Storage as DatabaseIcon,
  Assessment as ReportsIcon,
  Backup as BackupIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  VisibilityOff as VisibilityOffIcon,
  AdminPanelSettings as AdminIcon,
  Person as UserIcon,
  Info as InfoIcon,
  Storage as StorageIcon
} from '@mui/icons-material';
import axios from 'axios';

interface User {
  id: number;
  username: string;
  email?: string;
  role: string;
  created_at: string;
  last_login?: string;
  is_active: boolean;
}

const Admin: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Dialog states
  const [openUserDialog, setOpenUserDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  // User form state
  const [userForm, setUserForm] = useState({
    username: '',
    email: '',
    password: '',
    role: 'user'
  });

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

  useEffect(() => {
    if (activeTab === 0) {
      fetchUsers();
    }
  }, [activeTab]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data.users || []);
      setError(null);
    } catch (error) {
      console.error('Errore nel caricamento degli utenti:', error);
      setError('Errore nel caricamento degli utenti');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenUserDialog = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setUserForm({
        username: user.username,
        email: user.email || '',
        password: '',
        role: user.role
      });
    } else {
      setEditingUser(null);
      setUserForm({
        username: '',
        email: '',
        password: '',
        role: 'user'
      });
    }
    setOpenUserDialog(true);
  };

  const handleCloseUserDialog = () => {
    setOpenUserDialog(false);
    setEditingUser(null);
    setShowPassword(false);
  };

  const handleUserFormChange = (field: string, value: string) => {
    setUserForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmitUser = async () => {
    try {
      const token = localStorage.getItem('token');
      
      if (editingUser) {
        // Update user
        await axios.put(`${API_BASE_URL}/admin/users/${editingUser.id}`, userForm, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSuccess('Utente aggiornato con successo');
      } else {
        // Create user
        await axios.post(`${API_BASE_URL}/admin/users`, userForm, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSuccess('Utente creato con successo');
      }
      
      fetchUsers();
      handleCloseUserDialog();
      setError(null);
    } catch (error) {
      console.error('Errore nel salvataggio dell\'utente:', error);
      setError('Errore nel salvataggio dell\'utente');
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (window.confirm('Sei sicuro di voler eliminare questo utente?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`${API_BASE_URL}/admin/users/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        fetchUsers();
        setSuccess('Utente eliminato con successo');
        setError(null);
      } catch (error) {
        console.error('Errore nell\'eliminazione dell\'utente:', error);
        setError('Errore nell\'eliminazione dell\'utente');
      }
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getUserRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'error';
      case 'manager': return 'warning';
      default: return 'default';
    }
  };

  const getUserRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Amministratore';
      case 'manager': return 'Manager';
      default: return 'Utente';
    }
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Amministrazione Sistema
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab icon={<PersonAddIcon />} label="Gestione Utenti" />
          <Tab icon={<SecurityIcon />} label="Sicurezza" />
          <Tab icon={<DatabaseIcon />} label="Sistema" />
          <Tab icon={<ReportsIcon />} label="Report" />
        </Tabs>
      </Box>

      {/* Tab 0: Gestione Utenti */}
      {activeTab === 0 && (
        <Box>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h5">Gestione Utenti</Typography>
            <Button
              variant="contained"
              startIcon={<PersonAddIcon />}
              onClick={() => handleOpenUserDialog()}
            >
              Nuovo Utente
            </Button>
          </Box>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Utente</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Ruolo</TableCell>
                  <TableCell>Stato</TableCell>
                  <TableCell>Ultimo Accesso</TableCell>
                  <TableCell>Registrato</TableCell>
                  <TableCell align="center">Azioni</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        {user.role === 'admin' ? <AdminIcon sx={{ mr: 1, color: 'error.main' }} /> : <UserIcon sx={{ mr: 1 }} />}
                        <Box>
                          <Typography variant="subtitle2">{user.username}</Typography>
                          <Typography variant="caption" color="textSecondary">ID: {user.id}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>{user.email || '-'}</TableCell>
                    <TableCell>
                      <Chip 
                        label={getUserRoleLabel(user.role)}
                        color={getUserRoleColor(user.role)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={user.is_active ? 'Attivo' : 'Disattivato'}
                        color={user.is_active ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{formatDate(user.last_login)}</TableCell>
                    <TableCell>{formatDate(user.created_at)}</TableCell>
                    <TableCell align="center">
                      <IconButton
                        onClick={() => handleOpenUserDialog(user)}
                        color="primary"
                        size="small"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        onClick={() => handleDeleteUser(user.id)}
                        color="error"
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Tab 1: Sicurezza */}
      {activeTab === 1 && (
        <Box>
          <Typography variant="h5" gutterBottom>Configurazione Sicurezza</Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <SecurityIcon sx={{ mr: 2, color: 'primary.main' }} />
                    <Typography variant="h6">Autenticazione</Typography>
                  </Box>
                  <List>
                    <ListItem>
                      <ListItemText
                        primary="Scadenza Token JWT"
                        secondary="24 ore"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Hashing Password"
                        secondary="bcrypt con salt rounds: 12"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Rate Limiting"
                        secondary="100 richieste per 15 minuti"
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <SecurityIcon sx={{ mr: 2, color: 'warning.main' }} />
                    <Typography variant="h6">Sicurezza Headers</Typography>
                  </Box>
                  <List>
                    <ListItem>
                      <ListItemText
                        primary="Content Security Policy"
                        secondary="Attivo"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="HTTPS Redirect"
                        secondary="Forzato in produzione"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="CORS Policy"
                        secondary="Configurato per frontend"
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Tab 2: Sistema */}
      {activeTab === 2 && (
        <Box>
          <Typography variant="h5" gutterBottom>Informazioni Sistema</Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <InfoIcon sx={{ mr: 2, color: 'info.main' }} />
                    <Typography variant="h6">Informazioni Generali</Typography>
                  </Box>
                  <List>
                    <ListItem>
                      <ListItemText
                        primary="Versione Sistema"
                        secondary="1.0.0"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Database"
                        secondary="MySQL 8.0"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Node.js"
                        secondary="18.x"
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <BackupIcon sx={{ mr: 2, color: 'primary.main' }} />
                    <Typography variant="h6">Backup & Manutenzione</Typography>
                  </Box>
                  <List>
                    <ListItem>
                      <ListItemText
                        primary="Ultimo Backup"
                        secondary="Non configurato"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Backup Automatico"
                        secondary="Disabilitato"
                      />
                    </ListItem>
                  </List>
                  <CardActions>
                    <Button size="small" color="primary">
                      Configura Backup
                    </Button>
                    <Button size="small" color="warning">
                      Backup Manuale
                    </Button>
                  </CardActions>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Tab 3: Report */}
      {activeTab === 3 && (
        <Box>
          <Typography variant="h5" gutterBottom>Report e Analytics</Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <ReportsIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
                  <Typography variant="h6">Report Vendite</Typography>
                  <Typography color="text.secondary">
                    Genera report dettagliati delle vendite
                  </Typography>
                </CardContent>
                <CardActions sx={{ justifyContent: 'center' }}>
                  <Button variant="outlined">Genera Report</Button>
                </CardActions>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <StorageIcon sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
                  <Typography variant="h6">Report Inventario</Typography>
                  <Typography color="text.secondary">
                    Analisi completa dell'inventario
                  </Typography>
                </CardContent>
                <CardActions sx={{ justifyContent: 'center' }}>
                  <Button variant="outlined">Genera Report</Button>
                </CardActions>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <PersonAddIcon sx={{ fontSize: 60, color: 'warning.main', mb: 2 }} />
                  <Typography variant="h6">Report Clienti</Typography>
                  <Typography color="text.secondary">
                    Analisi dei clienti e fedeltà
                  </Typography>
                </CardContent>
                <CardActions sx={{ justifyContent: 'center' }}>
                  <Button variant="outlined">Genera Report</Button>
                </CardActions>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Dialog per Gestione Utenti */}
      <Dialog open={openUserDialog} onClose={handleCloseUserDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingUser ? 'Modifica Utente' : 'Nuovo Utente'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Username *"
                value={userForm.username}
                onChange={(e) => handleUserFormChange('username', e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={userForm.email}
                onChange={(e) => handleUserFormChange('email', e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={editingUser ? 'Nuova Password (lascia vuoto per non modificare)' : 'Password *'}
                type={showPassword ? 'text' : 'password'}
                value={userForm.password}
                onChange={(e) => handleUserFormChange('password', e.target.value)}
                required={!editingUser}
                InputProps={{
                  endAdornment: (
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOffIcon /> : <ViewIcon />}
                    </IconButton>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Ruolo</InputLabel>
                <Select
                  value={userForm.role}
                  onChange={(e) => handleUserFormChange('role', e.target.value)}
                  label="Ruolo"
                >
                  <MenuItem value="user">Utente</MenuItem>
                  <MenuItem value="manager">Manager</MenuItem>
                  <MenuItem value="admin">Amministratore</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseUserDialog}>Annulla</Button>
          <Button 
            onClick={handleSubmitUser} 
            variant="contained"
            disabled={!userForm.username || (!editingUser && !userForm.password)}
          >
            {editingUser ? 'Salva Modifiche' : 'Crea Utente'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Admin;