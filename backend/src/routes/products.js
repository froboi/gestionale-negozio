const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { authenticate, requireAuth, requireAdminOrTech } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const productService = require('../services/productService');

const router = express.Router();

// Validation rules
const productValidation = [
    body('code')
        .notEmpty()
        .isLength({ max: 50 })
        .withMessage('Codice prodotto richiesto (max 50 caratteri)'),
    body('name')
        .notEmpty()
        .isLength({ max: 200 })
        .withMessage('Nome prodotto richiesto (max 200 caratteri)'),
    body('size')
        .notEmpty()
        .isLength({ max: 20 })
        .withMessage('Taglia richiesta (max 20 caratteri)'),
    body('color')
        .notEmpty()
        .isLength({ max: 50 })
        .withMessage('Colore richiesto (max 50 caratteri)'),
    body('price')
        .isFloat({ min: 0 })
        .withMessage('Prezzo deve essere un numero positivo'),
    body('quantity')
        .isInt({ min: 0 })
        .withMessage('Quantità deve essere un numero intero positivo')
];

// Get all products with filtering and pagination
router.get('/', authenticate, requireAuth, asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 20,
        search,
        category,
        brand,
        size,
        color,
        minPrice,
        maxPrice,
        lowStock,
        sortBy = 'name',
        sortOrder = 'asc'
    } = req.query;

    const filters = {
        search,
        category,
        brand,
        size,
        color,
        minPrice: minPrice ? parseFloat(minPrice) : null,
        maxPrice: maxPrice ? parseFloat(maxPrice) : null,
        lowStock: lowStock === 'true'
    };

    const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sortBy,
        sortOrder
    };

    const result = await productService.getProducts(filters, options);

    res.status(200).json({
        success: true,
        data: result
    });
}));

// Get single product
router.get('/:id', authenticate, requireAuth, asyncHandler(async (req, res) => {
    const product = await productService.getProductById(req.params.id);

    if (!product) {
        return res.status(404).json({
            success: false,
            error: 'Prodotto non trovato'
        });
    }

    res.status(200).json({
        success: true,
        data: product
    });
}));

// Create new product
router.post('/', authenticate, requireAdminOrTech, productValidation, asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            error: 'Dati non validi',
            details: errors.array()
        });
    }

    const productData = {
        ...req.body,
        created_by: req.user.id
    };

    const product = await productService.createProduct(productData);

    res.status(201).json({
        success: true,
        data: product,
        message: 'Prodotto creato con successo'
    });
}));

// Update product
router.put('/:id', authenticate, requireAdminOrTech, productValidation, asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            error: 'Dati non validi',
            details: errors.array()
        });
    }

    const productData = {
        ...req.body,
        updated_by: req.user.id
    };

    const product = await productService.updateProduct(req.params.id, productData);

    if (!product) {
        return res.status(404).json({
            success: false,
            error: 'Prodotto non trovato'
        });
    }

    res.status(200).json({
        success: true,
        data: product,
        message: 'Prodotto aggiornato con successo'
    });
}));

// Delete product
router.delete('/:id', authenticate, requireAdminOrTech, asyncHandler(async (req, res) => {
    const deleted = await productService.deleteProduct(req.params.id);

    if (!deleted) {
        return res.status(404).json({
            success: false,
            error: 'Prodotto non trovato'
        });
    }

    res.status(200).json({
        success: true,
        message: 'Prodotto eliminato con successo'
    });
}));

// Get product by barcode
router.get('/barcode/:barcode', authenticate, requireAuth, asyncHandler(async (req, res) => {
    const product = await productService.getProductByBarcode(req.params.barcode);

    if (!product) {
        return res.status(404).json({
            success: false,
            error: 'Prodotto non trovato'
        });
    }

    res.status(200).json({
        success: true,
        data: product
    });
}));

// Update product quantity
router.patch('/:id/quantity', authenticate, requireAdminOrTech, asyncHandler(async (req, res) => {
    const { quantity, operation = 'set', notes } = req.body;

    if (typeof quantity !== 'number' || quantity < 0) {
        return res.status(400).json({
            success: false,
            error: 'Quantità deve essere un numero positivo'
        });
    }

    const result = await productService.updateQuantity(
        req.params.id,
        quantity,
        operation,
        req.user.id,
        notes
    );

    if (!result) {
        return res.status(404).json({
            success: false,
            error: 'Prodotto non trovato'
        });
    }

    res.status(200).json({
        success: true,
        data: result,
        message: 'Quantità aggiornata con successo'
    });
}));

// Get low stock products
router.get('/reports/low-stock', authenticate, requireAuth, asyncHandler(async (req, res) => {
    const { threshold } = req.query;
    const products = await productService.getLowStockProducts(threshold ? parseInt(threshold) : null);

    res.status(200).json({
        success: true,
        data: products
    });
}));

// Get product categories
router.get('/meta/categories', authenticate, requireAuth, asyncHandler(async (req, res) => {
    const categories = await productService.getCategories();

    res.status(200).json({
        success: true,
        data: categories
    });
}));

// Get product brands
router.get('/meta/brands', authenticate, requireAuth, asyncHandler(async (req, res) => {
    const brands = await productService.getBrands();

    res.status(200).json({
        success: true,
        data: brands
    });
}));

module.exports = router;