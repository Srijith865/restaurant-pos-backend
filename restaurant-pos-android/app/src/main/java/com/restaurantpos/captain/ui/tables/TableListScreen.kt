package com.restaurantpos.captain.ui.tables

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.background
import androidx.compose.foundation.BorderStroke
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Timer
import java.time.Instant
import java.time.Duration
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.restaurantpos.captain.data.api.models.Table
import com.restaurantpos.captain.ui.components.ErrorView
import com.restaurantpos.captain.ui.components.LoadingView
import com.restaurantpos.captain.ui.theme.*
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TableListScreen(
    onTableClick: (String, String?, String) -> Unit,
    onLogout: () -> Unit,
    viewModel: TableListViewModel = viewModel(factory = TableListViewModelFactory(LocalContext.current.applicationContext as android.app.Application, onLogout))
) {
    val scope = rememberCoroutineScope()

    Scaffold(
        containerColor = BackgroundSlate,
        topBar = {
            Surface(shadowElevation = 0.dp, color = SurfaceWhite) {
                Column {
                    TopAppBar(
                        colors = TopAppBarDefaults.topAppBarColors(
                            containerColor = SurfaceWhite,
                            titleContentColor = TextDeepSlate,
                            actionIconContentColor = TextSlate
                        ),
                        title = {
                            Column {
                                Text(viewModel.user?.restaurantName ?: "Loading...", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                                Text(viewModel.user?.name ?: "", style = MaterialTheme.typography.labelMedium, color = TextSlate)
                            }
                        },
                        actions = {
                            IconButton(onClick = { viewModel.refresh() }) {
                                Icon(Icons.Default.Refresh, contentDescription = "Refresh")
                            }
                            IconButton(onClick = { viewModel.logout(onLogout) }) {
                                Icon(Icons.AutoMirrored.Filled.Logout, contentDescription = "Logout")
                            }
                        }
                    )
                    HorizontalDivider(color = DividerGrey)
                }
            }
        }
    ) { padding ->
        Box(modifier = Modifier.padding(padding)) {
            if (viewModel.isInitialLoading) {
                LoadingView()
            } else if (viewModel.errorMessage != null) {
                ErrorView(message = viewModel.errorMessage!!, onRetry = { viewModel.loadData(isInitial = true) })
            } else {
                LazyVerticalGrid(
                    columns = GridCells.Fixed(2),
                    contentPadding = PaddingValues(12.dp),
                    modifier = Modifier.fillMaxSize()
                ) {
                    items(viewModel.tables) { table ->
                        TableCard(
                            table = table,
                            onClick = {
                                scope.launch {
                                    val orderId = if (table.isOccupied) {
                                        viewModel.getOpenOrderForTable(table.id)
                                    } else null
                                    onTableClick(table.id, orderId, table.label)
                                }
                            }
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun TableCard(table: Table, onClick: () -> Unit) {
    val elapsedMinutes = remember(table.orderStartTime) {
        try {
            if (table.orderStartTime != null) {
                val start = Instant.parse(table.orderStartTime)
                Duration.between(start, Instant.now()).toMinutes()
            } else null
        } catch (e: Exception) {
            null
        }
    }

    Card(
        modifier = Modifier
            .padding(8.dp)
            .fillMaxWidth()
            .height(130.dp) // increased height slightly to fit new info
            .clickable { onClick() },
        shape = RoundedCornerShape(8.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (table.isOccupied) StatusOccupiedLight else SurfaceWhite,
            contentColor = TextDeepSlate
        ),
        border = BorderStroke(1.dp, if (table.isOccupied) StatusOccupied else BorderSoft)
    ) {
        Box(modifier = Modifier.fillMaxSize()) {
            Column(modifier = Modifier.align(Alignment.Center).padding(8.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text = table.label,
                    style = MaterialTheme.typography.headlineMedium,
                    color = if (table.isOccupied) StatusOccupied else PrimaryGreen,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = if (table.isOccupied) "Occupied" else "Available",
                    style = MaterialTheme.typography.labelMedium,
                    color = TextSlate
                )
                
                if (table.isOccupied && table.currentAmount != null) {
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "Total: ₹%.2f".format(table.currentAmount),
                        style = MaterialTheme.typography.bodySmall,
                        fontWeight = FontWeight.Bold,
                        color = TextDeepSlate
                    )
                }
            }
            
            // Status Indicator (Top Right)
            Row(modifier = Modifier.align(Alignment.TopEnd).padding(8.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(modifier = Modifier.size(6.dp).background(if (table.isOccupied) StatusOccupied else StatusAvailable, CircleShape))
                Spacer(modifier = Modifier.width(4.dp))
                Text(if (table.isOccupied) "BUSY" else "OPEN", style = MaterialTheme.typography.labelMedium.copy(fontSize = 10.sp), color = TextSlate)
            }
            
            // Timer Indicator (Top Left)
            if (table.isOccupied && elapsedMinutes != null) {
                Row(modifier = Modifier.align(Alignment.TopStart).padding(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Timer, contentDescription = "Timer", tint = StatusOccupied, modifier = Modifier.size(14.dp))
                    Spacer(modifier = Modifier.width(2.dp))
                    Text("${elapsedMinutes}m", style = MaterialTheme.typography.labelMedium.copy(fontSize = 12.sp), color = StatusOccupied, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

class TableListViewModelFactory(
    private val application: android.app.Application,
    private val onUnauthorized: () -> Unit
) : androidx.lifecycle.ViewModelProvider.Factory {
    override fun <T : androidx.lifecycle.ViewModel> create(modelClass: Class<T>): T {
        return TableListViewModel(application, onUnauthorized) as T
    }
}
