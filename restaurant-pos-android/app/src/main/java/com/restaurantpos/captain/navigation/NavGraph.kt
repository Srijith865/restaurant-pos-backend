package com.restaurantpos.captain.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import com.restaurantpos.captain.ui.login.LoginScreen
import com.restaurantpos.captain.ui.order.OrderScreen
import com.restaurantpos.captain.ui.tables.TableListScreen

sealed class Screen(val route: String) {
    object Login : Screen("login")
    object TableList : Screen("tables")
    object Order : Screen("order/{tableId}/{orderId}?tableLabel={tableLabel}") {
        fun createRoute(tableId: String, orderId: String? = null, tableLabel: String? = null): String {
            return "order/$tableId/${orderId ?: "none"}?tableLabel=${tableLabel ?: ""}"
        }
    }
}

@Composable
fun NavGraph(
    navController: NavHostController,
    startDestination: String
) {
    NavHost(
        navController = navController,
        startDestination = startDestination
    ) {
        composable(Screen.Login.route) {
            LoginScreen(
                onLoginSuccess = {
                    navController.navigate(Screen.TableList.route) {
                        popUpTo(Screen.Login.route) { inclusive = true }
                    }
                }
            )
        }
        composable(Screen.TableList.route) {
            TableListScreen(
                onTableClick = { tableId, orderId, tableLabel ->
                    navController.navigate(Screen.Order.createRoute(tableId, orderId, tableLabel))
                },
                onLogout = {
                    navController.navigate(Screen.Login.route) {
                        popUpTo(0) { inclusive = true }
                    }
                }
            )
        }
        composable(
            route = Screen.Order.route,
            arguments = listOf(
                navArgument("tableId") { type = NavType.StringType },
                navArgument("orderId") { type = NavType.StringType; nullable = true },
                navArgument("tableLabel") { type = NavType.StringType; nullable = true }
            )
        ) { backStackEntry ->
            val tableId = backStackEntry.arguments?.getString("tableId") ?: ""
            val orderIdArg = backStackEntry.arguments?.getString("orderId")
            val orderId = if (orderIdArg == "none") null else orderIdArg
            val tableLabel = backStackEntry.arguments?.getString("tableLabel")

            OrderScreen(
                tableId = tableId,
                orderId = orderId,
                tableLabel = tableLabel ?: "",
                onOrderSent = {
                    navController.popBackStack()
                },
                onBack = {
                    navController.popBackStack()
                }
            )
        }
    }
}
