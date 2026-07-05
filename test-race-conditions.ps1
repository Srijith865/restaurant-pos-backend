# ─────────────────────────────────────────────────────────────────────
# Race-condition concurrency test for the restaurant POS order engine.
#
# TEST 1: 5 concurrent POST /orders for the SAME table
#         → expect exactly 1 open order with all items
#
# TEST 2: 5 concurrent POST /orders/:id/items on that single order
#         → expect order.total = exact sum of every item's priceEach*qty
#
# Prerequisites:
#   - Server running on localhost:4000 (npm run dev)
#   - At least one Staff account exists (phone 9876543210, password secret123)
#   - The partial unique index migration has been applied
# ─────────────────────────────────────────────────────────────────────

$ErrorActionPreference = "Continue"
$base = "http://localhost:4000"

# ── Setup: login + create a fresh table + ensure 10 menu items ───────
Write-Host "`n=== Setup: Login ===" -ForegroundColor Cyan
$login = Invoke-RestMethod -Uri "$base/auth/login" -Method POST `
  -ContentType "application/json" `
  -Body '{"phone":"9876543210","password":"secret123"}'
$token = $login.token
$h = @{ Authorization = "Bearer $token" }
Write-Host "Logged in. RestaurantId: $($login.restaurantId)"

Write-Host "`n=== Setup: Create fresh table ===" -ForegroundColor Cyan
$table = Invoke-RestMethod -Uri "$base/tables" -Method POST `
  -ContentType "application/json" -Headers $h `
  -Body '{"label":"RaceTest"}'
Write-Host "Table: $($table.id) ($($table.label))"

Write-Host "`n=== Setup: Create category + 10 menu items ===" -ForegroundColor Cyan
$cat = Invoke-RestMethod -Uri "$base/categories" -Method POST `
  -ContentType "application/json" -Headers $h `
  -Body '{"name":"RaceTestCat","sortOrder":99}'

$itemIds = @()
for ($i = 1; $i -le 10; $i++) {
    $price = $i * 100  # 100, 200, ..., 1000
    $body = @{ categoryId = $cat.id; name = "RaceItem$i"; price = $price } | ConvertTo-Json
    $item = Invoke-RestMethod -Uri "$base/items" -Method POST `
      -ContentType "application/json" -Headers $h -Body $body
    $itemIds += $item.id
    Write-Host "  Item $i : $($item.id) - $($item.name) @ $($item.price)"
}

# ═════════════════════════════════════════════════════════════════════
# TEST 1: Duplicate order race — 5 concurrent POST /orders
# ═════════════════════════════════════════════════════════════════════
Write-Host "`n========================================" -ForegroundColor Yellow
Write-Host "TEST 1: 5 concurrent POST /orders for table $($table.label)" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow

$jobs = @()
for ($i = 0; $i -lt 5; $i++) {
    $menuItemId = $itemIds[$i]  # each request adds a different item
    $body = @{
        tableId = $table.id
        items   = @( @{ menuItemId = $menuItemId; quantity = 1 } )
    } | ConvertTo-Json -Depth 3

    $jobs += Start-Job -ScriptBlock {
        param($uri, $headers, $body)
        try {
            $r = Invoke-RestMethod -Uri $uri -Method POST `
              -ContentType "application/json" `
              -Headers $headers -Body $body
            return @{ success = $true; orderId = $r.id; status = $r.status; itemCount = $r.items.Count }
        } catch {
            return @{ success = $false; error = $_.Exception.Message }
        }
    } -ArgumentList "$base/orders", $h, $body
}

Write-Host "Waiting for 5 concurrent jobs to complete..."
$results = $jobs | Wait-Job | Receive-Job
$jobs | Remove-Job -Force

Write-Host "`nIndividual job results:" -ForegroundColor Gray
$results | ForEach-Object { $_ | ConvertTo-Json -Compress }

# Now verify: how many open orders exist for this table?
$allOrders = Invoke-RestMethod -Uri "$base/orders?status=open" -Headers $h
$tableOrders = @($allOrders | Where-Object { $_.tableId -eq $table.id })

$test1OrderCount = $tableOrders.Count
$test1TotalItems = 0
if ($test1OrderCount -gt 0) {
    $test1TotalItems = $tableOrders[0].items.Count
}

Write-Host "`n--- TEST 1 RESULT ---" -ForegroundColor Yellow
Write-Host "Open orders for table '$($table.label)': $test1OrderCount (expected: 1)"
Write-Host "Total items in that order: $test1TotalItems (expected: 5)"

if ($test1OrderCount -eq 1 -and $test1TotalItems -eq 5) {
    Write-Host "TEST 1: PASSED" -ForegroundColor Green
} else {
    Write-Host "TEST 1: FAILED" -ForegroundColor Red
}

$orderId = $tableOrders[0].id
Write-Host "Order ID for test 2: $orderId"

# ═════════════════════════════════════════════════════════════════════
# TEST 2: Lost total race — 5 concurrent POST /orders/:id/items
# ═════════════════════════════════════════════════════════════════════
Write-Host "`n========================================" -ForegroundColor Yellow
Write-Host "TEST 2: 5 concurrent add-items to order $orderId" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow

$jobs2 = @()
for ($i = 5; $i -lt 10; $i++) {
    $menuItemId = $itemIds[$i]
    $qty = $i - 3  # quantities: 2, 3, 4, 5, 6
    $body = @{
        items = @( @{ menuItemId = $menuItemId; quantity = $qty } )
    } | ConvertTo-Json -Depth 3

    $jobs2 += Start-Job -ScriptBlock {
        param($uri, $headers, $body)
        try {
            $r = Invoke-RestMethod -Uri $uri -Method POST `
              -ContentType "application/json" `
              -Headers $headers -Body $body
            return @{ success = $true; total = $r.total; itemCount = $r.items.Count }
        } catch {
            return @{ success = $false; error = $_.Exception.Message }
        }
    } -ArgumentList "$base/orders/$orderId/items", $h, $body
}

Write-Host "Waiting for 5 concurrent add-items jobs..."
$results2 = $jobs2 | Wait-Job | Receive-Job
$jobs2 | Remove-Job -Force

Write-Host "`nIndividual job results:" -ForegroundColor Gray
$results2 | ForEach-Object { $_ | ConvertTo-Json -Compress }

# Fetch the final order state
$finalOrder = Invoke-RestMethod -Uri "$base/orders/$orderId" -Headers $h

# Compute expected total from all items
$expectedTotal = 0
foreach ($item in $finalOrder.items) {
    $expectedTotal += [double]$item.priceEach * [int]$item.quantity
}
$actualTotal = [double]$finalOrder.total

Write-Host "`n--- TEST 2 RESULT ---" -ForegroundColor Yellow
Write-Host "Total items in order: $($finalOrder.items.Count) (expected: 10 = 5 from test1 + 5 from test2)"
Write-Host "Actual order.total:   $actualTotal"
Write-Host "Expected total (SUM): $expectedTotal"

Write-Host "`nItem breakdown:" -ForegroundColor Gray
foreach ($item in $finalOrder.items) {
    $subtotal = [double]$item.priceEach * [int]$item.quantity
    Write-Host "  $($item.menuItem.name): $($item.quantity) x $($item.priceEach) = $subtotal"
}

if ($actualTotal -eq $expectedTotal -and $finalOrder.items.Count -eq 10) {
    Write-Host "`nTEST 2: PASSED" -ForegroundColor Green
} else {
    Write-Host "`nTEST 2: FAILED (total mismatch or wrong item count)" -ForegroundColor Red
}

# ── Summary ──────────────────────────────────────────────────────────
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test 1 (duplicate order race):  $(if ($test1OrderCount -eq 1 -and $test1TotalItems -eq 5) { 'PASSED' } else { 'FAILED' })"
Write-Host "Test 2 (lost total race):       $(if ($actualTotal -eq $expectedTotal -and $finalOrder.items.Count -eq 10) { 'PASSED' } else { 'FAILED' })"
Write-Host "========================================`n"
