package com.restaurantpos.captain

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.navigation.compose.rememberNavController
import com.restaurantpos.captain.data.local.TokenStore
import com.restaurantpos.captain.navigation.NavGraph
import com.restaurantpos.captain.navigation.Screen
import com.restaurantpos.captain.ui.theme.MyApplicationTheme
import kotlinx.coroutines.flow.first

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MyApplicationTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    MainApp()
                }
            }
        }
    }
}

@Composable
fun MainApp() {
    val navController = rememberNavController()
    val tokenStore = TokenStore(androidx.compose.ui.platform.LocalContext.current)
    var startDestination by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        val token = tokenStore.token.first()
        startDestination = if (token != null) {
            Screen.TableList.route
        } else {
            Screen.Login.route
        }
    }

    startDestination?.let { destination ->
        NavGraph(
            navController = navController,
            startDestination = destination
        )
    }
}
