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
  Fab,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  QrCode as QrCodeIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import axios from 'axios';

interface Product {
  id: number;
  code: string;
  description?: string;
  brand?: string;
  category?: string;
  size?: string;
  color?: string;
  price: number;
  cost?: number;
  quantity: number;
  min_quantity?: number;
  supplier?: string;
  season?: string;
  created_at: string;
}

const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    size: '',
    color: '',
    price: '',
    cost: '',
    quantity: '',
    supplier: '',
    season: ''
  });

  // Carica prodotti al mount del componente
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/products', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProducts(response.data.products || []);
      setError(null);
    } catch (error: any) {
      setError('Errore nel caricamento dei prodotti');
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        code: product.code,
        description: product.description || '',
        size: product.size || '',
        color: product.color || '',
        price: product.price?.toString() || '',
        cost: product.cost?.toString() || '',
        quantity: product.quantity?.toString() || '',
        supplier: product.supplier || '',
        season: product.season || ''
      });
    } else {
      setEditingProduct(null);
      setFormData({
        code: '',
        description: '',
        size: '',
        color: '',
        price: '',
        cost: '',
        quantity: '',
        supplier: '',
        season: ''
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingProduct(null);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem('token');
      const productData = {
        ...formData,
        price: parseFloat(formData.price),
        cost: formData.cost ? parseFloat(formData.cost) : undefined,
        quantity: parseInt(formData.quantity)
      };

      if (editingProduct) {
        await axios.put(`/api/products/${editingProduct.id}`, productData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post('/api/products', productData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      handleCloseDialog();
      fetchProducts();
      setError(null);
    } catch (error: any) {
      setError('Errore nel salvare il prodotto');
      console.error('Error saving product:', error);
    }
  };

  const handleDelete = async (productId: number) => {
    if (window.confirm('Sei sicuro di voler eliminare questo prodotto?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`/api/products/${productId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchProducts();
        setError(null);
      } catch (error: any) {
        setError('Errore nell\'eliminazione del prodotto');
        console.error('Error deleting product:', error);
      }
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
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
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          color="primary"
        >
          Aggiungi Prodotto
        </Button>
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
                    {product.brand && (
                      <Typography variant="caption" color="textSecondary">
                        {product.brand}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {product.category && (
                      <Chip label={product.category} size="small" variant="outlined" />
                    )}
                  </TableCell>
                  <TableCell>{product.size || '-'}</TableCell>
                  <TableCell>{product.color || '-'}</TableCell>
                  <TableCell>€{parseFloat(String(product.price || '0')).toFixed(2)}</TableCell>
                  <TableCell>
                    <Chip
                      label={product.quantity}
                      color={product.quantity <= (product.min_quantity || 0) ? 'error' : 'success'}
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
        maxWidth="md"
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
                label="Codice Prodotto"
                value={formData.code}
                onChange={(e) => handleInputChange('code', e.target.value)}
                required
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
            <Grid item xs={12} sm={6}>
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
                label="Taglia"
                value={formData.size}
                onChange={(e) => handleInputChange('size', e.target.value)}
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
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Quantità in Stock"
                type="number"
                value={formData.quantity}
                onChange={(e) => handleInputChange('quantity', e.target.value)}
                required
              />
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
            disabled={!formData.code || !formData.price || !formData.quantity}
          >
            {editingProduct ? 'Aggiorna' : 'Aggiungi'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Products;
