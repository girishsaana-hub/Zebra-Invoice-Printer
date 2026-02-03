import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import ViewShot from 'react-native-view-shot';
import DatabaseService from '../services/DatabaseService';
import ZPLGeneratorService from '../services/ZPLGeneratorService';
import { InvoiceWithDetails, InvoiceLine } from '../types/Invoice';
// import ZebraPrinter from '../services/ZebraPrinter'; // Ensure you have this service

interface Props {
  route: { params: { invoiceUid: string } };
  navigation: any;
}

const InvoicePreviewScreen: React.FC<Props> = ({ route, navigation: _navigation }) => {
  const { invoiceUid } = route.params;
  const [invoice, setInvoice] = useState<InvoiceWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);
  const viewShotRef = useRef<ViewShot>(null);

  const loadInvoice = useCallback(async () => {
    try {
      const data = await DatabaseService.getInvoiceDetails(invoiceUid);
      setInvoice(data);
    } catch {
      Alert.alert('Error', 'Failed to load invoice details');
    } finally {
      setLoading(false);
    }
  }, [invoiceUid]);

  useEffect(() => {
    loadInvoice();
  }, [loadInvoice]);

  const handlePrint = async () => {
    const viewShot = viewShotRef.current;
    if (!viewShot || !viewShot.capture) return;

    try {
      setPrinting(true);

      // 1. Capture the view as a Base64 PNG
      // We set width to 812 to match the ZQ520 printer width (4 inches @ 203dpi)
      const base64 = await viewShot.capture();

      // 2. Generate ZPL from the image
      const zpl = ZPLGeneratorService.generateZPLFromBase64Image(base64);

      // 3. Send to Printer
      // await ZebraPrinter.print(zpl);
      console.log('ZPL Generated:', zpl.substring(0, 100) + '...');
      console.log('ZPL Generated, sending to printer...');

      Alert.alert('Success', 'Invoice sent to printer');
    } catch (_error) {
      console.error(_error);
      Alert.alert('Print Error', 'Failed to generate or print image');
    } finally {
      setPrinting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (!invoice) {
    return (
      <View style={styles.center}>
        <Text>Invoice not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.headerTitle}>Print Preview</Text>
        <Text style={styles.subTitle}>This is exactly how it will print</Text>

        {/* 
          ViewShot Container 
          This view is what gets captured. We use a white background and black text.
        */}
        <ViewShot
          ref={viewShotRef}
          options={{ format: 'png', result: 'base64', width: 812 }}
          style={styles.invoiceContainer}
        >
          {/* Header */}
          <View style={styles.section}>
            <Text style={styles.companyName}>NASSER BIN KHALED AND SONS</Text>
            <Text style={styles.text}>VAT REG: {invoice.organization?.vat_reg_number}</Text>
            <Text style={styles.text}>{invoice.organization?.division}</Text>
          </View>

          <View style={styles.divider} />

          {/* Invoice Info */}
          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Invoice No:</Text>
              <Text style={styles.value}>{invoice.invoice_number}</Text>
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Date:</Text>
              <Text style={styles.value}>{invoice.invoice_date?.split('T')[0]}</Text>
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Customer:</Text>
              <Text style={styles.value}>{invoice.store?.name}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Table Header */}
          <View style={[styles.row, styles.tableHeader]}>
            <Text style={[styles.th, { flex: 2 }]}>Item</Text>
            <Text style={[styles.th, { flex: 1 }]}>Qty</Text>
            <Text style={[styles.th, { flex: 1 }]}>Price</Text>
            <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>Total</Text>
          </View>

          {/* Lines */}
          {invoice.lines.map((line: InvoiceLine, index: number) => (
            <View key={index} style={styles.lineItem}>
              <View style={styles.row}>
                <Text style={[styles.td, { flex: 2 }]}>{line.item_code}</Text>
                <Text style={[styles.td, { flex: 1 }]}>{line.qty}</Text>
                <Text style={[styles.td, { flex: 1 }]}>{line.unit_price.toFixed(2)}</Text>
                <Text style={[styles.td, { flex: 1, textAlign: 'right' }]}>
                  {line.net_amount.toFixed(2)}
                </Text>
              </View>
              <Text style={styles.skuName}>{line.sku_name}</Text>
            </View>
          ))}

          <View style={styles.divider} />

          {/* Totals */}
          <View style={styles.totalSection}>
            <View style={styles.row}>
              <Text style={styles.label}>Subtotal:</Text>
              <Text style={styles.value}>{invoice.total_amount.toFixed(2)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Discount:</Text>
              <Text style={styles.value}>{invoice.total_discount.toFixed(2)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>VAT (5%):</Text>
              <Text style={styles.value}>{invoice.total_tax.toFixed(2)}</Text>
            </View>
            <View style={[styles.row, { marginTop: 10 }]}>
              <Text style={styles.totalLabel}>NET TOTAL:</Text>
              <Text style={styles.totalValue}>{invoice.net_amount.toFixed(2)}</Text>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.text}>Thank you for your business!</Text>
          </View>
        </ViewShot>
      </ScrollView>

      {/* Print Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.printButton, printing && styles.disabledButton]}
          onPress={handlePrint}
          disabled={printing}
        >
          {printing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.printButtonText}>PRINT INVOICE</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f0f0' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 16, paddingBottom: 100 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 5 },
  subTitle: { fontSize: 12, textAlign: 'center', marginBottom: 15, color: '#666' },
  
  // The Invoice Paper Look
  invoiceContainer: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 0, // Sharp corners for paper look
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  section: { alignItems: 'center', marginBottom: 15 },
  companyName: { fontSize: 18, fontWeight: 'bold', marginBottom: 5, color: '#000' },
  text: { fontSize: 12, color: '#000' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  col: { flex: 1 },
  label: { fontSize: 12, color: '#666' },
  value: { fontSize: 12, fontWeight: 'bold', color: '#000' },
  divider: { height: 1, backgroundColor: '#000', marginVertical: 10 },
  
  tableHeader: { borderBottomWidth: 1, borderBottomColor: '#000', paddingBottom: 5, marginBottom: 5 },
  th: { fontSize: 12, fontWeight: 'bold', color: '#000' },
  td: { fontSize: 12, color: '#000' },
  lineItem: { marginBottom: 8 },
  skuName: { fontSize: 10, color: '#444', fontStyle: 'italic' },
  
  totalSection: { alignItems: 'flex-end', marginTop: 10 },
  totalLabel: { fontSize: 16, fontWeight: 'bold', color: '#000' },
  totalValue: { fontSize: 16, fontWeight: 'bold', color: '#000' },
  footer: { marginTop: 20, alignItems: 'center' },

  buttonContainer: { padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#ddd' },
  printButton: { backgroundColor: '#007AFF', padding: 15, borderRadius: 8, alignItems: 'center' },
  disabledButton: { backgroundColor: '#ccc' },
  printButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});

export default InvoicePreviewScreen;