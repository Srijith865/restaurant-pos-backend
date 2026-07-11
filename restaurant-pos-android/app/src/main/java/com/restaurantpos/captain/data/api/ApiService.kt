package com.restaurantpos.captain.data.api

import com.restaurantpos.captain.data.api.models.*
import retrofit2.http.*

interface ApiService {
    @GET("auth/waiters")
    suspend fun getWaiters(): List<Waiter>

    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): LoginResponse

    @GET("me")
    suspend fun getMe(): User

    @GET("tables")
    suspend fun getTables(): List<Table>

    @GET("categories")
    suspend fun getCategories(): List<Category>

    @GET("items")
    suspend fun getItems(
        @Query("categoryId") categoryId: String,
        @Query("tableId") tableId: String
    ): List<MenuItem>

    @POST("orders")
    suspend fun createOrder(@Body request: OrderRequest): Order

    @POST("orders/{id}/items")
    suspend fun addItemsToOrder(@Path("id") orderId: String, @Body request: OrderItemsRequest): Order

    @GET("orders")
    suspend fun getOrders(@Query("status") status: String): List<Order>

    @GET("orders/{id}")
    suspend fun getOrderById(@Path("id") orderId: String): Order
}
