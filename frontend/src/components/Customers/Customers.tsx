import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Chip,
  TablePagination,
  InputAdornment,
  Alert,
  Card,
  CardContent
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  Cake as CakeIcon,
  Star as StarIcon
} from '@mui/icons-material';
import axios from 'axios';

interface Customer {
  id: number;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  birth_date?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  loyalty_points: number;
  total_spent: number;
  purchase_count?: number;
  last_purchase?: string;
  created_at: string;
}

interface NewCustomer {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  birth_date?: string;
  address?: string;
  city?: string;
  postal_code?: string;
}

const Customers: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCustomers, setTotalCustomers] = useState(0);

  const [formData, setFormData] = useState<NewCustomer>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    birth_date: '',
    address: '',
    city: '',
    postal_code: ''
  });

  useEffect(() => {
    fetchCustomers();
  }, [page, rowsPerPage, searchTerm]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/customers', {
        params: {
          page: page + 1,
          limit: rowsPerPage,
          search: searchTerm || undefined
        },
        headers: { Authorization: `Bearer ${token}` }
      });

      setCustomers(response.data.customers);
      setTotalCustomers(response.data.pagination.totalCustomers);
      setError(null);
    } catch (error) {
      console.error('Errore nel caricamento dei clienti:', error);
      setError('Errore nel caricamento dei clienti');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        first_name: customer.first_name,
        last_name: customer.last_name,
        email: customer.email || '',
        phone: customer.phone || '',
        birth_date: customer.birth_date ? customer.birth_date.split('T')[0] : '',
        address: customer.address || '',
        city: customer.city || '',
        postal_code: customer.postal_code || ''
      });
    } else {
      setEditingCustomer(null);
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        birth_date: '',
        address: '',
        city: '',
        postal_code: ''
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingCustomer(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem('token');
      const url = editingCustomer 
        ? `/api/customers/${editingCustomer.id}`
        : '/api/customers';
      
      const method = editingCustomer ? 'put' : 'post';
      
      await axios[method](url, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      fetchCustomers();
      handleCloseDialog();
      setError(null);
    } catch (error) {
      console.error('Errore nel salvataggio del cliente:', error);
      setError('Errore nel salvataggio del cliente');
    }
  };

  const handleDelete = async (customerId: number) => {
    if (window.confirm('Sei sicuro di voler eliminare questo cliente?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`/api/customers/${customerId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        fetchCustomers();
        setError(null);
      } catch (error) {
        console.error('Errore nell\'eliminazione del cliente:', error);
        setError('Errore nell\'eliminazione del cliente');
      }
    }
  };

  const formatCurrency = (amount: number | null | undefined) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('it-IT');
  };

  // Trova il cliente con più acquisti
  const getTopCustomerByPurchases = () => {
    if (customers.length === 0) return null;
    return customers.reduce((top, current) => 
      (current.purchase_count || 0) > (top.purchase_count || 0) ? current : top
    );
  };

  // Trova il cliente con la spesa più alta
  const getTopCustomerBySpending = () => {
    if (customers.length === 0) return null;
    return customers.reduce((top, current) => 
      current.total_spent > top.total_spent ? current : top
    );
  };

  if (loading && customers.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography>Caricamento clienti...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Gestione Clienti
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Nuovo Cliente
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Statistiche rapide */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <PersonIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
              <Typography variant="h6">Totale Clienti</Typography>
              <Typography variant="h4" color="primary">{totalCustomers}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <StarIcon sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
              <Typography variant="h6">Punti Fedeltà Totali</Typography>
              <Typography variant="h4" color="warning.main">
                {customers.reduce((sum, c) => sum + c.loyalty_points, 0).toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <PersonIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
              <Typography variant="h6">Cliente Top Acquisti</Typography>
              {getTopCustomerByPurchases() ? (
                <>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    {getTopCustomerByPurchases()!.first_name} {getTopCustomerByPurchases()!.last_name}
                  </Typography>
                  <Typography variant="h6" color="success.main">
                    {getTopCustomerByPurchases()!.purchase_count || 0} acquisti
                  </Typography>
                </>
              ) : (
                <Typography variant="body2">Nessun dato</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <StarIcon sx={{ fontSize: 40, color: 'error.main', mb: 1 }} />
              <Typography variant="h6">Cliente Top Spesa</Typography>
              {getTopCustomerBySpending() ? (
                <>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    {getTopCustomerBySpending()!.first_name} {getTopCustomerBySpending()!.last_name}
                  </Typography>
                  <Typography variant="h6" color="error.main">
                    {formatCurrency(getTopCustomerBySpending()!.total_spent)}
                  </Typography>
                </>
              ) : (
                <Typography variant="body2">Nessun dato</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Ricerca */}
      <Box mb={2}>
        <TextField
          fullWidth
          placeholder="Cerca clienti per nome, email o telefono..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Tabella clienti */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nome</TableCell>
              <TableCell>Contatti</TableCell>
              <TableCell>Indirizzo</TableCell>
              <TableCell>Data di Nascita</TableCell>
              <TableCell align="right">Punti Fedeltà</TableCell>
              <TableCell align="right">Spesa Totale</TableCell>
              <TableCell>Ultimo Acquisto</TableCell>
              <TableCell align="center">Azioni</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {customers.map((customer) => (
              <TableRow key={customer.id} hover>
                <TableCell>
                  <Box>
                    <Typography variant="subtitle2">
                      {customer.first_name} {customer.last_name}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      ID: {customer.id}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box>
                    {customer.email && (
                      <Box display="flex" alignItems="center" mb={0.5}>
                        <EmailIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                        <Typography variant="body2">{customer.email}</Typography>
                      </Box>
                    )}
                    {customer.phone && (
                      <Box display="flex" alignItems="center">
                        <PhoneIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                        <Typography variant="body2">{customer.phone}</Typography>
                      </Box>
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  {customer.address && (
                    <Box display="flex" alignItems="center">
                      <LocationIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                      <Box>
                        <Typography variant="body2">{customer.address}</Typography>
                        {customer.city && (
                          <Typography variant="caption" color="textSecondary">
                            {customer.city} {customer.postal_code}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  )}
                </TableCell>
                <TableCell>
                  {customer.birth_date && (
                    <Box display="flex" alignItems="center">
                      <CakeIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                      <Typography variant="body2">{formatDate(customer.birth_date)}</Typography>
                    </Box>
                  )}
                </TableCell>
                <TableCell align="right">
                  <Chip 
                    label={(customer.loyalty_points || 0).toLocaleString()} 
                    color="warning" 
                    variant="outlined"
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" color="success.main" fontWeight="bold">
                    {formatCurrency(customer.total_spent)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {formatDate(customer.last_purchase)}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <IconButton
                    onClick={() => handleOpenDialog(customer)}
                    color="primary"
                    size="small"
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    onClick={() => handleDelete(customer.id)}
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
        
        <TablePagination
          component="div"
          count={totalCustomers}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          labelRowsPerPage="Righe per pagina:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} di ${count}`}
        />
      </TableContainer>

      {/* Dialog per aggiungere/modificare cliente */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingCustomer ? 'Modifica Cliente' : 'Nuovo Cliente'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Nome *"
                name="first_name"
                value={formData.first_name}
                onChange={handleInputChange}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Cognome *"
                name="last_name"
                value={formData.last_name}
                onChange={handleInputChange}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Telefono"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Data di Nascita"
                name="birth_date"
                type="date"
                value={formData.birth_date}
                onChange={handleInputChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="CAP"
                name="postal_code"
                value={formData.postal_code}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={8}>
              <TextField
                fullWidth
                label="Indirizzo"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Città"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Annulla</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained"
            disabled={!formData.first_name || !formData.last_name}
          >
            {editingCustomer ? 'Salva Modifiche' : 'Crea Cliente'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Customers;
