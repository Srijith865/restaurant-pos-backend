package com.restaurantpos.captain.ui.login

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material.icons.filled.Restaurant
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.restaurantpos.captain.ui.components.AppButton
import com.restaurantpos.captain.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LoginScreen(
    onLoginSuccess: () -> Unit,
    viewModel: LoginViewModel = viewModel()
) {
    var expanded by remember { mutableStateOf(false) }

    Scaffold(
        containerColor = BackgroundWarm
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Icon(
                imageVector = Icons.Default.Restaurant,
                contentDescription = null,
                tint = PrimaryTeal,
                modifier = Modifier.size(64.dp)
            )
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = "Bluefox POS",
                style = MaterialTheme.typography.headlineLarge,
                color = PrimaryText,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = "Sign in to continue",
                style = MaterialTheme.typography.bodyMedium,
                color = SecondaryGrey
            )
            Spacer(modifier = Modifier.height(48.dp))

            // Waiter Selection Dropdown
            Box(modifier = Modifier.fillMaxWidth()) {
                OutlinedTextField(
                    value = viewModel.selectedWaiter?.name ?: "Select your name",
                    onValueChange = { },
                    readOnly = true,
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color.White, RoundedCornerShape(8.dp))
                        .clickable { expanded = true },
                    label = { Text("WAITER NAME") },
                    trailingIcon = {
                        IconButton(onClick = { expanded = true }) {
                            Icon(Icons.Default.ArrowDropDown, contentDescription = null)
                        }
                    },
                    shape = RoundedCornerShape(8.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = PrimaryTeal,
                        unfocusedBorderColor = BorderGrey,
                        focusedLabelColor = PrimaryTeal
                    ),
                    enabled = !viewModel.isLoadingWaiters
                )

                DropdownMenu(
                    expanded = expanded,
                    onDismissRequest = { expanded = false },
                    modifier = Modifier
                        .fillMaxWidth(0.85f)
                        .background(Color.White)
                ) {
                    viewModel.waiters.forEach { waiter ->
                        DropdownMenuItem(
                            text = { Text(waiter.name) },
                            onClick = {
                                viewModel.selectedWaiter = waiter
                                expanded = false
                            }
                        )
                    }
                }
            }

            if (viewModel.isLoadingWaiters) {
                LinearProgressIndicator(
                    modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                    color = PrimaryTeal
                )
            }
            
            viewModel.errorMessage?.let {
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = it,
                    color = ErrorRed,
                    style = MaterialTheme.typography.bodySmall
                )
                if (it.contains("load waiters")) {
                    TextButton(onClick = { viewModel.loadWaiters() }) {
                        Text("Retry", color = PrimaryTeal)
                    }
                }
            }
            
            Spacer(modifier = Modifier.height(32.dp))
            
            AppButton(
                text = "Sign In",
                onClick = { viewModel.login(onLoginSuccess) },
                modifier = Modifier.fillMaxWidth(),
                isLoading = viewModel.isLoggingIn,
                enabled = viewModel.selectedWaiter != null
            )
        }
    }
}
