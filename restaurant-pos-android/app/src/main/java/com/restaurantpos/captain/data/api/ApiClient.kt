package com.restaurantpos.captain.data.api

import android.content.Context
import com.restaurantpos.captain.data.local.TokenStore
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.Response
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

object ApiClient {
    // 10.0.2.2 is the special IP for localhost from Android Emulator
    private const val BASE_URL = "https://restaurant-pos-backend-kzmq.onrender.com/"

    private var apiService: ApiService? = null

    fun getApiService(context: Context, onUnauthorized: () -> Unit): ApiService {
        if (apiService == null) {
            val tokenStore = TokenStore(context)
            
            val authInterceptor = Interceptor { chain ->
                val token = runBlocking { tokenStore.token.first() }
                val request = chain.request().newBuilder().apply {
                    token?.let { addHeader("Authorization", "Bearer $it") }
                }.build()
                chain.proceed(request)
            }

            val unauthorizedInterceptor = Interceptor { chain ->
                val response = chain.proceed(chain.request())
                if (response.code == 401) {
                    runBlocking { tokenStore.clearToken() }
                    onUnauthorized()
                }
                response
            }

            val loggingInterceptor = HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BODY
            }

            val client = OkHttpClient.Builder()
                .addInterceptor(authInterceptor)
                .addInterceptor(unauthorizedInterceptor)
                .addInterceptor(loggingInterceptor)
                .build()

            val retrofit = Retrofit.Builder()
                .baseUrl(BASE_URL)
                .addConverterFactory(GsonConverterFactory.create())
                .client(client)
                .build()

            apiService = retrofit.create(ApiService::class.java)
        }
        return apiService!!
    }
}
