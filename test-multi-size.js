/**
 * Script di test per la nuova API multi-size dei prodotti
 * Questo script testa le nuove funzionalità:
 * 1. Creazione di prodotti con taglie multiple
 * 2. Validazione delle taglie supportate
 * 3. Generazione automatica dei codici prodotto
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api';

async function testMultiSizeProduct() {
    console.log('🧪 Test API Multi-Size Prodotti\n');

    try {
        // Test 1: Creare un prodotto multi-taglia
        console.log('📦 Test 1: Creazione prodotto multi-taglia');
        const multiSizeData = {
            products: [
                {
                    code: 'MAGLIA-001',
                    description: 'Maglia Casual Estiva',
                    category: 'T-Shirt',
                    color: 'Blu',
                    size: 'S/42',
                    quantity: 5,
                    price: 25.99,
                    cost: 12.50
                },
                {
                    code: 'MAGLIA-001',
                    description: 'Maglia Casual Estiva',
                    category: 'T-Shirt',
                    color: 'Blu',
                    size: 'M/44',
                    quantity: 8,
                    price: 25.99,
                    cost: 12.50
                },
                {
                    code: 'MAGLIA-001',
                    description: 'Maglia Casual Estiva',
                    category: 'T-Shirt',
                    color: 'Blu',
                    size: 'L/46',
                    quantity: 6,
                    price: 25.99,
                    cost: 12.50
                }
            ]
        };

        const multiSizeResponse = await axios.post(`${API_BASE_URL}/products/multi-size`, multiSizeData);
        console.log('✅ Prodotti multi-taglia creati:', multiSizeResponse.data.message);
        console.log(`   Prodotti creati: ${multiSizeResponse.data.created}`);

        // Test 2: Creare un prodotto singolo con taglia
        console.log('\n📦 Test 2: Creazione prodotto singolo');
        const singleProductData = {
            code: 'ACCESSORIO-001',
            description: 'Sciarpa di Lana',
            category: 'Accessori',
            color: 'Grigio',
            size: 'No',
            quantity: 3,
            price: 15.50,
            cost: 8.00
        };

        const singleResponse = await axios.post(`${API_BASE_URL}/products`, singleProductData);
        console.log('✅ Prodotto singolo creato:', singleResponse.data.message);

        // Test 3: Tentativo con taglia non valida (dovrebbe fallire)
        console.log('\n📦 Test 3: Test validazione taglia non valida');
        const invalidSizeData = {
            code: 'TEST-INVALID',
            description: 'Test Taglia Non Valida',
            size: 'XXXL', // Taglia non supportata
            quantity: 1,
            price: 10.00
        };

        try {
            await axios.post(`${API_BASE_URL}/products`, invalidSizeData);
            console.log('❌ ERRORE: Dovrebbe aver rifiutato la taglia non valida');
        } catch (error) {
            console.log('✅ Validazione corretta:', error.response?.data?.message || error.message);
        }

        // Test 4: Ottenere tutti i prodotti
        console.log('\n📦 Test 4: Recupero di tutti i prodotti');
        const allProductsResponse = await axios.get(`${API_BASE_URL}/products`);
        console.log(`✅ Prodotti trovati: ${allProductsResponse.data.length}`);
        
        // Mostra i primi 5 prodotti come esempio
        const firstFive = allProductsResponse.data.slice(0, 5);
        firstFive.forEach((product, index) => {
            console.log(`${index + 1}. ${product.code} - ${product.description} (${product.size}) - €${product.price} - Qty: ${product.quantity}`);
        });

        console.log('\n🎉 Tutti i test completati con successo!');

    } catch (error) {
        console.error('❌ Errore durante i test:', error.response?.data || error.message);
    }
}

// Funzione di utilità per aspettare che il server sia pronto
async function waitForServer(maxAttempts = 30) {
    console.log('⏳ Aspettando che il server sia pronto...');
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            await axios.get(`${API_BASE_URL}/products`);
            console.log('✅ Server pronto!\n');
            return true;
        } catch (error) {
            if (attempt === maxAttempts) {
                console.log(`❌ Server non raggiungibile dopo ${maxAttempts} tentativi`);
                return false;
            }
            console.log(`Tentativo ${attempt}/${maxAttempts}...`);
            await new Promise(resolve => setTimeout(resolve, 2000)); // Aspetta 2 secondi
        }
    }
}

// Esegui i test
async function runTests() {
    const serverReady = await waitForServer();
    if (serverReady) {
        await testMultiSizeProduct();
    }
}

if (require.main === module) {
    runTests();
}

module.exports = { testMultiSizeProduct, waitForServer };