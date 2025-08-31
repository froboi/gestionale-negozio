import React, { useEffect, useState } from 'react';
import axios from 'axios';

const ApiTest: React.FC = () => {
  const [result, setResult] = useState<string>('Testing...');

  useEffect(() => {
    const testApi = async () => {
      try {
        console.log('Testing API configuration...');
        console.log('Axios baseURL:', axios.defaults.baseURL);
        
        // Test login
        const loginResponse = await axios.post('/api/auth/login', {
          username: 'admin',
          password: 'admin123'
        });
        
        console.log('Login successful:', loginResponse.data);
        const token = loginResponse.data.token;
        
        // Test products API
        const productsResponse = await axios.get('/api/products', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('Products API successful:', productsResponse.data);
        setResult(`Success! Found ${productsResponse.data.products?.length || 0} products`);
        
      } catch (error: any) {
        console.error('API Test Error:', error);
        setResult(`Error: ${error.message}`);
      }
    };

    testApi();
  }, []);

  return (
    <div style={{ padding: '20px', backgroundColor: '#f0f0f0', margin: '10px' }}>
      <h3>API Test Component</h3>
      <p>Base URL: {axios.defaults.baseURL}</p>
      <p>Result: {result}</p>
    </div>
  );
};

export default ApiTest;
