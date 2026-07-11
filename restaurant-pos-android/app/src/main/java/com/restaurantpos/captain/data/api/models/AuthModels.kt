package com.restaurantpos.captain.data.api.models

import com.google.gson.annotations.SerializedName

data class Waiter(
    @SerializedName("WaiterID") val id: Int,
    @SerializedName("WaiterName") val name: String
)

data class LoginRequest(
    val waiterId: Int
)

data class LoginResponse(
    val token: String?,
    @SerializedName("restaurantId") val restaurantId: String? = null,
    @SerializedName("staffId") val staffId: String? = null
)

data class User(
    val id: String? = null,
    val name: String? = null,
    val role: String? = null,
    @SerializedName("restaurantId") val restaurantId: String? = null,
    @SerializedName("restaurantName") val restaurantName: String? = null
)
