package com.restaurantpos.captain.ui.login

import android.app.Application
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.restaurantpos.captain.data.api.ApiClient
import com.restaurantpos.captain.data.api.models.LoginRequest
import com.restaurantpos.captain.data.api.models.Waiter
import com.restaurantpos.captain.data.local.TokenStore
import kotlinx.coroutines.launch

class LoginViewModel(application: Application) : AndroidViewModel(application) {
    private val tokenStore = TokenStore(application)
    private val apiService = ApiClient.getApiService(application) {}

    var waiters by mutableStateOf<List<Waiter>>(emptyList())
    var selectedWaiter by mutableStateOf<Waiter?>(null)
    
    var isLoadingWaiters by mutableStateOf(false)
    var isLoggingIn by mutableStateOf(false)
    var errorMessage by mutableStateOf<String?>(null)

    init {
        loadWaiters()
    }

    fun loadWaiters() {
        viewModelScope.launch {
            isLoadingWaiters = true
            errorMessage = null
            try {
                waiters = apiService.getWaiters()
            } catch (e: Exception) {
                errorMessage = "Failed to load waiters. Check connection."
            } finally {
                isLoadingWaiters = false
            }
        }
    }

    fun login(onSuccess: () -> Unit) {
        val waiter = selectedWaiter
        if (waiter == null) {
            errorMessage = "Please select your name"
            return
        }

        viewModelScope.launch {
            isLoggingIn = true
            errorMessage = null
            try {
                val response = apiService.login(LoginRequest(waiterId = waiter.id))
                val token = response.token
                if (token != null) {
                    tokenStore.saveToken(token)
                    onSuccess()
                } else {
                    errorMessage = "Server error: No token received"
                }
            } catch (e: retrofit2.HttpException) {
                errorMessage = "Login failed: ${e.code()}"
            } catch (e: java.net.ConnectException) {
                errorMessage = "Cannot connect to server."
            } catch (e: Exception) {
                errorMessage = "Error: ${e.message}"
            } finally {
                isLoggingIn = false
            }
        }
    }
}
