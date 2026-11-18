package com.restaurantpos.captain.data.api

import android.content.Context
import android.os.Handler
import android.os.Looper
import com.restaurantpos.captain.data.local.TokenStore
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object ApiClient {
    private const val BASE_URL = "https://restaurant-pos-backend-kzmq.onrender.com/"

    private var apiService: ApiService? = null
    private var onUnauthorizedCallback: (() -> Unit)? = null

    fun getApiService(context: Context, onUnauthorized: (() -> Unit)? = null): ApiService {
        if (onUnauthorized != null) {
            onUnauthorizedCallback = onUnauthorized
        }

        if (apiService == null) {
            val tokenStore = TokenStore(context.applicationContext)
            val mainHandler = Handler(Looper.getMainLooper())
            
            val authInterceptor = Interceptor { chain ->
                val token = runBlocking { 
                    try {
                        tokenStore.token.first()
                    } catch (e: Exception) {
                        null
                    }
                }
                val request = chain.request().newBuilder().apply {
                    if (!token.isNullOrBlank()) {
                        addHeader("Authorization", "Bearer $token")
                    }
                }.build()
                chain.proceed(request)
            }

            val unauthorizedInterceptor = Interceptor { chain ->
                val request = chain.request()
                val response = chain.proceed(request)
                // Only treat 401 as unauthorized session for protected endpoints, not auth endpoints
                if (response.code == 401 && !request.url.encodedPath.contains("/auth/")) {
                    runBlocking { 
                        try {
                            tokenStore.clearToken()
                        } catch (_: Exception) {}
                    }
                    mainHandler.post {
                        onUnauthorizedCallback?.invoke()
                    }
                }
                response
            }

            val loggingInterceptor = HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BODY
            }

            val client = OkHttpClient.Builder()
                .connectTimeout(90, TimeUnit.SECONDS) // Accommodate Render free-tier cold start
                .readTimeout(60, TimeUnit.SECONDS)
                .writeTimeout(60, TimeUnit.SECONDS)
                .retryOnConnectionFailure(true)
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
