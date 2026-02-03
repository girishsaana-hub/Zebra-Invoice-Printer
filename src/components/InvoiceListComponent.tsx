import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
} from 'react-native';
import {Invoice} from '../types/Invoice';

interface InvoiceListProps {
  invoices: Invoice[];
  selectedInvoice: Invoice | null;
  onSelectInvoice: (invoice: Invoice) => void;
  onViewDetails: (invoice: Invoice) => void;
  isRefreshing?: boolean;
  onRefresh?: () => void;
}

const InvoiceListComponent: React.FC<InvoiceListProps> = ({
  invoices,
  selectedInvoice,
  onSelectInvoice,
  onViewDetails,
  isRefreshing = false,
  onRefresh,
}) => {
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (amount: number) => {
    return amount.toFixed(2);
  };

  const renderInvoice = ({item}: {item: Invoice}) => {
    const isSelected = selectedInvoice?.uid === item.uid;

    return (
      <TouchableOpacity
        style={[styles.invoiceCard, isSelected && styles.selectedCard]}
        onPress={() => onSelectInvoice(item)}
        onLongPress={() => onViewDetails(item)}>
        <View style={styles.invoiceHeader}>
          <Text style={styles.invoiceNumber}>{item.invoice_number}</Text>
          <Text style={styles.invoiceDate}>{formatDate(item.invoice_date)}</Text>
        </View>

        <View style={styles.invoiceDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Items:</Text>
            <Text style={styles.detailValue}>{item.line_count}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Amount:</Text>
            <Text style={styles.amountValue}>{formatCurrency(item.net_amount)}</Text>
          </View>
        </View>

        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusBadge,
              item.payment_status === 'PAID'
                ? styles.paidBadge
                : styles.pendingBadge,
            ]}>
            <Text style={styles.statusText}>
              {item.payment_status || 'PENDING'}
            </Text>
          </View>
          {isSelected && (
            <Text style={styles.selectedLabel}>✓ Selected for Print</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <FlatList
      data={invoices}
      renderItem={renderInvoice}
      keyExtractor={item => item.uid}
      contentContainerStyle={styles.listContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        ) : undefined
      }
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No invoices found</Text>
          <Text style={styles.emptySubtext}>
            Pull down to refresh or check database connection
          </Text>
        </View>
      }
    />
  );
};

const styles = StyleSheet.create({
  listContainer: {
    paddingBottom: 20,
  },
  invoiceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#E0E0E0',
  },
  selectedCard: {
    borderLeftColor: '#28A745',
    backgroundColor: '#F0FFF4',
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  invoiceNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  invoiceDate: {
    fontSize: 13,
    color: '#666',
  },
  invoiceDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 13,
    color: '#888',
    marginRight: 4,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  amountValue: {
    fontSize: 16,
    color: '#28A745',
    fontWeight: 'bold',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  paidBadge: {
    backgroundColor: '#D4EDDA',
  },
  pendingBadge: {
    backgroundColor: '#FFF3CD',
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#333',
  },
  selectedLabel: {
    fontSize: 12,
    color: '#28A745',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
  },
});

export default InvoiceListComponent;
