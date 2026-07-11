package com.restaurantpos.captain.ui.tables

import android.app.Application
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.restaurantpos.captain.data.api.ApiClient
import com.restaurantpos.captain.data.api.models.Table
import com.restaurantpos.captain.data.api.models.User
import com.restaurantpos.captain.data.local.TokenStore
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

class TableListViewModel(application: Application, private val onUnauthorized: () -> Unit) : AndroidViewModel(application) {
    private val tokenStore = TokenStore(application)
    private val apiService = ApiClient.getApiService(application, onUnauthorized)

    var tables by mutableStateOf<List<Table>>(emptyList())
    var user by mutableStateOf<User?>(null)
    var isInitialLoading by mutableStateOf(false)
    var isRefreshing by mutableStateOf(false)
    var errorMessage by mutableStateOf<String?>(null)

    private var pollingJob: kotlinx.coroutines.Job? = null

    init {
        loadData(isInitial = true)
        startPolling()
    }

    fun loadData(isInitial: Boolean = false) {
        viewModelScope.launch {
            if (isInitial) isInitialLoading = true else isRefreshing = true
            errorMessage = null
            try {
                val currentToken = tokenStore.token.first()
                if (currentToken == "demo_token") {
                    // Load Mock Data
                    user = User("demo_id", "Demo Waiter", "captain", "demo_res_id", "Bluefox POS")
                    // Show a small set of mock tables for demo
                    tables = listOf(
                        Table("1", "Table 1", false),
                        Table("2", "Table 2", true)
                    )
                } else {
                    // Production Mode: Fetch directly from API
                    if (user == null) {
                        try {
                            user = apiService.getMe()
                        } catch (e: Exception) {
                            // If /me fails, create a placeholder user to avoid crashes
                            user = User(name = "Captain")
                        }
                    }
                    val remoteTables = apiService.getTables()
                    tables = remoteTables // Replace local list with exact API response
                }
            } catch (e: Exception) {
                if (isInitial) {
                    errorMessage = "Failed to load tables: ${e.message}"
                }
            } finally {
                if (isInitial) isInitialLoading = false else isRefreshing = false
            }
        }
    }

    private fun startPolling() {
        pollingJob?.cancel()
        pollingJob = viewModelScope.launch {
            while (true) {
                kotlinx.coroutines.delay(10000)
                refreshSilently()
            }
        }
    }

    private suspend fun refreshSilently() {
        try {
            val currentToken = tokenStore.token.first()
            if (currentToken != "demo_token") {
                val remoteTables = apiService.getTables()
                tables = remoteTables
            }
        } catch (e: Exception) {
            // Silently fail for background polling
        }
    }

    fun refresh() {
        loadData(isInitial = false)
    }

    override fun onCleared() {
        super.onCleared()
        pollingJob?.cancel()
    }

    fun logout(onLogoutSuccess: () -> Unit) {
        viewModelScope.launch {
            tokenStore.clearToken()
            onLogoutSuccess()
        }
    }

    suspend fun getOpenOrderForTable(tableId: String): String? {
        return try {
            val orders = apiService.getOrders("open")
            orders.find { it.tableId == tableId }?.id
        } catch (e: Exception) {
            null
        }
    }
}
