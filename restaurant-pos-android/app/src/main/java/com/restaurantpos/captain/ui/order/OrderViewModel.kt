package com.restaurantpos.captain.ui.order

import android.app.Application
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.restaurantpos.captain.data.api.ApiClient
import com.restaurantpos.captain.data.api.models.*
import com.restaurantpos.captain.data.local.TokenStore
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

class OrderViewModel(
    application: Application,
    private val tableId: String,
    private val orderId: String?
) : AndroidViewModel(application) {
    private val tokenStore = TokenStore(application)
    private val apiService = ApiClient.getApiService(application) {}

    var categories by mutableStateOf<List<Category>>(emptyList())
    var items by mutableStateOf<List<MenuItem>>(emptyList())
    private var allItems: List<MenuItem> = emptyList()
    var selectedCategoryId by mutableStateOf<String?>(null)
    
    var existingOrder by mutableStateOf<Order?>(null)
    val cart = mutableStateListOf<CartItemUI>()
    
    var isLoading by mutableStateOf(false)
    var isSending by mutableStateOf(false)
    var errorMessage by mutableStateOf<String?>(null)

    init {
        loadData()
    }

    private fun loadData() {
        viewModelScope.launch {
            isLoading = true
            errorMessage = null
            try {
                val currentToken = tokenStore.token.first()
                if (currentToken == "demo_token") {
                    // Mock Menu Data
                    categories = listOf(
                        Category("cat1", "Starters", 1),
                        Category("cat2", "Main Course", 2),
                        Category("cat3", "Desserts", 3),
                        Category("cat4", "Drinks", 4)
                    )
                    selectCategory(categories[0].id)
                    
                    if (orderId != null) {
                        existingOrder = Order(orderId, tableId, "open", listOf(
                            OrderItem("m1", "Paneer Tikka", 2, 220.0, "Extra spicy")
                        ), 440.0)
                    }
                } else {
                    val categoriesDeferred = async { apiService.getCategories() }
                    val itemsDeferred = async { apiService.getItems("all", tableId) }
                    val orderDeferred = if (orderId != null) async { apiService.getOrderById(orderId) } else null

                    categories = categoriesDeferred.await()
                    allItems = itemsDeferred.await()
                    
                    if (orderDeferred != null) {
                        existingOrder = orderDeferred.await()
                    }

                    if (categories.isNotEmpty()) {
                        selectCategory(categories[0].id)
                    }
                }
            } catch (e: Exception) {
                errorMessage = "Failed to load menu: ${e.message}"
            } finally {
                isLoading = false
            }
        }
    }

    fun selectCategory(categoryId: String) {
        selectedCategoryId = categoryId
        viewModelScope.launch {
            try {
                val currentToken = tokenStore.token.first()
                if (currentToken == "demo_token") {
                    items = when(categoryId) {
                        "cat1" -> listOf(
                            MenuItem("m1", "Paneer Tikka", 220.0, true, "cat1", "Starters"),
                            MenuItem("m2", "Veg Spring Roll", 120.0, true, "cat1", "Starters"),
                            MenuItem("m3", "Chicken Wings", 250.0, false, "cat1", "Starters")
                        )
                        "cat2" -> listOf(
                            MenuItem("m4", "Butter Chicken", 350.0, true, "cat2", "Main Course"),
                            MenuItem("m5", "Dal Makhani", 280.0, true, "cat2", "Main Course")
                        )
                        else -> emptyList()
                    }
                } else {
                    items = allItems.filter { it.categoryId == categoryId }
                }
            } catch (e: Exception) {
                // Handle error
            }
        }
    }

    fun addToCart(item: MenuItem) {
        val existing = cart.find { it.menuItemId == item.id }
        if (existing != null) {
            val index = cart.indexOf(existing)
            cart[index] = existing.copy(quantity = existing.quantity + 1)
        } else {
            cart.add(CartItemUI(item.id, item.name, item.price, 1))
        }
    }

    fun updateQuantity(menuItemId: String, delta: Int) {
        val existing = cart.find { it.menuItemId == menuItemId } ?: return
        val index = cart.indexOf(existing)
        val newQty = existing.quantity + delta
        if (newQty > 0) {
            cart[index] = existing.copy(quantity = newQty)
        } else {
            cart.removeAt(index)
        }
    }

    fun updateNotes(menuItemId: String, notes: String) {
        val existing = cart.find { it.menuItemId == menuItemId } ?: return
        val index = cart.indexOf(existing)
        cart[index] = existing.copy(notes = notes)
    }

    fun sendOrder(onSuccess: () -> Unit) {
        if (cart.isEmpty()) return

        viewModelScope.launch {
            isSending = true
            try {
                val currentToken = tokenStore.token.first()
                if (currentToken == "demo_token") {
                    kotlinx.coroutines.delay(1000) // Simulate network
                    cart.clear()
                    onSuccess()
                } else {
                    val cartItems = cart.map { CartItem(it.menuItemId, it.quantity, it.notes) }
                    if (orderId == null) {
                        apiService.createOrder(OrderRequest(tableId, cartItems))
                    } else {
                        apiService.addItemsToOrder(orderId, OrderItemsRequest(cartItems))
                    }
                    cart.clear()
                    onSuccess()
                }
            } catch (e: Exception) {
                errorMessage = "Failed to send order: ${e.message}"
            } finally {
                isSending = false
            }
        }
    }

    fun getTotal(): Double {
        return cart.sumOf { it.price * it.quantity }
    }
}

data class CartItemUI(
    val menuItemId: String,
    val name: String,
    val price: Double,
    val quantity: Int,
    val notes: String? = null
)
