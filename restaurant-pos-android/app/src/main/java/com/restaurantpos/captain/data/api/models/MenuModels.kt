package com.restaurantpos.captain.data.api.models

data class Table(
    val id: String,
    val label: String,
    val isOccupied: Boolean
)

data class Category(
    val id: String,
    val name: String,
    val sortOrder: Int
)

data class MenuItem(
    val id: String,
    val name: String,
    val price: Double,
    val isAvailable: Boolean,
    val categoryId: String,
    val categoryName: String
)
