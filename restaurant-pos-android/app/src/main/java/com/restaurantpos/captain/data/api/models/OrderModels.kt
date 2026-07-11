package com.restaurantpos.captain.data.api.models

data class Order(
    val id: String,
    val tableId: String,
    val status: String,
    val items: List<OrderItem>,
    val total: Double,
    val tableLabel: String? = null
)

data class OrderItem(
    val menuItemId: String,
    val name: String? = null,
    val quantity: Int,
    val price: Double? = null,
    val notes: String? = null
)

data class OrderRequest(
    val tableId: String,
    val items: List<CartItem>
)

data class OrderItemsRequest(
    val items: List<CartItem>
)

data class CartItem(
    val menuItemId: String,
    val quantity: Int,
    val notes: String? = null
)
