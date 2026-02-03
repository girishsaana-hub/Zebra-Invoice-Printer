import React, {useState, useEffect, useCallback} from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  PermissionsAndroid,
  Platform,
  Alert,
  ActivityIndicator,
  ToastAndroid,
  TextInput,
  ScrollView,
} from 'react-native';
import RNBluetoothClassic, {
  BluetoothDevice,
} from 'react-native-bluetooth-classic';
import DatabaseService from './src/services/DatabaseService';
import ZPLGeneratorService from './src/services/ZPLGeneratorService';
import InvoiceListComponent from './src/components/InvoiceListComponent';
import InvoicePreviewModal from './src/components/InvoicePreviewModal';
import {Invoice, InvoiceWithDetails} from './src/types/Invoice';

type ScreenType = 'invoices' | 'printers';

const App = () => {
  // Bluetooth state
  const [devices, setDevices] = useState<BluetoothDevice[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<BluetoothDevice | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  // Invoice state
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoiceDetails, setInvoiceDetails] = useState<InvoiceWithDetails | null>(null);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // UI state
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('invoices');
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    checkPermissions();
    loadInvoices();
  }, []);

  const checkPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        if (Platform.Version >= 31) {
          await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          ]);
        } else {
          await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
            PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          ]);
        }
      } catch (_error) {
        console.error('Permission request error:', _error);
      }
    }
  };

  const loadInvoices = async () => {
    setIsLoadingInvoices(true);
    try {
      const data = await DatabaseService.getInvoices(50);
      setInvoices(data);
    } catch (error) {
      console.error('Error loading invoices:', error);
      Alert.alert('Database Error', 'Failed to load invoices. Make sure the database file is in the correct location.');
    } finally {
      setIsLoadingInvoices(false);
      setIsRefreshing(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadInvoices();
      return;
    }
    setIsLoadingInvoices(true);
    try {
      const results = await DatabaseService.searchInvoices(searchQuery);
      setInvoices(results);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoadingInvoices(false);
    }
  };

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setSearchQuery('');
    loadInvoices();
  }, []);

  const handleSelectInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
  };

  const handleViewDetails = async (invoice: Invoice) => {
    try {
      const details = await DatabaseService.getInvoiceDetails(invoice.uid);
      if (details) {
        setInvoiceDetails(details);
        setShowPreview(true);
      } else {
        Alert.alert('Error', 'Could not load invoice details');
      }
    } catch (error) {
      console.error('Error loading invoice details:', error);
      Alert.alert('Error', 'Failed to load invoice details');
    }
  };

  const scanForDevices = async () => {
    setDevices([]);
    setIsScanning(true);
    try {
      const paired = await RNBluetoothClassic.getBondedDevices();
      const unpaired = await RNBluetoothClassic.startDiscovery();
      const uniqueDevices = [...paired, ...unpaired].filter(
        (device, index, self) =>
          index === self.findIndex(d => d.address === device.address),
      );
      setDevices(uniqueDevices);
    } catch (error) {
      Alert.alert('Error', 'Bluetooth scanning failed.');
    } finally {
      setIsScanning(false);
    }
  };

  const connectToPrinter = async (device: BluetoothDevice) => {
    try {
      console.log('Attempting to connect to:', device.name, device.address);
      const isConnected = await device.isConnected();
      console.log('isConnected check:', isConnected);
      if (isConnected) {
        setConnectedDevice(device);
        ToastAndroid.show(`Already connected to ${device.name}`, ToastAndroid.SHORT);
        return;
      }
      ToastAndroid.show(`Connecting to ${device.name}...`, ToastAndroid.SHORT);
      
      let connection = false;
      try {
        connection = await device.connect();
      } catch (e1) {
        console.log('Default connection failed, trying with RFCOMM...', e1);
        try {
          connection = await device.connect({
            connectorType: 'rfcomm',
            DELIMITER: '\n',
            DEVICE_CHARSET: 'utf-8',
          });
        } catch (e2) {
          console.log('RFCOMM connection failed', e2);
          throw e2;
        }
      }
      
      console.log('Connection result:', connection);
      if (connection) {
        setConnectedDevice(device);
        ToastAndroid.show('Connected!', ToastAndroid.SHORT);
      }
    } catch {
      console.error('Connection error');
      Alert.alert(
        'Connection Failed',
        'Could not connect to printer.\n\nTry:\n1. Turn printer OFF and ON\n2. Unpair and re-pair in Bluetooth settings\n3. Make sure printer is not connected to another device'
      );
    }
  };

  const disconnectPrinter = async () => {
    if (!connectedDevice) return;
    try {
      await connectedDevice.disconnect();
      setConnectedDevice(null);
      ToastAndroid.show('Disconnected', ToastAndroid.SHORT);
    } catch (error) {
      Alert.alert('Error', 'Failed to disconnect.');
    }
  };

  const printSelectedInvoice = () => {
    if (!selectedInvoice) {
      Alert.alert('No Invoice Selected', 'Please select an invoice to print.');
      return;
    }
    handleViewDetails(selectedInvoice);
  };

  // ===== OFFICIAL ZEBRA ZPL PRINT METHOD =====
  const printFromPreview = async () => {
    if (!invoiceDetails) return;

    console.log('printFromPreview called - using official ZPL ^PA method');
    setIsPrinting(true);
    
    try {
      // Generate ZPL using official Zebra method with ^PA for Arabic
      console.log('Generating ZPL with Arabic support (^CI28, ^CWZ, ^PA)...');
      const zpl = ZPLGeneratorService.generateInvoiceZPL(invoiceDetails);
      
      console.log('Generated ZPL length:', zpl.length);
      console.log('ZPL preview (first 800 chars):\n', zpl.substring(0, 800));

      if (connectedDevice) {
        await connectedDevice.write(zpl);
        ToastAndroid.show('Invoice sent to printer!', ToastAndroid.SHORT);
        setShowPreview(false);
      } else {
        Alert.alert(
          'Test Mode',
          `ZPL generated for invoice ${invoiceDetails.invoice_number}.\n\nConnect a Zebra printer to print.\n\nZPL length: ${zpl.length} chars`,
        );
      }
    } catch (error) {
      console.error('Print error:', error);
      Alert.alert('Print Error', `Failed to print invoice: ${error}`);
    } finally {
      setIsPrinting(false);
    }
  };

  // ===== TEST ARABIC PRINTING =====
  const printTestArabic = async () => {
    if (!connectedDevice) {
      Alert.alert('No Printer', 'Please connect to a printer first.');
      return;
    }

    setIsPrinting(true);
    try {
      // Official Zebra test pattern with Arabic
      const testZPL = `^XA
^CI28
^CWZ,E:TT0003M_.TTF
^FO250,50^A0N,30,30^FDTest / اختبار^FS
^FO500,100^PA0,1,1,1^AZN,30^FDمرحبا^FS
^FO250,150^A0N,25,25^FDHello World^FS
^FO500,200^PA0,1,1,1^AZN,25^FDعربي^FS
^FO250,280^PA0,1,1,1^AZN,22^FDشكرا لتعاملكم / Thank You^FS
^XZ`;

      console.log('Sending Arabic test ZPL...');
      await connectedDevice.write(testZPL);
      ToastAndroid.show('Test pattern sent!', ToastAndroid.SHORT);
    } catch (error) {
      console.error('Test print error:', error);
      Alert.alert('Test Print Error', String(error));
    } finally {
      setIsPrinting(false);
    }
  };

  const renderPrinterItem = ({item}: {item: BluetoothDevice}) => (
    <TouchableOpacity
      style={[
        styles.deviceItem,
        connectedDevice?.address === item.address && styles.connectedItem,
      ]}
      onPress={() => connectToPrinter(item)}>
      <View style={styles.deviceInfo}>
        <Text style={styles.deviceName}>{item.name || 'Unknown Device'}</Text>
        <Text style={styles.deviceAddress}>{item.address}</Text>
      </View>
      {connectedDevice?.address === item.address && (
        <Text style={styles.connectedLabel}>✓ Connected</Text>
      )}
    </TouchableOpacity>
  );

  const renderInvoicesScreen = () => (
    <View style={styles.screenContainer}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search invoice number..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>🔍</Text>
        </TouchableOpacity>
      </View>

      {/* Invoice List */}
      {isLoadingInvoices ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading invoices...</Text>
        </View>
      ) : (
        <InvoiceListComponent
          invoices={invoices}
          selectedInvoice={selectedInvoice}
          onSelectInvoice={handleSelectInvoice}
          onViewDetails={handleViewDetails}
          isRefreshing={isRefreshing}
          onRefresh={handleRefresh}
        />
      )}

      {/* Print Button */}
      <TouchableOpacity
        style={[
          styles.printButton,
          (!selectedInvoice || isPrinting) && styles.disabledButton,
        ]}
        onPress={printSelectedInvoice}
        disabled={!selectedInvoice || isPrinting}>
        {isPrinting ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.printButtonText}>
            🖨️ Preview & Print Selected Invoice
          </Text>
        )}
      </TouchableOpacity>
      
      {!connectedDevice && (
        <Text style={styles.noPrinterWarning}>
          ⚠️ No printer connected - tap Printers tab to connect
        </Text>
      )}
    </View>
  );

  const renderPrintersScreen = () => (
    <View style={styles.screenContainer}>
      {/* Scan Button */}
      <TouchableOpacity
        style={[styles.scanButton, isScanning && styles.disabledButton]}
        onPress={scanForDevices}
        disabled={isScanning}>
        {isScanning ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.scanButtonText}>🔍 Scan for Printers</Text>
        )}
      </TouchableOpacity>

      {/* Connected Printer */}
      {connectedDevice && (
        <View style={styles.connectedPrinterContainer}>
          <Text style={styles.connectedPrinterTitle}>Connected Printer:</Text>
          <View style={styles.connectedPrinterCard}>
            <View>
              <Text style={styles.connectedPrinterName}>{connectedDevice.name}</Text>
              <Text style={styles.connectedPrinterAddress}>{connectedDevice.address}</Text>
            </View>
            <TouchableOpacity
              style={styles.disconnectButton}
              onPress={disconnectPrinter}>
              <Text style={styles.disconnectButtonText}>Disconnect</Text>
            </TouchableOpacity>
          </View>
          {/* Test Print Button */}
          <TouchableOpacity
            style={styles.testPrintButton}
            onPress={printTestArabic}
            disabled={isPrinting}>
            <Text style={styles.testPrintButtonText}>
              {isPrinting ? 'Printing...' : '🧪 Test Arabic Print'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Device List */}
      <Text style={styles.listHeader}>Available Devices</Text>
      <ScrollView style={styles.deviceList}>
        {devices.length === 0 ? (
          <Text style={styles.emptyText}>
            No devices found. Tap Scan to search for Bluetooth printers.
          </Text>
        ) : (
          devices.map(device => (
            <View key={device.address}>{renderPrinterItem({item: device})}</View>
          ))
        )}
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Zebra Invoice Printer</Text>
        {connectedDevice && (
          <View style={styles.connectionIndicator}>
            <View style={styles.connectedDot} />
            <Text style={styles.connectionText}>{connectedDevice.name}</Text>
          </View>
        )}
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, currentScreen === 'invoices' && styles.activeTab]}
          onPress={() => setCurrentScreen('invoices')}>
          <Text
            style={[
              styles.tabText,
              currentScreen === 'invoices' && styles.activeTabText,
            ]}>
            📄 Invoices
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, currentScreen === 'printers' && styles.activeTab]}
          onPress={() => setCurrentScreen('printers')}>
          <Text
            style={[
              styles.tabText,
              currentScreen === 'printers' && styles.activeTabText,
            ]}>
            🖨️ Printers
          </Text>
        </TouchableOpacity>
      </View>

      {/* Screen Content */}
      {currentScreen === 'invoices' ? renderInvoicesScreen() : renderPrintersScreen()}

      {/* Invoice Preview Modal */}
      <InvoicePreviewModal
        visible={showPreview}
        invoice={invoiceDetails}
        onClose={() => setShowPreview(false)}
        onPrint={printFromPreview}
        isPrinting={isPrinting}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F4F8',
  },
  header: {
    backgroundColor: '#000000',
    padding: 16,
    paddingTop: 20,
  },
  headerTitle: {
    color: '#FFD700',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  connectionIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  connectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#28A745',
    marginRight: 6,
  },
  connectionText: {
    color: '#28A745',
    fontSize: 12,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 15,
    color: '#666',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#007AFF',
  },
  screenContainer: {
    flex: 1,
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchButton: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingHorizontal: 16,
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    fontSize: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  bottomActions: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  printButton: {
    backgroundColor: '#28A745',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
  },
  printButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#B0B0B0',
  },
  noPrinterWarning: {
    textAlign: 'center',
    marginTop: 10,
    color: '#FF9500',
    fontSize: 12,
  },
  scanButton: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  scanButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  connectedPrinterContainer: {
    marginBottom: 20,
  },
  connectedPrinterTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  connectedPrinterCard: {
    backgroundColor: '#D4EDDA',
    borderRadius: 10,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#28A745',
  },
  connectedPrinterName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  connectedPrinterAddress: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  disconnectButton: {
    backgroundColor: '#DC3545',
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  disconnectButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  testPrintButton: {
    backgroundColor: '#6C757D',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 12,
    alignItems: 'center',
  },
  testPrintButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  listHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  deviceList: {
    flex: 1,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 15,
    marginTop: 40,
  },
  deviceItem: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  connectedItem: {
    borderWidth: 2,
    borderColor: '#28A745',
    backgroundColor: '#F0F9F0',
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  deviceAddress: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  connectedLabel: {
    color: '#28A745',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default App;
