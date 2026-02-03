import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import {InvoiceWithDetails} from '../types/Invoice';

interface InvoicePreviewProps {
  visible: boolean;
  invoice: InvoiceWithDetails | null;
  onClose: () => void;
  onPrint: () => void;
  isPrinting: boolean;
}

const {height: SCREEN_HEIGHT} = Dimensions.get('window');

const InvoicePreviewModal: React.FC<InvoicePreviewProps> = ({
  visible,
  invoice,
  onClose,
  onPrint,
  isPrinting,
}) => {
  if (!invoice) {
    return null;
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = String(date.getFullYear()).slice(-2);
      return `${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (amount: number | undefined | null) => {
    if (amount === undefined || amount === null) return '0.00';
    return amount.toFixed(2);
  };

  const handlePrint = () => {
    console.log('handlePrint called - using direct ZPL');
    onPrint();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Invoice Preview</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.receiptContainer}>
              <View 
                style={styles.invoiceContent}
              >
                {/* Company Header Row */}
                <View style={styles.headerRow}>
                  {/* Logo Section */}
                  <View style={styles.logoSection}>
                    <View style={styles.logoBox}>
                      <Text style={styles.logoArabic}>ناصر بن خالد وأولاده التجارية شركة</Text>
                      <Text style={styles.logoEnglish}>NASSER BIN KHALED AND SONS TRADING CO.</Text>
                    </View>
                  </View>
                  {/* Company Info Section */}
                  <View style={styles.companyInfoSection}>
                    <Text style={styles.companyInfoText}>VAT REG.NO.: 100057393900003</Text>
                    <Text style={styles.companyInfoText}>RAINBOW DIV-OOH</Text>
                    <Text style={styles.companyInfoText}>PO BOX:5249-DUBAI-UAE</Text>
                    <Text style={styles.companyInfoText}>TEL:04-2979991 FAX:04-2662931</Text>
                    <Text style={styles.companyInfoText}>EMAIL:RAINBOW@CHOITHRAMS.COM</Text>
                  </View>
                </View>

                {/* Invoice Title */}
                <Text style={styles.invoiceTitle}>INVOICE</Text>

                {/* Invoice Details - Two Columns */}
                <View style={styles.detailsRow}>
                  <View style={styles.leftDetails}>
                    <Text style={styles.detailText}>SALESMAN: {invoice.salesman_code} - {invoice.salesman_name}-{invoice.salesman_phone || ''}</Text>
                    <Text style={styles.detailText}>Route  : {invoice.route_code} - {invoice.route_name}</Text>
                    <Text style={styles.detailText}>CUST   : {invoice.store?.code}</Text>
                    <Text style={styles.detailText}>{invoice.store?.name}</Text>
                    <Text style={styles.detailText}>{invoice.store?.location}</Text>
                    <Text style={styles.detailText}>CUST VAT : {invoice.store?.tax_doc_number || 'N/A'}</Text>
                    <Text style={styles.detailText}>CUST TEL : {invoice.store?.phone || ''}</Text>
                  </View>
                  <View style={styles.rightDetails}>
                    <Text style={styles.detailTextRight}>INVOICE NO  :{invoice.invoice_number}</Text>
                    <Text style={styles.detailTextRight}>INVOICE TYPE :{invoice.invoice_type || 'Invoice'}</Text>
                    <Text style={styles.detailTextRight}>INVOICE DATE :{formatDate(invoice.invoice_date)}</Text>
                    <Text style={styles.detailTextRight}>DELIVERY DATE:{formatDate(invoice.delivery_date)}</Text>
                    <Text style={styles.detailTextRight}>TIME        :{invoice.delivery_time || ''}</Text>
                  </View>
                </View>

                {/* Sales Header */}
                <View style={styles.salesHeader}>
                  <Text style={styles.salesText}>SALES</Text>
                  <Text style={styles.salesTextArabic}>المبيعات</Text>
                </View>

                {/* Dashed Line */}
                <Text style={styles.dashedLine}>- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -</Text>

                {/* Table Header */}
                <View style={styles.tableRow}>
                  <Text style={[styles.headerCell, {width: '22%'}]}>ITEM/DESCRIPTION</Text>
                  <Text style={[styles.headerCell, {width: '15%'}]}>UPC</Text>
                  <Text style={[styles.headerCell, {width: '8%'}]}>QTY</Text>
                  <Text style={[styles.headerCell, {width: '12%'}]}>PRICE</Text>
                  <Text style={[styles.headerCell, {width: '13%'}]}>DISC/REBATE</Text>
                  <Text style={[styles.headerCell, {width: '15%'}]}>VAT AMOUNT</Text>
                  <Text style={[styles.headerCell, {width: '15%'}]}>AMOUNT</Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={[styles.headerCellArabic, {width: '22%'}]}>بند/وصف</Text>
                  <Text style={[styles.headerCellArabic, {width: '15%'}]}>رمز المنتج العالمي</Text>
                  <Text style={[styles.headerCellArabic, {width: '8%'}]}>الكمية</Text>
                  <Text style={[styles.headerCellArabic, {width: '12%'}]}>السعر</Text>
                  <Text style={[styles.headerCellArabic, {width: '13%'}]}>الخصم/الحسم</Text>
                  <Text style={[styles.headerCellArabic, {width: '15%'}]}>مبلغ ضريبة القيمة المضافة</Text>
                  <Text style={[styles.headerCellArabic, {width: '15%'}]}>المبلغ</Text>
                </View>

                {/* Dashed Line */}
                <Text style={styles.dashedLine}>- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -</Text>

                {/* Line Items */}
                {invoice.lines.map((line, index) => (
                  <View key={index} style={styles.lineItemContainer}>
                    <View style={styles.tableRow}>
                      <Text style={[styles.cell, {width: '22%'}]}>{line.item_code}</Text>
                      <Text style={[styles.cell, {width: '8%'}]}>{line.qty}</Text>
                      <Text style={[styles.cell, {width: '7%'}]}>{line.uom}</Text>
                      <Text style={[styles.cellRight, {width: '12%'}]}>{formatCurrency(line.unit_price)}</Text>
                      <Text style={[styles.cellRight, {width: '13%'}]}>{formatCurrency(line.total_discount)}</Text>
                      <Text style={[styles.cellRight, {width: '15%'}]}>+{formatCurrency(line.total_tax)}({line.tax_percentage || 5}%)</Text>
                      <Text style={[styles.cellRight, {width: '15%'}]}>{formatCurrency(line.net_amount)}</Text>
                    </View>
                    <Text style={styles.itemDescription}>{line.sku_name}</Text>
                    <View style={styles.upcRow}>
                      <Text style={styles.upcText}>{line.upc_code}</Text>
                      <Text style={styles.arabicSmall}>رمز المنتج</Text>
                    </View>
                    <Text style={styles.exciseDuty}>Excise Duty : {formatCurrency(line.excise_duty || 0)}</Text>
                  </View>
                ))}

                {/* Solid Line */}
                <Text style={styles.solidLine}>═══════════════════════════════════════════════════════════════════════════════════</Text>

                {/* Total Row */}
                <View style={styles.tableRow}>
                  <Text style={[styles.totalCell, {width: '22%'}]}>TOTAL</Text>
                  <Text style={[styles.totalCell, {width: '15%'}]}></Text>
                  <Text style={[styles.totalCell, {width: '8%'}]}></Text>
                  <Text style={[styles.totalCell, {width: '12%'}]}></Text>
                  <Text style={[styles.totalCellRight, {width: '13%'}]}>{formatCurrency(invoice.total_discount)}</Text>
                  <Text style={[styles.totalCellRight, {width: '15%'}]}>+{formatCurrency(invoice.total_tax)}</Text>
                  <Text style={[styles.totalCellRight, {width: '15%'}]}>{formatCurrency(invoice.net_amount)}</Text>
                </View>

                {/* Spacer */}
                <View style={{height: 20}} />

                {/* NET DUE THIS INVOICE Section */}
                <View style={styles.netDueHeader}>
                  <Text style={styles.netDueTitle}>NET DUE THIS INVOICE</Text>
                  <Text style={styles.netDueTitleArabic}>صافي مستحق الفاتورة</Text>
                </View>
                
                <View style={styles.netDueRow}>
                  <Text style={styles.netDueLabel}>SALES</Text>
                  <Text style={styles.netDueValue}>+{formatCurrency(invoice.net_amount + invoice.total_discount - invoice.total_tax)}</Text>
                  <Text style={styles.netDueLabelArabic}>المبيعات</Text>
                </View>
                <View style={styles.netDueRow}>
                  <Text style={styles.netDueLabel}>DISCOUNT</Text>
                  <Text style={styles.netDueValue}>-{formatCurrency(invoice.total_discount)}</Text>
                  <Text style={styles.netDueLabelArabic}>الخصم</Text>
                </View>
                <View style={styles.netDueRow}>
                  <Text style={styles.netDueLabel}>GOOD RETURNS</Text>
                  <Text style={styles.netDueValue}>+{formatCurrency(invoice.good_returns || 0)}</Text>
                  <Text style={styles.netDueLabelArabic}>البضائع المرتجعة</Text>
                </View>
                <View style={styles.netDueRow}>
                  <Text style={styles.netDueLabel}>DAMAGED RETURNS</Text>
                  <Text style={styles.netDueValue}>+{formatCurrency(invoice.damaged_returns || 0)}</Text>
                  <Text style={styles.netDueLabelArabic}>بضاعة معدومة مرتجعة</Text>
                </View>
                <View style={styles.netDueRow}>
                  <Text style={styles.netDueLabel}>VAT AMOUNT</Text>
                  <Text style={styles.netDueValue}>+{formatCurrency(invoice.total_tax)}</Text>
                  <Text style={styles.netDueLabelArabic}>مبلغ ضريبة القيمة المضافة</Text>
                </View>
                <View style={styles.netDueRow}>
                  <Text style={styles.netDueLabel}>EXCISE DUTY AMOUNT</Text>
                  <Text style={styles.netDueValue}>+{formatCurrency(invoice.excise_duty_amount || 0)}</Text>
                  <Text style={styles.netDueLabelArabic}>مبلغ ضريبة الاستهلاك</Text>
                </View>
                <View style={styles.netDueRow}>
                  <Text style={styles.netDueLabel}>NET SALES</Text>
                  <Text style={styles.netDueValueBold}>+{formatCurrency(invoice.net_amount)}</Text>
                  <Text style={styles.netDueLabelArabic}>صافي المبيعات</Text>
                </View>

                {/* TC Charged */}
                <View style={styles.tcChargedRow}>
                  <Text style={styles.tcChargedLabel}>TC CHARGED :</Text>
                  <Text style={styles.tcChargedValue}>+{formatCurrency(invoice.net_amount)}</Text>
                </View>

                {/* Dashed Line */}
                <Text style={styles.dashedLine}>- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -</Text>

                {/* Count and Payment Due */}
                <Text style={styles.smallText}>  count : 0 + 0=0</Text>
                <Text style={styles.paymentDue}>  PAYMENT DUE DATE :{formatDate(invoice.payment_due_date)}</Text>

                {/* Dashed Line */}
                <Text style={styles.dashedLine}>- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -</Text>

                {/* Signatures */}
                <View style={{height: 20}} />
                <Text style={styles.signatureRight}>SALESMAN SIGNATURE__________</Text>
                <View style={{height: 10}} />
                <Text style={styles.signatureLeft}>CUSTOMER SIGNATURE__________</Text>

                {/* Duplicate */}
                <Text style={styles.duplicateLabel}>DUPLICATE</Text>

              </View>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.printButton, isPrinting && styles.disabledButton]}
              onPress={handlePrint}
              disabled={isPrinting}>
              <Text style={styles.printButtonText}>
                {isPrinting ? 'Printing...' : '🖨️ Print Invoice'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#F5F5F5',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SCREEN_HEIGHT * 0.9,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1a365d',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 20,
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  receiptContainer: {
    margin: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  invoiceContent: {
    backgroundColor: '#FFFFFF',
    padding: 12,
  },
  // Header Row
  headerRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  logoSection: {
    flex: 1,
    paddingRight: 10,
  },
  logoBox: {
    borderWidth: 1,
    borderColor: '#8B4513',
    padding: 8,
    alignItems: 'center',
  },
  logoArabic: {
    fontSize: 7,
    color: '#8B4513',
  },
  logoEnglish: {
    fontSize: 5,
    color: '#8B4513',
    marginTop: 2,
  },
  companyInfoSection: {
    flex: 1.5,
    alignItems: 'flex-end',
  },
  companyInfoText: {
    fontSize: 7,
    color: '#000',
    textAlign: 'right',
  },
  // Invoice Title
  invoiceTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 8,
    color: '#000',
  },
  // Details Row
  detailsRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  leftDetails: {
    flex: 1,
  },
  rightDetails: {
    flex: 1,
  },
  detailText: {
    fontSize: 7,
    color: '#000',
    marginBottom: 1,
  },
  detailTextRight: {
    fontSize: 7,
    color: '#000',
    marginBottom: 1,
    textAlign: 'right',
  },
  // Sales Header
  salesHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 6,
  },
  salesText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginRight: 15,
  },
  salesTextArabic: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  // Lines
  dashedLine: {
    fontSize: 5,
    color: '#666',
    marginVertical: 2,
    letterSpacing: -1,
  },
  solidLine: {
    fontSize: 5,
    color: '#000',
    marginVertical: 3,
    letterSpacing: -2,
  },
  // Table
  tableRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  headerCell: {
    fontSize: 6,
    fontWeight: 'bold',
    color: '#000',
  },
  headerCellArabic: {
    fontSize: 5,
    color: '#000',
  },
  cell: {
    fontSize: 6,
    color: '#000',
  },
  cellRight: {
    fontSize: 6,
    color: '#000',
    textAlign: 'right',
  },
  totalCell: {
    fontSize: 7,
    fontWeight: 'bold',
    color: '#000',
  },
  totalCellRight: {
    fontSize: 7,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'right',
  },
  // Line Items
  lineItemContainer: {
    marginVertical: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: '#eee',
    paddingBottom: 3,
  },
  itemDescription: {
    fontSize: 6,
    color: '#000',
    marginLeft: 3,
    marginTop: 1,
  },
  upcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 1,
  },
  upcText: {
    fontSize: 6,
    color: '#000',
  },
  arabicSmall: {
    fontSize: 5,
    color: '#000',
  },
  exciseDuty: {
    fontSize: 6,
    color: '#000',
    marginTop: 1,
  },
  // Net Due Section
  netDueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  netDueTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#000',
  },
  netDueTitleArabic: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#000',
  },
  netDueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 1,
  },
  netDueLabel: {
    fontSize: 8,
    color: '#000',
    width: '35%',
  },
  netDueValue: {
    fontSize: 8,
    color: '#000',
    width: '25%',
    textAlign: 'center',
  },
  netDueValueBold: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#000',
    width: '25%',
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: '#000',
    paddingTop: 2,
  },
  netDueLabelArabic: {
    fontSize: 7,
    color: '#000',
    width: '40%',
    textAlign: 'right',
  },
  // TC Charged
  tcChargedRow: {
    flexDirection: 'row',
    marginVertical: 5,
  },
  tcChargedLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#000',
  },
  tcChargedValue: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#000',
    marginLeft: 15,
  },
  // Small text
  smallText: {
    fontSize: 7,
    color: '#000',
  },
  paymentDue: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#000',
  },
  // Signatures
  signatureRight: {
    fontSize: 8,
    color: '#000',
    textAlign: 'right',
  },
  signatureLeft: {
    fontSize: 8,
    color: '#000',
  },
  // Duplicate
  duplicateLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 15,
    color: '#000',
  },
  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#E5E5E5',
    marginRight: 8,
  },
  printButton: {
    backgroundColor: '#22C55E',
    marginLeft: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  printButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default InvoicePreviewModal;
