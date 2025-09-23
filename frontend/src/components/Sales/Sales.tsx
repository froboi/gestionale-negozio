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
  ListItemSecondaryAction,
  Checkbox,
  FormControlLabel
} from '@mui/material';
import {
  Add as AddIcon,
  Receipt as ReceiptIcon,
  Search as SearchIcon,
  ShoppingCart as SalesIcon,
  Euro as EuroIcon,
  CreditCard as CardIcon,
  TrendingUp as TrendingIcon,
  Remove as RemoveIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
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
  description: string;
  code: string;
  price: string; // API restituisce stringa
  quantity: number;
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
  const [purchaseStats, setPurchaseStats] = useState<any>(null);

  // Stato per la nuova vendita
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [discountAmount, setDiscountAmount] = useState<string>(''); // Cambio a stringa per gestire campo vuoto
  const [discountInEuro, setDiscountInEuro] = useState(false); // false = percentuale (default), true = euro
  const [paymentMethod, setPaymentMethod] = useState('cash');

  // Stati per la modifica vendita
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editSaleItems, setEditSaleItems] = useState<SaleItem[]>([]);
  const [editPaymentMethod, setEditPaymentMethod] = useState('cash');

  useEffect(() => {
    fetchSales();
    fetchPurchaseStats();
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
      const response = await axios.get('/api/sales', {
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

  const fetchPurchaseStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/sales/stats/purchases', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPurchaseStats(response.data);
    } catch (error) {
      console.error('Errore nel caricamento delle statistiche acquisti:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/products', {
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
      const response = await axios.get('/api/customers', {
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
    setDiscountAmount(''); // Reset con stringa vuota
    setDiscountInEuro(false);
    setPaymentMethod('cash');
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const addProductToSale = () => {
    if (!selectedProduct) return;

    const productPrice = parseFloat(selectedProduct.price);
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
        product_name: selectedProduct.description,
        quantity: 1,
        price: productPrice,
        subtotal: productPrice
      };
      setSaleItems(prev => [...prev, newItem]);
    }
    
    setSelectedProduct(null);
  };

  const addProductToEditSale = () => {
    if (!selectedProduct) return;

    const productPrice = parseFloat(selectedProduct.price);
    const existingItem = editSaleItems.find(item => item.product_id === selectedProduct.id);
    
    if (existingItem) {
      // Incrementa quantità se il prodotto è già presente
      setEditSaleItems(prev => prev.map(item => 
        item.product_id === selectedProduct.id 
          ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * item.price }
          : item
      ));
    } else {
      // Aggiungi nuovo prodotto
      const newItem: SaleItem = {
        product_id: selectedProduct.id,
        product_name: selectedProduct.description,
        quantity: 1,
        price: productPrice,
        subtotal: productPrice
      };
      setEditSaleItems(prev => [...prev, newItem]);
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

  // Gestione intelligente del campo sconto
  const handleDiscountChange = (value: string) => {
    // Permetti campo vuoto, numeri positivi e decimali
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setDiscountAmount(value);
    }
  };

  const handleDiscountBlur = () => {
    // Validazione quando l'utente esce dal campo
    const numValue = parseFloat(discountAmount);
    if (isNaN(numValue) || numValue < 0) {
      setDiscountAmount('0');
    } else if (!discountInEuro && numValue > 100) {
      // Per percentuali, limita a 100%
      setDiscountAmount('100');
    }
  };

  const calculateTotal = () => {
    const subtotal = saleItems.reduce((sum, item) => sum + item.subtotal, 0);
    const discount = parseFloat(discountAmount) || 0; // Converte stringa a numero, default 0
    
    if (discountInEuro) {
      // Sconto in euro
      return Math.max(0, subtotal - discount);
    } else {
      // Sconto in percentuale
      const discountValue = (subtotal * discount) / 100;
      return Math.max(0, subtotal - discountValue);
    }
  };

  const handleSubmitSale = async () => {
    if (saleItems.length === 0) {
      setError('Aggiungi almeno un prodotto alla vendita');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const subtotal = saleItems.reduce((sum, item) => sum + item.subtotal, 0);
      const discount = parseFloat(discountAmount) || 0; // Converte stringa a numero, default 0
      
      // Calcola l'importo dello sconto in euro per il database
      const discountAmountInEuro = discountInEuro 
        ? discount 
        : (subtotal * discount) / 100;

      const newSale: NewSale = {
        customer_id: selectedCustomer?.id,
        items: saleItems.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price
        })),
        discount_amount: discountAmountInEuro,
        payment_method: paymentMethod
      };

      await axios.post('/api/sales', newSale, {
        headers: { Authorization: `Bearer ${token}` }
      });

      fetchSales();
      fetchPurchaseStats();
      handleCloseDialog();
      setError(null);
    } catch (error: any) {
      console.error('Errore nella creazione della vendita:', error);
      setError('Errore nella creazione della vendita');
    }
  };

  const handleEdit = async (sale: Sale) => {
    try {
      console.log('Editing sale:', sale); // Debug
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('Token di autenticazione mancante');
        return;
      }
      
      // Carica i dettagli della vendita con i suoi items
      const response = await axios.get(`/api/sales/${sale.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Sale details response:', response.data); // Debug
      const saleDetails = response.data;
      
      // Verifica che i dati siano validi
      if (!saleDetails) {
        setError('Dati della vendita non validi');
        return;
      }
      
      // Mappa correttamente gli items per il dialog di modifica
      const mappedItems = (saleDetails.items || []).map((item: any) => ({
        product_id: item.product_id,
        product_name: item.product_name || item.description || 'Prodotto sconosciuto',
        quantity: parseInt(item.quantity) || 1,
        price: parseFloat(item.unit_price) || 0,
        subtotal: (parseInt(item.quantity) || 1) * (parseFloat(item.unit_price) || 0)
      }));
      
      console.log('Mapped items:', mappedItems); // Debug
      
      setEditingSale(sale);
      setEditSaleItems(mappedItems);
      
      console.log('Loading sale for edit, keeping original discount');
      
      setEditPaymentMethod(sale.payment_method || 'cash');
      
      // Carica anche prodotti e clienti se necessario
      if (products.length === 0) {
        console.log('Loading products...'); // Debug
        await fetchProducts();
      }
      if (customers.length === 0) {
        console.log('Loading customers...'); // Debug
        await fetchCustomers();
      }
      
      setOpenEditDialog(true);
      
    } catch (error: any) {
      console.error('Error loading sale details:', error);
      setError(`Errore nel caricamento dei dettagli della vendita: ${error.message || 'Errore sconosciuto'}`);
    }
  };

  const handleDelete = async (saleId: number) => {
    if (window.confirm('Sei sicuro di voler eliminare questa vendita?')) {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.delete(`/api/sales/${saleId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.status === 200) {
          // Reload the sales data
          fetchSales();
          fetchPurchaseStats();
        } else {
          setError('Errore durante l\'eliminazione della vendita');
        }
      } catch (error) {
        console.error('Error deleting sale:', error);
        setError('Errore durante l\'eliminazione della vendita');
      }
    }
  };

  const handleCloseEditDialog = () => {
    setOpenEditDialog(false);
    setEditingSale(null);
    setEditSaleItems([]);
    setEditPaymentMethod('cash');
    setError(null);
  };

  const handleUpdateSale = async () => {
    if (!editingSale || editSaleItems.length === 0) {
      setError('Aggiungi almeno un prodotto alla vendita');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      console.log('Updating sale without discount changes');

      const updatedSale = {
        items: editSaleItems.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price
        })),
        discount_amount: editingSale.discount_amount || 0, // Mantieni lo sconto originale
        payment_method: editPaymentMethod
      };

      console.log('Sending update to backend:', JSON.stringify(updatedSale, null, 2));

      await axios.put(`/api/sales/${editingSale.id}`, updatedSale, {
        headers: { Authorization: `Bearer ${token}` }
      });

      fetchSales();
      fetchPurchaseStats();
      handleCloseEditDialog();
      setError(null);
    } catch (error: any) {
      console.error('Errore nella modifica della vendita:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Errore nella modifica della vendita';
      setError(errorMessage);
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

      {/* Statistiche Acquisti */}
      {purchaseStats && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, color: 'text.secondary' }}>
            Statistiche Acquisti
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <SalesIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                  <Typography variant="h6">Vendite Oggi</Typography>
                  <Typography variant="h4" color="primary">
                    {purchaseStats?.todaySales?.count || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {formatCurrency(purchaseStats?.todaySales?.total || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <TrendingIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                  <Typography variant="h6">Vendite del Mese</Typography>
                  <Typography variant="h4" color="success">
                    {purchaseStats?.monthSales?.count || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {formatCurrency(purchaseStats?.monthSales?.total || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <EuroIcon sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
                  <Typography variant="h6">Spesa Media</Typography>
                  <Typography variant="h4" color="warning.main">
                    {formatCurrency(purchaseStats?.averagePurchase || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <CardIcon sx={{ fontSize: 40, color: 'error.main', mb: 1 }} />
                  <Typography variant="h6">Spesa più Alta</Typography>
                  <Typography variant="h4" color="error">
                    {formatCurrency(purchaseStats?.highestPurchase || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
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
                    onClick={() => handleEdit(sale)}
                    color="primary"
                    size="small"
                    title="Modifica vendita"
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    onClick={() => handleDelete(sale.id)}
                    color="error"
                    size="small"
                    title="Elimina vendita"
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
                  getOptionLabel={(option) => `${option.description} - ${option.code} (€${parseFloat(option.price).toFixed(2)})`}
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
                onChange={(e) => handleDiscountChange(e.target.value)}
                onBlur={handleDiscountBlur}
                placeholder="0"
                InputProps={{
                  startAdornment: <InputAdornment position="start">{discountInEuro ? '€' : '%'}</InputAdornment>,
                }}
                inputProps={{
                  min: 0,
                  max: discountInEuro ? undefined : 100,
                  step: discountInEuro ? 0.01 : 1
                }}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={discountInEuro}
                    onChange={(e) => setDiscountInEuro(e.target.checked)}
                  />
                }
                label="Sconto in Euro"
                sx={{ mt: 1 }}
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

      {/* Dialog Modifica Vendita */}
      <Dialog open={openEditDialog} onClose={handleCloseEditDialog} maxWidth="md" fullWidth>
        <DialogTitle>Modifica Vendita</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {error && (
              <Grid item xs={12}>
                <Typography color="error">{error}</Typography>
              </Grid>
            )}

            {/* Metodo di Pagamento */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Metodo di Pagamento</InputLabel>
                <Select
                  value={editPaymentMethod}
                  onChange={(e) => setEditPaymentMethod(e.target.value)}
                  label="Metodo di Pagamento"
                >
                  <MenuItem value="cash">Contanti</MenuItem>
                  <MenuItem value="card">Carta</MenuItem>
                  <MenuItem value="bank_transfer">Bonifico</MenuItem>
                  <MenuItem value="other">Altro</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Lista prodotti nella vendita */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Prodotti nella Vendita
              </Typography>
              {editSaleItems.length === 0 ? (
                <Typography color="text.secondary">
                  Nessun prodotto nella vendita
                </Typography>
              ) : (
                <List>
                  {editSaleItems.map((item, index) => (
                    <ListItem key={index}>
                      <ListItemText
                        primary={item?.product_name || 'Prodotto sconosciuto'}
                        secondary={`Quantità: ${item?.quantity || 0} - Prezzo: €${parseFloat((item?.price || 0).toString()).toFixed(2)}`}
                      />
                      <ListItemSecondaryAction>
                        <Typography variant="subtitle1">
                          €{((item?.quantity || 0) * parseFloat((item?.price || 0).toString())).toFixed(2)}
                        </Typography>
                        <IconButton
                          edge="end"
                          onClick={() => {
                            const newItems = editSaleItems.filter((_, i) => i !== index);
                            setEditSaleItems(newItems);
                          }}
                        >
                          <RemoveIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              )}
            </Grid>

            {/* Aggiungi Prodotto */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Aggiungi Prodotto
              </Typography>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={8}>
                  <Autocomplete
                    options={products}
                    getOptionLabel={(option) => `${option.description} - €${option.price}`}
                    value={selectedProduct}
                    onChange={(_, newValue) => setSelectedProduct(newValue)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Seleziona Prodotto"
                        fullWidth
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Button
                    variant="contained"
                    onClick={addProductToEditSale}
                    disabled={!selectedProduct}
                    startIcon={<AddIcon />}
                    fullWidth
                  >
                    Aggiungi
                  </Button>
                </Grid>
              </Grid>
            </Grid>

            {/* Riepilogo */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Riepilogo Modifica
                  </Typography>
                  <Typography>
                    Subtotale: {formatCurrency(editSaleItems.reduce((sum, item) => {
                      const quantity = item?.quantity || 0;
                      const price = parseFloat((item?.price || 0).toString());
                      return sum + (quantity * price);
                    }, 0))}
                  </Typography>
                  <Typography>
                    Sconto originale: {editingSale?.discount_amount ? formatCurrency(editingSale.discount_amount) : '€0,00'}
                  </Typography>
                  <Typography variant="h6">
                    Totale: {formatCurrency((() => {
                      const subtotal = editSaleItems.reduce((sum, item) => {
                        const quantity = item?.quantity || 0;
                        const price = parseFloat((item?.price || 0).toString());
                        return sum + (quantity * price);
                      }, 0);
                      const originalDiscount = editingSale?.discount_amount || 0;
                      return Math.max(0, subtotal - originalDiscount);
                    })())}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog}>Annulla</Button>
          <Button 
            onClick={handleUpdateSale} 
            variant="contained"
            disabled={editSaleItems.length === 0}
          >
            Salva Modifiche
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Sales;
