# Test script per verificare l'endpoint delle vendite
try {
    Write-Host "Testing sales endpoint..." -ForegroundColor Yellow
    
    # Aspetta che il server sia pronto
    Start-Sleep -Seconds 5
    
    # Test dell'endpoint
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/sales?page=1&limit=10" -Method Get -ErrorAction Stop
    
    Write-Host "SUCCESS: Sales endpoint is working!" -ForegroundColor Green
    Write-Host "Response received with $($response.sales.Count) sales" -ForegroundColor Green
    
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    
    # Controlla i log del backend
    Write-Host "Checking backend logs..." -ForegroundColor Yellow
    docker-compose -f .\docker\docker-compose.yml logs backend --tail 5
}
