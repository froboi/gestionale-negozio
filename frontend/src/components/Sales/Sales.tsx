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
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material';
import {
  Add as AddIcon,
  Receipt as ReceiptIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  ShoppingCart as SalesIcon,
  Euro as EuroIcon,
  CreditCard as CardIcon,
  TrendingUp as TrendingIcon,
  Remove as RemoveIcon,
  GetApp as DownloadIcon
} from '@mui/icons-material';
import axios from 'axios';

interface Sale {
  id: number;
  receipt_number: string;
  total_amount: number;
  discount_amount: number;
  payment_method: string;
  created_at: string;
  customer_id?: number;
  customer_name?: string;
  items_count: number;
  status?: string;
}

interface Product {
  id: number;
  name: string;
  sku: string;
  price: number;
  stock_quantity: number;
}

interface Customer {
  id: number;
  first_name: string;
  last_name: string;
  email?: string;
}

interface SaleItem {
  product_id: number;
  product_name: string;
  quantity: number;
  price: number;
  subtotal: number;
}

interface NewSale {
  customer_id?: number;
  items: Array<{
    product_id: number;
    quantity: number;
    price: number;
  }>;
  discount_amount: number;
  payment_method: string;
}

const Sales: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalSales, setTotalSales] = useState(0);
  const [stats, setStats] = useState<any>(null);

  // Stato per la nuova vendita
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('cash');

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

  useEffect(() => {
    fetchSales();
    fetchStats();
  }, [page, rowsPerPage, searchTerm]);

  useEffect(() => {
    if (openDialog) {
      fetchProducts();
      fetchCustomers();
    }
  }, [openDialog]);

  const fetchSales = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/sales`, {
        params: {
          page: page + 1,
          limit: rowsPerPage,
          search: searchTerm || undefined
        },
        headers: { Authorization: `Bearer ${token}` }
      });

      setSales(response.data.sales);
      setTotalSales(response.data.pagination.totalSales);
      setError(null);
    } catch (error) {
      console.error('Errore nel caricamento delle vendite:', error);
      setError('Errore nel caricamento delle vendite');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/sales/stats/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Errore nel caricamento delle statistiche:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/products`, {
        params: { limit: 1000 },
        headers: { Authorization: `Bearer ${token}` }
      });
      setProducts(response.data.products);
    } catch (error) {
      console.error('Errore nel caricamento dei prodotti:', error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/customers`, {
        params: { limit: 1000 },
        headers: { Authorization: `Bearer ${token}` }
      });
      setCustomers(response.data.customers);
    } catch (error) {
      console.error('Errore nel caricamento dei clienti:', error);
    }
  };

  const handleOpenDialog = () => {
    setSelectedCustomer(null);
    setSelectedProduct(null);
    setSaleItems([]);
    setDiscountAmount(0);
    setPaymentMethod('cash');
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const addProductToSale = () => {
    if (!selectedProduct) return;

    const existingItem = saleItems.find(item => item.product_id === selectedProduct.id);
    
    if (existingItem) {
      // Incrementa quantità se il prodotto è già presente
      setSaleItems(prev => prev.map(item => 
        item.product_id === selectedProduct.id 
          ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * item.price }
          : item
      ));
    } else {
      // Aggiungi nuovo prodotto
      const newItem: SaleItem = {
        product_id: selectedProduct.id,
        product_name: selectedProduct.name,
        quantity: 1,
        price: selectedProduct.price,
        subtotal: selectedProduct.price
      };
      setSaleItems(prev => [...prev, newItem]);
    }
    
    setSelectedProduct(null);
  };

  const updateItemQuantity = (productId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      setSaleItems(prev => prev.filter(item => item.product_id !== productId));
    } else {
      setSaleItems(prev => prev.map(item => 
        item.product_id === productId 
          ? { ...item, quantity: newQuantity, subtotal: newQuantity * item.price }
          : item
      ));
    }
  };

  const removeItem = (productId: number) => {
    setSaleItems(prev => prev.filter(item => item.product_id !== productId));
  };

  const calculateTotal = () => {
    const subtotal = saleItems.reduce((sum, item) => sum + item.subtotal, 0);
    return subtotal - discountAmount;
  };

  const handleSubmitSale = async () => {
    if (saleItems.length === 0) {
      setError('Aggiungi almeno un prodotto alla vendita');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const newSale: NewSale = {
        customer_id: selectedCustomer?.id,
        items: saleItems.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price
        })),
        discount_amount: discountAmount,
        payment_method: paymentMethod
      };

      await axios.post(`${API_BASE_URL}/sales`, newSale, {
        headers: { Authorization: `Bearer ${token}` }
      });

      fetchSales();
      fetchStats();
      handleCloseDialog();
      setError(null);
    } catch (error) {
      console.error('Errore nella creazione della vendita:', error);
      setError('Errore nella creazione della vendita');
    }
  };

  const downloadReceipt = async (saleId: number, receiptNumber: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/sales/${saleId}/receipt`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ricevuta-${receiptNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Errore nel download della ricevuta:', error);
      setError('Errore nel download della ricevuta');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPaymentMethodLabel = (method: string) => {
    const methods: { [key: string]: string } = {
      cash: 'Contanti',
      card: 'Carta',
      bank_transfer: 'Bonifico',
      other: 'Altro'
    };
    return methods[method] || method;
  };

  if (loading && sales.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography>Caricamento vendite...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Gestione Vendite
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenDialog}
        >
          Nuova Vendita
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Statistiche */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <SalesIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                <Typography variant="h6">Vendite Oggi</Typography>
                <Typography variant="h4" color="primary">{stats.today.count}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatCurrency(stats.today.total)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <TrendingIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                <Typography variant="h6">Vendite 30gg</Typography>
                <Typography variant="h4" color="success">{stats.period.count}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatCurrency(stats.period.total)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <EuroIcon sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
                <Typography variant="h6">Media per Vendita</Typography>
                <Typography variant="h4" color="warning.main">
                  {formatCurrency(stats.period.count > 0 ? stats.period.total / stats.period.count : 0)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <CardIcon sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
                <Typography variant="h6">Totale Vendite</Typography>
                <Typography variant="h4" color="info">{totalSales}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Ricerca */}
      <Box mb={2}>
        <TextField
          fullWidth
          placeholder="Cerca vendite per numero ricevuta o cliente..."
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

      {/* Tabella vendite */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>N° Ricevuta</TableCell>
              <TableCell>Data/Ora</TableCell>
              <TableCell>Cliente</TableCell>
              <TableCell align="center">Articoli</TableCell>
              <TableCell align="right">Sconto</TableCell>
              <TableCell align="right">Totale</TableCell>
              <TableCell>Pagamento</TableCell>
              <TableCell align="center">Azioni</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sales.map((sale) => (
              <TableRow key={sale.id} hover>
                <TableCell>
                  <Typography variant="subtitle2" fontWeight="bold">
                    {sale.receipt_number}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    ID: {sale.id}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {formatDate(sale.created_at)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {sale.customer_name || 'Cliente anonimo'}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Chip 
                    label={sale.items_count} 
                    color="primary" 
                    variant="outlined"
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" color="error">
                    {sale.discount_amount > 0 ? `-${formatCurrency(sale.discount_amount)}` : '-'}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" fontWeight="bold" color="success.main">
                    {formatCurrency(sale.total_amount)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={getPaymentMethodLabel(sale.payment_method)}
                    size="small"
                    color="default"
                  />
                </TableCell>
                <TableCell align="center">
                  <IconButton
                    onClick={() => downloadReceipt(sale.id, sale.receipt_number)}
                    color="primary"
                    size="small"
                    title="Scarica ricevuta"
                  >
                    <DownloadIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        <TablePagination
          component="div"
          count={totalSales}
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

      {/* Dialog per nuova vendita */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="lg" fullWidth>
        <DialogTitle>Nuova Vendita</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {/* Selezione cliente */}
            <Grid item xs={12} md={6}>
              <Autocomplete
                options={customers}
                getOptionLabel={(option) => `${option.first_name} ${option.last_name}`}
                value={selectedCustomer}
                onChange={(_, newValue) => setSelectedCustomer(newValue)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Cliente (opzionale)"
                    placeholder="Cerca cliente..."
                  />
                )}
              />
            </Grid>

            {/* Metodo di pagamento */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Metodo di Pagamento</InputLabel>
                <Select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  label="Metodo di Pagamento"
                >
                  <MenuItem value="cash">Contanti</MenuItem>
                  <MenuItem value="card">Carta</MenuItem>
                  <MenuItem value="bank_transfer">Bonifico</MenuItem>
                  <MenuItem value="other">Altro</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Aggiunta prodotti */}
            <Grid item xs={12}>
              <Box display="flex" gap={2} alignItems="center">
                <Autocomplete
                  sx={{ flexGrow: 1 }}
                  options={products}
                  getOptionLabel={(option) => `${option.name} - ${option.sku} (€${option.price})`}
                  value={selectedProduct}
                  onChange={(_, newValue) => setSelectedProduct(newValue)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Aggiungi Prodotto"
                      placeholder="Cerca prodotto..."
                    />
                  )}
                />
                <Button
                  variant="contained"
                  onClick={addProductToSale}
                  disabled={!selectedProduct}
                >
                  Aggiungi
                </Button>
              </Box>
            </Grid>

            {/* Lista prodotti nella vendita */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Prodotti nella Vendita
              </Typography>
              {saleItems.length === 0 ? (
                <Typography color="text.secondary">
                  Nessun prodotto aggiunto alla vendita
                </Typography>
              ) : (
                <List>
                  {saleItems.map((item) => (
                    <ListItem key={item.product_id} divider>
                      <ListItemText
                        primary={item.product_name}
                        secondary={`€${item.price.toFixed(2)} x ${item.quantity} = €${item.subtotal.toFixed(2)}`}
                      />
                      <ListItemSecondaryAction>
                        <Box display="flex" alignItems="center" gap={1}>
                          <IconButton
                            size="small"
                            onClick={() => updateItemQuantity(item.product_id, item.quantity - 1)}
                          >
                            <RemoveIcon />
                          </IconButton>
                          <Typography>{item.quantity}</Typography>
                          <IconButton
                            size="small"
                            onClick={() => updateItemQuantity(item.product_id, item.quantity + 1)}
                          >
                            <AddIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => removeItem(item.product_id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              )}
            </Grid>

            {/* Sconto e totale */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Sconto"
                type="number"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                InputProps={{
                  startAdornment: <InputAdornment position="start">€</InputAdornment>,
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" align="center">
                    Totale: {formatCurrency(calculateTotal())}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Annulla</Button>
          <Button 
            onClick={handleSubmitSale} 
            variant="contained"
            disabled={saleItems.length === 0}
          >
            Completa Vendita
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Sales;
