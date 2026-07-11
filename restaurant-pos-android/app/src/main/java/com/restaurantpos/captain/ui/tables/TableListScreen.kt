package com.restaurantpos.captain.ui.tables

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.Refresh
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
        containerColor = BackgroundWarm,
        topBar = {
            Surface(shadowElevation = 4.dp) {
                TopAppBar(
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = SurfaceWhite,
                        titleContentColor = PrimaryText,
                        actionIconContentColor = PrimaryTeal
                    ),
                    title = {
                        Column {
                            Text(viewModel.user?.restaurantName ?: "Loading...", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                            Text(viewModel.user?.name ?: "", style = MaterialTheme.typography.bodySmall, color = SecondaryText)
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
    Card(
        modifier = Modifier
            .padding(8.dp)
            .fillMaxWidth()
            .height(110.dp)
            .shadow(2.dp, RoundedCornerShape(12.dp))
            .clickable { onClick() },
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (table.isOccupied) TableOccupied else TableAvailable
        )
    ) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text = table.label,
                    style = MaterialTheme.typography.headlineMedium,
                    color = Color.White,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = if (table.isOccupied) "Occupied" else "Available",
                    style = MaterialTheme.typography.bodySmall,
                    color = Color.White.copy(alpha = 0.9f)
                )
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
