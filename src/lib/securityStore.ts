import fs from 'fs';
import path from 'path';

const SECURITY_FILE = path.join(__dirname, '../../security.json');
const MASTER_PASSWORD = 'bluefox2026';
const DEFAULT_PIN = '3216';

interface SecurityData {
  authorizedDevices: string[];
  waiterPins: Record<string, string>;
}

function loadData(): SecurityData {
  if (fs.existsSync(SECURITY_FILE)) {
    try {
      const data = fs.readFileSync(SECURITY_FILE, 'utf-8');
      return JSON.parse(data);
    } catch (e) {
      console.error('Failed to read security.json', e);
    }
  }
  return { authorizedDevices: [], waiterPins: {} };
}

function saveData(data: SecurityData) {
  try {
    fs.writeFileSync(SECURITY_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Failed to write security.json', e);
  }
}

export function isDeviceAuthorized(deviceId: string): boolean {
  if (!deviceId) return false;
  const data = loadData();
  return data.authorizedDevices.includes(deviceId);
}

export function authorizeDevice(deviceId: string, masterPassword: string): boolean {
  if (masterPassword !== MASTER_PASSWORD) {
    return false;
  }
  const data = loadData();
  if (!data.authorizedDevices.includes(deviceId)) {
    data.authorizedDevices.push(deviceId);
    saveData(data);
  }
  return true;
}

export function verifyWaiterPin(waiterId: string, pin: string): boolean {
  const data = loadData();
  const expectedPin = data.waiterPins[waiterId] || DEFAULT_PIN;
  return pin === expectedPin;
}

export function setWaiterPin(waiterId: string, newPin: string) {
  const data = loadData();
  data.waiterPins[waiterId] = newPin;
  saveData(data);
}
