import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { InvoiceWithDetails } from '../types/Invoice';

interface InvoiceTemplateProps {
  invoice: InvoiceWithDetails;
}

/**
 * Invoice template for bitmap rendering
 * Width: 576px = 72mm at 203 DPI (ZQ520)
 */
export const InvoiceTemplate = React.forwardRef<View, InvoiceTemplateProps>(
  ({ invoice }, ref) => {
    const formatDate = (dateStr: string) => {
      if (!dateStr) return '';
      const dt = new Date(dateStr);
      return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${String(dt.getFullYear()).slice(-2)}`;
    };

    const totalQty = invoice.lines.reduce((sum, line) => sum + line.qty, 0);
    const uniqueItems = invoice.lines.length;

    return (
      <View ref={ref} style={styles.container}>
        {/* Company Header */}
        <View style={styles.header}>
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>LOGO</Text>
          </View>
          <View style={styles.companyInfo}>
            <Text style={styles.companyText}>VAT REG.NO.: 100057393900003</Text>
            <Text style={styles.companyText}>RAINBOW DIV-OOH</Text>
            <Text style={styles.companyText}>PO BOX:5249-DUBAI-UAE</Text>
            <Text style={styles.companyText}>TEL:04-2979991 FAX:04-2662931</Text>
            <Text style={styles.companyText}>EMAIL:RAINBOW@CHOITHRAMS.COM</Text>
          </View>
        </View>

        {/* INVOICE Title */}
        <Text style={styles.invoiceTitle}>INVOICE</Text>

        {/* Invoice Details */}
        <View style={styles.detailsRow}>
          <View style={styles.detailsLeft}>
            <Text style={styles.detailText}>SALESMAN: {invoice.salesman_code} - {invoice.salesman_name}</Text>
            <Text style={styles.detailText}>Route  : {invoice.route_code} - {invoice.route_name}</Text>
            <Text style={styles.detailText}>CUST   : {invoice.store?.code}</Text>
            <Text style={styles.detailText}>{invoice.store?.name}</Text>
            <Text style={styles.detailText}>{invoice.store?.location}</Text>
            <Text style={styles.detailText}>CUST VAT : {invoice.store?.tax_doc_number || 'N/A'}</Text>
            <Text style={styles.detailText}>CUST TEL : {invoice.store?.phone || ''}</Text>
          </View>
          <View style={styles.detailsRight}>
            <Text style={styles.detailTextRight}>INVOICE NO  :{invoice.invoice_number}</Text>
            <Text style={styles.detailTextRight}>INVOICE TYPE :{invoice.invoice_type || 'CREDIT'}</Text>
            <Text style={styles.detailTextRight}>INVOICE DATE :{formatDate(invoice.invoice_date)}</Text>
            <Text style={styles.detailTextRight}>DELIVERY DATE:{formatDate(invoice.delivery_date || invoice.invoice_date)}</Text>
            <Text style={styles.detailTextRight}>TIME        :{invoice.delivery_time || ''}</Text>
          </View>
        </View>

        {/* SALES Header */}
        <View style={styles.salesHeader}>
          <Text style={styles.salesText}>SALES</Text>
          <Text style={styles.salesTextArabic}>المبيعات</Text>
        </View>

        {/* Table Header */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { flex: 2 }]}>ITEM/DESC</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1.2 }]}>UPC</Text>
            <Text style={[styles.tableHeaderCell, { flex: 0.8 }]}>QTY</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1 }]}>PRICE</Text>
            <Text style={[styles.tableHeaderCell, { flex: 0.8 }]}>DISC</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1 }]}>VAT</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1 }]}>AMT</Text>
          </View>

          {/* Line Items */}
          {invoice.lines.map((line, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 2, fontSize: 11 }]}>{line.item_code}</Text>
              <Text style={[styles.tableCell, { flex: 1.2, fontSize: 11 }]}>{line.upc_code || ''}</Text>
              <Text style={[styles.tableCell, { flex: 0.8, fontSize: 11 }]}>{line.qty} {line.uom}</Text>
              <Text style={[styles.tableCell, { flex: 1, fontSize: 11 }]}>{line.unit_price.toFixed(2)}</Text>
              <Text style={[styles.tableCell, { flex: 0.8, fontSize: 11 }]}>{line.total_discount.toFixed(2)}</Text>
              <Text style={[styles.tableCell, { flex: 1, fontSize: 10 }]}>+{line.total_tax.toFixed(2)}</Text>
              <Text style={[styles.tableCell, { flex: 1, fontSize: 11, textAlign: 'right' }]}>{line.net_amount.toFixed(2)}</Text>
            </View>
          ))}
        </View>

        {/* Total Row */}
        <View style={styles.totalRow}>
          <Text style={[styles.totalCell, { flex: 2 }]}>TOTAL</Text>
          <Text style={[styles.totalCell, { flex: 0.8 }]}>{totalQty}</Text>
          <Text style={[styles.totalCell, { flex: 0.8 }]}></Text>
          <Text style={[styles.totalCell, { flex: 0.8 }]}>{invoice.total_discount.toFixed(2)}</Text>
          <Text style={[styles.totalCell, { flex: 1 }]}>+{invoice.total_tax.toFixed(2)}</Text>
          <Text style={[styles.totalCell, { flex: 1, textAlign: 'right' }]}>{invoice.net_amount.toFixed(2)}</Text>
        </View>

        {/* NET DUE Section */}
        <View style={styles.netDueSection}>
          <View style={styles.netDueHeader}>
            <Text style={styles.netDueTitle}>NET DUE THIS INVOICE</Text>
            <Text style={styles.netDueTitleArabic}>صافي مستحق الفاتورة</Text>
          </View>

          {[
            { label: 'SALES', value: invoice.net_amount + invoice.total_discount - invoice.total_tax, arabic: 'المبيعات' },
            { label: 'DISCOUNT', value: -invoice.total_discount, arabic: 'القرص' },
            { label: 'GOOD RETURNS', value: invoice.good_returns || 0, arabic: 'البضائع المرتجعة' },
            { label: 'DAMAGED RETURNS', value: invoice.damaged_returns || 0, arabic: 'بضاعة معدومة مرتجعة' },
            { label: 'VAT AMOUNT', value: invoice.total_tax, arabic: 'مبلغ ضريبة القيمة المضافة' },
            { label: 'EXCISE DUTY AMOUNT', value: invoice.excise_duty_amount || 0, arabic: 'مبلغ ضريبة الاستهلاك' },
            { label: 'NET SALES', value: invoice.net_amount, arabic: 'صافي المبيعات', bold: true },
          ].map((row, idx) => (
            <View key={idx} style={styles.netDueRow}>
              <Text style={[styles.netDueLabel, row.bold && styles.bold]}>{row.label}</Text>
              <Text style={[styles.netDueValue, row.bold && styles.bold]}>
                {row.value >= 0 ? '+' : ''}{row.value.toFixed(2)}
              </Text>
              <Text style={[styles.netDueArabic, row.bold && styles.bold]}>{row.arabic}</Text>
            </View>
          ))}
        </View>

        {/* TC Charged */}
        <Text style={styles.tcCharged}>TC CHARGED : {invoice.net_amount.toFixed(2)}</Text>

        {/* Count & Payment Due */}
        <Text style={styles.countText}>count : {uniqueItems} + {totalQty}={uniqueItems + totalQty}</Text>
        <Text style={styles.paymentDue}>PAYMENT DUE DATE :{formatDate(invoice.payment_due_date)}</Text>

        {/* Signatures */}
        <View style={styles.signatures}>
          <Text style={styles.signatureText}>SALESMAN SIGNATURE__________</Text>
          <Text style={styles.signatureText}>CUSTOMER SIGNATURE__________</Text>
        </View>

        {/* DUPLICATE */}
        <Text style={styles.duplicate}>DUPLICATE</Text>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    width: 576, // 72mm at 203 DPI
    backgroundColor: '#FFFFFF',
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  logoBox: {
    width: 100,
    height: 80,
    borderWidth: 2,
    borderColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  companyInfo: {
    flex: 1,
    alignItems: 'flex-end',
    paddingLeft: 10,
  },
  companyText: {
    fontSize: 12,
    textAlign: 'right',
  },
  invoiceTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 10,
  },
  detailsRow: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  detailsLeft: {
    flex: 1,
  },
  detailsRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  detailText: {
    fontSize: 12,
    marginBottom: 2,
  },
  detailTextRight: {
    fontSize: 12,
    textAlign: 'right',
    marginBottom: 2,
  },
  salesHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
  },
  salesText: {
    fontSize: 22,
    fontWeight: 'bold',
    marginRight: 20,
  },
  salesTextArabic: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  table: {
    borderTopWidth: 1,
    borderTopColor: '#000',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F0F0F0',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#000',
  },
  tableHeaderCell: {
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: '#CCC',
  },
  tableCell: {
    fontSize: 11,
    textAlign: 'center',
  },
  totalRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderTopWidth: 2,
    borderTopColor: '#000',
    borderBottomWidth: 2,
    borderBottomColor: '#000',
    marginTop: 5,
  },
  totalCell: {
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  netDueSection: {
    marginTop: 15,
  },
  netDueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  netDueTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  netDueTitleArabic: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  netDueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  netDueLabel: {
    flex: 1.5,
    fontSize: 13,
  },
  netDueValue: {
    flex: 1,
    fontSize: 13,
    textAlign: 'center',
  },
  netDueArabic: {
    flex: 1.5,
    fontSize: 13,
    textAlign: 'right',
  },
  bold: {
    fontWeight: 'bold',
  },
  tcCharged: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 10,
  },
  countText: {
    fontSize: 12,
    marginBottom: 4,
  },
  paymentDue: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  signatures: {
    marginTop: 20,
    marginBottom: 10,
  },
  signatureText: {
    fontSize: 13,
    marginBottom: 8,
  },
  duplicate: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 15,
  },
});
