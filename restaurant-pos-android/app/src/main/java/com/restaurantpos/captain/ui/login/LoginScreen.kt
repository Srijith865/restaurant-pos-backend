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

import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.foundation.text.KeyboardOptions

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LoginScreen(
    onLoginSuccess: () -> Unit,
    viewModel: LoginViewModel = viewModel()
) {
    if (viewModel.deviceNotAuthorized) {
        DeviceNotAuthorizedScreen(viewModel)
        return
    }

    var expanded by remember { mutableStateOf(false) }

    Scaffold(
        containerColor = BackgroundSlate
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
                tint = PrimaryGreen,
                modifier = Modifier.size(64.dp)
            )
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = "Bluefox POS",
                style = MaterialTheme.typography.headlineLarge,
                color = TextDeepSlate,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = "Sign in to continue",
                style = MaterialTheme.typography.bodyMedium,
                color = TextSlate
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
                        focusedBorderColor = PrimaryGreen,
                        unfocusedBorderColor = BorderSoft,
                        focusedLabelColor = PrimaryGreen,
                        unfocusedLabelColor = TextSlate
                    ),
                    textStyle = MaterialTheme.typography.bodyMedium,
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

            Spacer(modifier = Modifier.height(16.dp))
            
            // PIN Input
            OutlinedTextField(
                value = viewModel.pin,
                onValueChange = { if (it.length <= 4) viewModel.pin = it },
                label = { Text("4-DIGIT PIN") },
                visualTransformation = PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color.White, RoundedCornerShape(8.dp)),
                shape = RoundedCornerShape(8.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = PrimaryGreen,
                    unfocusedBorderColor = BorderSoft,
                    focusedLabelColor = PrimaryGreen,
                    unfocusedLabelColor = TextSlate
                ),
                textStyle = MaterialTheme.typography.bodyMedium
            )

            if (viewModel.isLoadingWaiters) {
                LinearProgressIndicator(
                    modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                    color = PrimaryGreen
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
                        Text("Retry", color = PrimaryGreen)
                    }
                }
            }
            
            Spacer(modifier = Modifier.height(32.dp))
            
            AppButton(
                text = "Sign In",
                onClick = { viewModel.login(onLoginSuccess) },
                modifier = Modifier.fillMaxWidth(),
                isLoading = viewModel.isLoggingIn,
                enabled = viewModel.selectedWaiter != null && viewModel.pin.length == 4
            )
        }
    }
}

@Composable
fun DeviceNotAuthorizedScreen(viewModel: LoginViewModel) {
    Scaffold(containerColor = BackgroundSlate) { padding ->
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
                tint = PrimaryGreen,
                modifier = Modifier.size(64.dp)
            )
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = "Waiting for Admin Approval",
                style = MaterialTheme.typography.headlineSmall,
                color = TextDeepSlate,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = "This device needs to be approved by an Administrator in the web dashboard.",
                style = MaterialTheme.typography.bodyMedium,
                color = TextSlate,
                textAlign = androidx.compose.ui.text.style.TextAlign.Center
            )
            Spacer(modifier = Modifier.height(48.dp))

            viewModel.errorMessage?.let {
                Text(text = it, color = if (it.contains("Error") || it.contains("fail")) ErrorRed else PrimaryGreen, style = MaterialTheme.typography.bodyMedium)
                Spacer(modifier = Modifier.height(16.dp))
            }

            AppButton(
                text = "Request Approval",
                onClick = { viewModel.registerDevice {} },
                modifier = Modifier.fillMaxWidth(),
                isLoading = viewModel.isRegisteringDevice
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            TextButton(onClick = { viewModel.checkApproval() }) {
                Text("Check Status", color = PrimaryGreen)
            }
        }
    }
}
