import React, { useState, useEffect } from 'react';
import {
  Typography,
  Button,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Chip,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  UploadFile as UploadFileIcon
} from '@mui/icons-material';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

interface Product {
  id: number;
  code: string;
  description: string;
  category: string;
  supplier: string;
  size: string;
  color: string;
  season: string;
  price: number;
  cost: number;
  quantity: number;
  min_quantity: number;
  brand: string;
  created_at: string;
  updated_at: string;
}

interface ProductFormData {
  code: string;
  description: string;
  category: string;
  supplier: string;
  size: string;
  color: string;
  season: string;
  price: string;
  cost: string;
  quantity: string;
}

const availableSizes = ['XS/40', 'S/42', 'M/44', 'L/46', 'XL/48', 'XXL/50', 'No'];

const Products = (): JSX.Element => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // Form data
  const [formData, setFormData] = useState<ProductFormData>({
    code: '',
    description: '',
    category: '',
    supplier: '',
    size: '',
    color: '',
    season: '',
    price: '',
    cost: '',
    quantity: ''
  });

  // Gestione taglie multiple
  const [isSingleSize, setIsSingleSize] = useState(true);
  const [sizeRange, setSizeRange] = useState({ start: 0, end: 0 });
  const [sizeQuantities, setSizeQuantities] = useState<{[key: string]: string}>({});
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = token ? { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      } : { 'Content-Type': 'multipart/form-data' };

      const response = await axios.post(`${API_BASE_URL}/products/import-csv`, formData, { headers });
      
      const summary = response.data.summary;
      let message = `Importazione completata: ${summary.success} prodotti importati/aggiornati.`;
      if (summary.errors.length > 0) {
        message += ` ${summary.errors.length} errori (vedi console).`;
        console.warn('Errori importazione CSV:', summary.errors);
      }
      
      alert(message);
      fetchProducts();
    } catch (error: any) {
      console.error('Errore upload CSV:', error);
      setError('Errore durante l\'importazione del file CSV');
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      
      // Assicurati che il token sia presente nell'header
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      const response = await axios.get(`${API_BASE_URL}/products`, { headers });
      
      // Verifica se la risposta ha la struttura corretta
      if (response.data && Array.isArray(response.data.products)) {
        // Nuova struttura con pagination
        setProducts(response.data.products);
        setError(null);
      } else if (Array.isArray(response.data)) {
        // Vecchia struttura (array diretto)
        setProducts(response.data);
        setError(null);
      } else {
        console.error('Risposta API non valida:', response.data);
        setError('Errore: la risposta del server non è valida');
        setProducts([]);
      }
    } catch (error: any) {
      console.error('Errore nel caricamento prodotti:', error);
      
      if (error.response?.status === 401) {
        setError('Non autorizzato. Effettua di nuovo il login.');
      } else if (error.response?.status === 404) {
        setError('Endpoint API non trovato. Verifica la configurazione del server.');
      } else {
        setError(`Errore nel caricamento dei prodotti: ${error.response?.status || 'Connessione fallita'}`);
      }
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof ProductFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSizeRangeChange = (type: 'start' | 'end') => (event: any) => {
    const value = parseInt(event.target.value);
    setSizeRange(prev => {
      const newRange = { ...prev, [type]: value };
      
      // Reset quantities when range changes
      const newQuantities: {[key: string]: string} = {};
      const selectedSizes = getSelectedSizesFromRange(newRange);
      selectedSizes.forEach(size => {
        newQuantities[size] = sizeQuantities[size] || '';
      });
      setSizeQuantities(newQuantities);
      
      return newRange;
    });
  };

  const getSelectedSizesFromRange = (range = sizeRange) => {
    const sizesWithoutNo = availableSizes.filter(size => size !== 'No');
    return sizesWithoutNo.slice(range.start, range.end + 1);
  };

  const getSelectedSizes = () => {
    return getSelectedSizesFromRange();
  };

  const handleOpenDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        code: product.code,
        description: product.description || '',
        category: product.category || '',
        supplier: product.supplier || '',
        size: product.size || '',
        color: product.color || '',
        season: product.season || '',
        price: product.price?.toString() || '',
        cost: product.cost?.toString() || '',
        quantity: product.quantity?.toString() || ''
      });
      setIsSingleSize(true);
    } else {
      setEditingProduct(null);
      setFormData({
        code: '',
        description: '',
        category: '',
        supplier: '',
        size: '',
        color: '',
        season: '',
        price: '',
        cost: '',
        quantity: ''
      });
      setIsSingleSize(true);
      setSizeRange({ start: 0, end: 0 });
      setSizeQuantities({});
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingProduct(null);
    setError('');
  };

  const handleSubmit = async () => {
    if (!formData.code || !formData.price) {
      setError('Per favore compila tutti i campi obbligatori');
      return;
    }

    if (!isSingleSize && getSelectedSizes().length === 0) {
      setError('Seleziona almeno una taglia');
      return;
    }

    if (isSingleSize && !formData.quantity) {
      setError('Inserisci la quantità');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Assicurati che il token sia presente nell'header
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      if (isSingleSize) {
        // Creazione/modifica singola prodotto
        const url = editingProduct 
          ? `${API_BASE_URL}/products/${editingProduct.id}`
          : `${API_BASE_URL}/products`;
        
        const method = editingProduct ? 'PUT' : 'POST';
        const productData = {
          ...formData,
          price: parseFloat(formData.price),
          cost: formData.cost ? parseFloat(formData.cost) : null,
          quantity: parseInt(formData.quantity)
        };

        await axios({
          method,
          url,
          data: productData,
          headers
        });
      } else {
        // Creazione multipla (una per ogni taglia)
        const selectedSizes = getSelectedSizes();
        
        // Prepara i dati base del prodotto
        const baseProduct = {
          code: formData.code,
          description: formData.description,
          category: formData.category,
          color: formData.color,
          price: parseFloat(formData.price),
          cost: formData.cost ? parseFloat(formData.cost) : null,
          supplier: formData.supplier,
          season: formData.season
        };

        // Prepara le quantità per taglia
        const sizeQuantitiesData: { [key: string]: number } = {};
        selectedSizes.forEach(size => {
          const quantity = parseInt(sizeQuantities[size] || '0');
          if (quantity > 0) {
            sizeQuantitiesData[size] = quantity;
          }
        });

        await axios.post(`${API_BASE_URL}/products/multi-size`, {
          baseProduct,
          sizeQuantities: sizeQuantitiesData,
          isSingleSize: false
        }, { headers });
      }

      handleCloseDialog();
      fetchProducts();
    } catch (error: any) {
      console.error('Errore durante il salvataggio:', error);
      setError(error.response?.data?.message || 'Errore durante il salvataggio del prodotto');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo prodotto?')) {
      return;
    }

    try {
      // Assicurati che il token sia presente nell'header
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      await axios.delete(`${API_BASE_URL}/products/${id}`, { headers });
      fetchProducts();
      setError(null);
    } catch (error) {
      setError('Errore nell\'eliminazione del prodotto');
    }
  };

  if (loading && products.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" gutterBottom>
          Gestione Prodotti
        </Typography>
        <Box>
          <input
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <Button
            variant="outlined"
            startIcon={<UploadFileIcon />}
            onClick={() => fileInputRef.current?.click()}
            sx={{ mr: 2 }}
          >
            Importa CSV
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            color="primary"
          >
            Aggiungi Prodotto
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Codice</TableCell>
              <TableCell>Descrizione</TableCell>
              <TableCell>Categoria</TableCell>
              <TableCell>Fornitore</TableCell>
              <TableCell>Taglia</TableCell>
              <TableCell>Colore</TableCell>
              <TableCell>Prezzo</TableCell>
              <TableCell>Quantità</TableCell>
              <TableCell>Azioni</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography variant="body2" color="textSecondary">
                    Nessun prodotto trovato. Clicca "Aggiungi Prodotto" per iniziare.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>{product.code}</TableCell>
                  <TableCell>
                    <Typography variant="subtitle2">{product.description || product.code}</Typography>
                  </TableCell>
                  <TableCell>
                    {product.category && (
                      <Chip label={product.category} size="small" variant="outlined" />
                    )}
                  </TableCell>
                  <TableCell>{product.supplier || '-'}</TableCell>
                  <TableCell>{product.size || '-'}</TableCell>
                  <TableCell>{product.color || '-'}</TableCell>
                  <TableCell>€{parseFloat(String(product.price || '0')).toFixed(2)}</TableCell>
                  <TableCell>
                    <Chip
                      label={product.quantity}
                      color={product.quantity <= 5 ? 'warning' : 'success'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(product)}
                      title="Modifica"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(product.id)}
                      color="error"
                      title="Elimina"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog per aggiungere/modificare prodotto */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          {editingProduct ? 'Modifica Prodotto' : 'Aggiungi Nuovo Prodotto'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Codice Prodotto Base"
                value={formData.code}
                onChange={(e) => handleInputChange('code', e.target.value)}
                required
                helperText="Per prodotti multi-taglia, verrà aggiunto automaticamente il suffisso della taglia"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Categoria"
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Descrizione"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Fornitore"
                value={formData.supplier}
                onChange={(e) => handleInputChange('supplier', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Colore"
                value={formData.color}
                onChange={(e) => handleInputChange('color', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Stagione"
                value={formData.season}
                onChange={(e) => handleInputChange('season', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Prezzo di Vendita (€)"
                type="number"
                value={formData.price}
                onChange={(e) => handleInputChange('price', e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Prezzo di Costo (€)"
                type="number"
                value={formData.cost}
                onChange={(e) => handleInputChange('cost', e.target.value)}
              />
            </Grid>

            {/* Sezione Gestione Taglie */}
            <Grid item xs={12}>
              <Paper sx={{ p: 2, border: '1px solid #e0e0e0' }}>
                <Typography variant="h6" gutterBottom>
                  Gestione Taglie
                </Typography>
                
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={isSingleSize}
                      onChange={(e) => setIsSingleSize(e.target.checked)}
                    />
                  }
                  label="Prodotto senza taglie multiple"
                />

                {isSingleSize ? (
                  <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>Taglia</InputLabel>
                        <Select
                          value={formData.size}
                          onChange={(e) => handleInputChange('size', e.target.value)}
                          label="Taglia"
                        >
                          {availableSizes.map((size) => (
                            <MenuItem key={size} value={size}>
                              {size}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Quantità"
                        type="number"
                        value={formData.quantity}
                        onChange={(e) => handleInputChange('quantity', e.target.value)}
                        required
                      />
                    </Grid>
                  </Grid>
                ) : (
                  <Grid container spacing={3} sx={{ mt: 1 }}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" gutterBottom>
                        Range di Taglie
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <FormControl fullWidth size="small">
                            <InputLabel>Da</InputLabel>
                            <Select
                              value={sizeRange.start}
                              onChange={handleSizeRangeChange('start')}
                              label="Da"
                            >
                              {availableSizes.filter(size => size !== 'No').map((size, index) => (
                                <MenuItem key={size} value={index}>
                                  {size}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={6}>
                          <FormControl fullWidth size="small">
                            <InputLabel>A</InputLabel>
                            <Select
                              value={sizeRange.end}
                              onChange={handleSizeRangeChange('end')}
                              label="A"
                            >
                              {availableSizes.filter(size => size !== 'No').map((size, index) => (
                                <MenuItem 
                                  key={size} 
                                  value={index}
                                  disabled={index < sizeRange.start}
                                >
                                  {size}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                      </Grid>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" gutterBottom>
                        Quantità per Taglia
                      </Typography>
                      <Grid container spacing={1}>
                        {getSelectedSizes().map((size) => (
                          <Grid item key={size} xs={4}>
                            <TextField
                              fullWidth
                              size="small"
                              label={size}
                              type="number"
                              value={sizeQuantities[size] || ''}
                              onChange={(e) => setSizeQuantities(prev => ({
                                ...prev,
                                [size]: e.target.value
                              }))}
                              inputProps={{ min: 0 }}
                            />
                          </Grid>
                        ))}
                      </Grid>
                    </Grid>
                  </Grid>
                )}
              </Paper>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>
            Annulla
          </Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained"
            disabled={!formData.code || !formData.price || 
              (isSingleSize ? !formData.quantity : getSelectedSizes().length === 0)}
          >
            {editingProduct ? 'Aggiorna' : 'Aggiungi'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Products;