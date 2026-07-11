package com.restaurantpos.captain.ui.order

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.restaurantpos.captain.data.api.models.MenuItem
import com.restaurantpos.captain.ui.components.AppButton
import com.restaurantpos.captain.ui.components.ErrorView
import com.restaurantpos.captain.ui.components.LoadingView
import com.restaurantpos.captain.ui.theme.*
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrderScreen(
    tableId: String,
    orderId: String?,
    tableLabel: String,
    onOrderSent: () -> Unit,
    onBack: () -> Unit,
    viewModel: OrderViewModel = viewModel(factory = OrderViewModelFactory(LocalContext.current.applicationContext as android.app.Application, tableId, orderId))
) {
    val snackbarHostState = remember { SnackbarHostState() }

    Scaffold(
        containerColor = BackgroundWarm,
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            Surface(shadowElevation = 2.dp) {
                TopAppBar(
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = SurfaceWhite,
                        titleContentColor = PrimaryText,
                        navigationIconContentColor = PrimaryTeal,
                        actionIconContentColor = PrimaryTeal
                    ),
                    title = { Text("Table $tableLabel", fontWeight = FontWeight.Bold) },
                    navigationIcon = {
                        IconButton(onClick = onBack) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                        }
                    }
                )
            }
        }
    ) { padding ->
        Column(modifier = Modifier.padding(padding).fillMaxSize()) {
            // Category Tabs
            LazyRow(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 12.dp),
                contentPadding = PaddingValues(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(viewModel.categories) { category ->
                    val isSelected = viewModel.selectedCategoryId == category.id
                    Surface(
                        onClick = { viewModel.selectCategory(category.id) },
                        shape = CircleShape,
                        color = if (isSelected) PrimaryTeal else SurfaceWhite,
                        contentColor = if (isSelected) SurfaceWhite else SecondaryGrey,
                        border = if (isSelected) null else BorderStroke(1.dp, BorderGrey)
                    ) {
                        Text(
                            text = category.name,
                            modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp),
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                        )
                    }
                }
            }

            // Menu Items Grid
            Box(modifier = Modifier.weight(0.5f)) {
                if (viewModel.isLoading) {
                    LoadingView()
                } else if (viewModel.errorMessage != null) {
                    ErrorView(message = viewModel.errorMessage!!, onRetry = { })
                } else {
                    LazyVerticalGrid(
                        columns = GridCells.Fixed(2),
                        contentPadding = PaddingValues(8.dp),
                        modifier = Modifier.fillMaxSize()
                    ) {
                        items(viewModel.items) { item ->
                            MenuItemCard(item = item, onAddClick = { viewModel.addToCart(item) })
                        }
                    }
                }
            }

            // Integrated Cart (Bottom half)
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(0.5f)
                    .shadow(16.dp, RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)),
                color = SurfaceWhite,
                shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)
            ) {
                CartContent(viewModel, onOrderSent)
            }
        }
    }
}

@Composable
fun MenuItemCard(item: MenuItem, onAddClick: () -> Unit) {
    Card(
        modifier = Modifier
            .padding(8.dp)
            .fillMaxWidth()
            .shadow(2.dp, RoundedCornerShape(12.dp)),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = SurfaceWhite
        )
    ) {
        Box(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    text = item.name,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = if (item.isAvailable) PrimaryText else InactiveGrey
                )
                Text(
                    text = "₹${formatPrice(item.price)}",
                    style = MaterialTheme.typography.bodyMedium,
                    color = if (item.isAvailable) PrimaryTeal else InactiveGrey,
                    fontWeight = FontWeight.Medium
                )
                if (!item.isAvailable) {
                    Spacer(modifier = Modifier.height(4.dp))
                    Surface(
                        color = Color(0xFFFFEBEE),
                        shape = RoundedCornerShape(4.dp)
                    ) {
                        Text(
                            text = "Sold out",
                            color = ErrorRed,
                            style = MaterialTheme.typography.labelSmall,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                }
            }
            
            if (item.isAvailable) {
                Surface(
                    onClick = onAddClick,
                    modifier = Modifier
                        .align(Alignment.BottomEnd)
                        .padding(8.dp)
                        .size(32.dp),
                    shape = CircleShape,
                    color = PrimaryTeal,
                    contentColor = Color.White
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(Icons.Default.Add, contentDescription = "Add", modifier = Modifier.size(20.dp))
                    }
                }
            }
        }
    }
}

@Composable
fun CartContent(viewModel: OrderViewModel, onOrderSent: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("Current Order", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = PrimaryText)
            if (viewModel.cart.isNotEmpty()) {
                Text("${viewModel.cart.size} items", style = MaterialTheme.typography.bodySmall, color = SecondaryText)
            }
        }
        
        HorizontalDivider(color = DividerGrey, modifier = Modifier.padding(vertical = 12.dp))

        LazyColumn(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            // Already Sent Items
            viewModel.existingOrder?.let { order ->
                item {
                    Text("Already Sent", style = MaterialTheme.typography.labelMedium, color = SecondaryGrey, fontWeight = FontWeight.Bold)
                }
                items(order.items) { item ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 4.dp),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("${item.quantity}x ${item.name ?: "Item"}", color = SecondaryGrey, style = MaterialTheme.typography.bodyMedium)
                        Text("Sent", color = SecondaryGrey, style = MaterialTheme.typography.labelSmall)
                    }
                }
                item { Spacer(modifier = Modifier.height(8.dp)) }
            }

            // New Items in Cart
            if (viewModel.cart.isNotEmpty()) {
                item {
                    Text("New Items", style = MaterialTheme.typography.labelMedium, color = PrimaryTeal, fontWeight = FontWeight.Bold)
                }
                items(viewModel.cart) { item ->
                    CartItemRow(item, viewModel)
                }
            } else if (viewModel.existingOrder == null) {
                item {
                    Box(modifier = Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                        Text("No items added yet", color = InactiveGrey, style = MaterialTheme.typography.bodyMedium)
                    }
                }
            }
        }

        HorizontalDivider(color = DividerGrey, modifier = Modifier.padding(vertical = 12.dp))
        
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("Total Amount", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = PrimaryText)
            Text("₹${formatPrice(viewModel.getTotal())}", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = PrimaryTeal)
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        
        AppButton(
            text = "Send to Kitchen",
            onClick = { viewModel.sendOrder(onOrderSent) },
            modifier = Modifier.fillMaxWidth(),
            enabled = viewModel.cart.isNotEmpty() && !viewModel.isSending,
            isLoading = viewModel.isSending
        )
    }
}

@Composable
fun CartItemRow(item: CartItemUI, viewModel: OrderViewModel) {
    Surface(
        color = Color.Transparent,
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.fillMaxWidth()) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(item.name, color = PrimaryText, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
                    Text("₹${formatPrice(item.price)}", style = MaterialTheme.typography.bodySmall, color = SecondaryText)
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    OutlinedIconButton(
                        onClick = { viewModel.updateQuantity(item.menuItemId, -1) },
                        modifier = Modifier.size(28.dp),
                        border = BorderStroke(1.dp, PrimaryTeal),
                        shape = RoundedCornerShape(8.dp),
                        colors = IconButtonDefaults.outlinedIconButtonColors(contentColor = PrimaryTeal)
                    ) {
                        Icon(Icons.Default.Remove, contentDescription = "Minus", modifier = Modifier.size(14.dp))
                    }
                    Text("${item.quantity}", modifier = Modifier.padding(horizontal = 12.dp), fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodyMedium)
                    OutlinedIconButton(
                        onClick = { viewModel.updateQuantity(item.menuItemId, 1) },
                        modifier = Modifier.size(28.dp),
                        border = BorderStroke(1.dp, PrimaryTeal),
                        shape = RoundedCornerShape(8.dp),
                        colors = IconButtonDefaults.outlinedIconButtonColors(contentColor = PrimaryTeal)
                    ) {
                        Icon(Icons.Default.Add, contentDescription = "Plus", modifier = Modifier.size(14.dp))
                    }
                }
            }
            
            TextField(
                value = item.notes ?: "",
                onValueChange = { viewModel.updateNotes(item.menuItemId, it) },
                placeholder = { Text("Add notes (e.g. no onion)", style = MaterialTheme.typography.bodySmall) },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 4.dp)
                    .height(48.dp),
                textStyle = MaterialTheme.typography.bodySmall,
                colors = TextFieldDefaults.colors(
                    focusedContainerColor = BackgroundWarm,
                    unfocusedContainerColor = BackgroundWarm,
                    focusedIndicatorColor = PrimaryTeal,
                    unfocusedIndicatorColor = Color.Transparent
                ),
                shape = RoundedCornerShape(8.dp),
                singleLine = true
            )
            Spacer(modifier = Modifier.height(4.dp))
            HorizontalDivider(color = DividerGrey.copy(alpha = 0.5f))
        }
    }
}

fun formatPrice(price: Double): String {
    return if (price == price.toLong().toDouble()) {
        price.toLong().toString()
    } else {
        String.format(Locale.getDefault(), "%.2f", price)
    }
}

class OrderViewModelFactory(
    private val application: android.app.Application,
    private val tableId: String,
    private val orderId: String?
) : androidx.lifecycle.ViewModelProvider.Factory {
    override fun <T : androidx.lifecycle.ViewModel> create(modelClass: Class<T>): T {
        return OrderViewModel(application, tableId, orderId) as T
    }
}
