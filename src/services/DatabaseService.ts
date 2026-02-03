import {Invoice, InvoiceLine, Store, Organization, InvoiceWithDetails} from '../types/Invoice';
import {open, type DB} from '@op-engineering/op-sqlite';
import RNFS from 'react-native-fs';
import {Platform} from 'react-native';

/**
 * Database Service for connecting to the real SQLite database (11438.db)
 */
class DatabaseService {
  private database: DB | null = null;
  private isInitialized = false;

  /**
   * Initialize the database connection
   */
  async initDatabase(): Promise<void> {
    if (this.isInitialized && this.database) {
      return;
    }

    try {
      // Copy database from assets to document directory if needed
      const dbName = '11438.db';
      const destPath = `${RNFS.DocumentDirectoryPath}/${dbName}`;
      
      // Check if DB already exists in document directory
      const exists = await RNFS.exists(destPath);
      if (!exists) {
        console.log('Database not found in documents, attempting to copy from assets...');
        try {
          // Copy from assets (Android)
          // Note: The file must be located at android/app/src/main/assets/11438.db
          if (Platform.OS === 'android') {
            await RNFS.copyFileAssets(dbName, destPath);
          } else {
            await RNFS.copyFile(`${RNFS.MainBundlePath}/${dbName}`, destPath);
          }
          console.log('Database copied from assets to:', destPath);
        } catch (e) {
          console.error('Error copying database. Ensure 11438.db is in android/app/src/main/assets/', e);
          throw e;
        }
      }
      
      // Open the database
      this.database = open({
        name: dbName,
        location: RNFS.DocumentDirectoryPath,
      });
      
      this.isInitialized = true;
      console.log('Database connected successfully');

      // Health Check: Verify data exists immediately
      try {
        const check = await this.database.execute('SELECT count(*) as count FROM invoice');
        console.log(`✅ Database Verification: Found ${check.rows?.[0]?.count} invoices in the database.`);
      } catch (checkError) {
        console.error('❌ Database Verification Failed: Could not query invoice table.', checkError);
      }
    } catch (error) {
      console.error('Failed to connect to database:', error);
      throw error;
    }
  }

  /**
   * Get all invoices from the database
   */
  async getInvoices(limit: number = 50, offset: number = 0): Promise<Invoice[]> {
    await this.initDatabase();
    
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      const query = `
        SELECT 
          i.uid,
          i.invoice_number,
          i.invoice_date,
          i.delivered_date_time as delivery_date,
          i.invoice_type,
          i.store_uid,
          i.total_amount,
          i.total_discount,
          i.total_tax,
          i.net_amount,
          i.line_count,
          i.status,
          i.payment_status,
          i.notes,
          i.credit_days,
          i.emp_uid,
          i.job_position_uid,
          e.code as salesman_code,
          e.name as salesman_name,
          r.code as route_code,
          r.name as route_name
        FROM invoice i
        LEFT JOIN emp e ON i.emp_uid = e.uid
        LEFT JOIN route r ON i.job_position_uid = r.job_position_uid
        ORDER BY i.invoice_date DESC
        LIMIT ? OFFSET ?
      `;

      const result = await this.database.execute(query, [limit, offset]);
      const invoices: Invoice[] = [];

      if (result.rows && result.rows.length > 0) {
        for (let i = 0; i < result.rows.length; i++) {
          const row = result.rows[i];
          invoices.push(this.mapRowToInvoice(row));
        }
      }

      return invoices;
    } catch (error) {
      console.error('Failed to get invoices:', error);
      throw error;
    }
  }

  /**
   * Search invoices by invoice number
   */
  async searchInvoices(searchTerm: string): Promise<Invoice[]> {
    await this.initDatabase();
    
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      const query = `
        SELECT 
          i.uid,
          i.invoice_number,
          i.invoice_date,
          i.delivered_date_time as delivery_date,
          i.invoice_type,
          i.store_uid,
          i.total_amount,
          i.total_discount,
          i.total_tax,
          i.net_amount,
          i.line_count,
          i.status,
          i.payment_status,
          i.notes,
          i.credit_days,
          i.emp_uid,
          i.job_position_uid,
          e.code as salesman_code,
          e.name as salesman_name,
          e.phone as salesman_phone,
          r.code as route_code,
          r.name as route_name
        FROM invoice i
        LEFT JOIN emp e ON i.emp_uid = e.uid
        LEFT JOIN route r ON i.job_position_uid = r.job_position_uid
        WHERE i.invoice_number LIKE ?
        ORDER BY i.invoice_date DESC
      `;

      const result = await this.database.execute(query, [`%${searchTerm}%`]);
      const invoices: Invoice[] = [];

      if (result.rows && result.rows.length > 0) {
        for (let i = 0; i < result.rows.length; i++) {
          const row = result.rows[i];
          invoices.push(this.mapRowToInvoice(row));
        }
      }

      return invoices;
    } catch (error) {
      console.error('Failed to search invoices:', error);
      throw error;
    }
  }

  /**
   * Get full invoice details including lines, store and organization
   */
  async getInvoiceDetails(invoiceUid: string): Promise<InvoiceWithDetails | null> {
    await this.initDatabase();
    
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      // Get invoice with employee and route info
      const invoiceQuery = `
        SELECT 
          i.*,
          e.code as salesman_code,
          e.name as salesman_name,
          r.code as route_code,
          r.name as route_name
        FROM invoice i
        LEFT JOIN emp e ON i.emp_uid = e.uid
        LEFT JOIN route r ON i.job_position_uid = r.job_position_uid
        WHERE i.uid = ?
      `;

      const invoiceResult = await this.database.execute(invoiceQuery, [invoiceUid]);
      
      if (!invoiceResult.rows || invoiceResult.rows.length === 0) {
        return null;
      }

      const invoiceRow = invoiceResult.rows[0];
      const invoice = this.mapRowToInvoice(invoiceRow);

      // Get store information
      const storeQuery = `
        SELECT uid, code, name, legal_name, tax_doc_number, arabic_name
        FROM store
        WHERE uid = ?
      `;
      const storeResult = await this.database.execute(storeQuery, [invoiceRow.store_uid]);
      let store: Store | null = null;
      
      if (storeResult.rows && storeResult.rows.length > 0) {
        const storeRow = storeResult.rows[0];
        store = {
          uid: storeRow.uid as string,
          code: (storeRow.code as string) || '',
          name: (storeRow.name as string) || '',
          legal_name: (storeRow.legal_name as string) || '',
          tax_doc_number: (storeRow.tax_doc_number as string) || '',
          phone: '',
          location: (storeRow.arabic_name as string) || '',
        };
      }

      // Get organization information
      const orgQuery = `
        SELECT uid, code, name
        FROM org
        WHERE uid = ?
      `;
      const orgResult = await this.database.execute(orgQuery, [invoiceRow.org_uid || 'CHOITHRAM']);
      let organization: Organization | null = null;
      
      if (orgResult.rows && orgResult.rows.length > 0) {
        const orgRow = orgResult.rows[0];
        organization = {
          uid: orgRow.uid as string,
          code: (orgRow.code as string) || '',
          name: (orgRow.name as string) || '',
          name_arabic: '',
          vat_reg_number: '100057393900003',
          division: 'RAINBOW DIV-OOH',
          po_box: '5249',
          city: 'DUBAI',
          country: 'UAE',
          phone: '04-2979991',
          fax: '04-2662931',
          email: 'RAINBOW@CHOITHRAMS.COM',
        };
      } else {
        organization = {
          uid: 'CHOITHRAM',
          code: 'CHOITHRAM',
          name: 'CHOITHRAM',
          name_arabic: '',
          vat_reg_number: '100057393900003',
          division: 'RAINBOW DIV-OOH',
          po_box: '5249',
          city: 'DUBAI',
          country: 'UAE',
          phone: '04-2979991',
          fax: '04-2662931',
          email: 'RAINBOW@CHOITHRAMS.COM',
        };
      }

      // Get invoice lines with SKU details
      const linesQuery = `
        SELECT 
          il.uid,
          il.invoice_uid,
          il.line_number,
          il.sku_uid,
          il.item_code,
          il.uom,
          il.qty,
          il.unit_price,
          il.total_amount,
          il.total_discount,
          il.total_tax,
          il.net_amount,
          s.name as sku_name,
          s.code as sku_code
        FROM invoice_line il
        LEFT JOIN sku s ON il.sku_uid = s.uid OR il.item_code = s.code
        WHERE il.invoice_uid = ?
        ORDER BY il.line_number
      `;

      const linesResult = await this.database.execute(linesQuery, [invoiceUid]);
      const lines: InvoiceLine[] = [];

      if (linesResult.rows && linesResult.rows.length > 0) {
        for (let i = 0; i < linesResult.rows.length; i++) {
          const lineRow = linesResult.rows[i];
          lines.push({
            uid: lineRow.uid as string,
            invoice_uid: lineRow.invoice_uid as string,
            line_number: (lineRow.line_number as number) || i + 1,
            sku_uid: (lineRow.sku_uid as string) || '',
            item_code: (lineRow.item_code as string) || '',
            sku_name: (lineRow.sku_name as string) || (lineRow.item_code as string) || '',
            upc_code: '',
            uom: (lineRow.uom as string) || 'EA',
            qty: (lineRow.qty as number) || 0,
            unit_price: (lineRow.unit_price as number) || 0,
            total_amount: (lineRow.total_amount as number) || 0,
            total_discount: (lineRow.total_discount as number) || 0,
            total_tax: (lineRow.total_tax as number) || 0,
            tax_percentage: (lineRow.total_tax as number) > 0 ? 5 : 0,
            net_amount: (lineRow.net_amount as number) || 0,
            excise_duty: 0,
          });
        }
      }

      return {
        ...invoice,
        store,
        lines,
        organization,
      };
    } catch (error) {
      console.error('Failed to get invoice details:', error);
      throw error;
    }
  }

  /**
   * Map database row to Invoice object
   */
  private mapRowToInvoice(row: any): Invoice {
    let deliveryTime = '';
    if (row.invoice_date) {
      try {
        const date = new Date(row.invoice_date as string);
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        deliveryTime = `${hours}:${minutes}`;
      } catch (_e) {
        deliveryTime = '';
      }
    }

    let paymentDueDate = row.invoice_date;
    if (row.credit_days && row.invoice_date) {
      try {
        const date = new Date(row.invoice_date as string);
        date.setDate(date.getDate() + ((row.credit_days as number) || 30));
        paymentDueDate = date.toISOString().split('T')[0];
      } catch {
        paymentDueDate = row.invoice_date;
      }
    }

    return {
      uid: row.uid as string,
      invoice_number: (row.invoice_number as string) || '',
      invoice_date: (row.invoice_date as string) || '',
      delivery_date: (row.delivery_date as string) || (row.invoice_date as string) || '',
      delivery_time: deliveryTime,
      store_uid: (row.store_uid as string) || '',
      total_amount: (row.total_amount as number) || 0,
      total_discount: (row.total_discount as number) || 0,
      total_tax: (row.total_tax as number) || 0,
      net_amount: (row.net_amount as number) || 0,
      line_count: (row.line_count as number) || 0,
      status: (row.status as string) || 'COMPLETED',
      payment_status: (row.payment_status as string) || 'PENDING',
      payment_due_date: paymentDueDate as string,
      notes: (row.notes as string) || '',
      invoice_type: (row.invoice_type as string) || 'Invoice',
      salesman_code: (row.salesman_code as string) || (row.emp_uid as string) || '',
      salesman_name: (row.salesman_name as string) || '',
      salesman_phone: '',
      route_code: (row.route_code as string) || '',
      route_name: (row.route_name as string) || '',
      good_returns: 0,
      damaged_returns: 0,
      excise_duty_amount: 0,
      appearance: 'default',
    };
  }

  /**
   * Close the database connection
   */
  closeDatabase(): void {
    if (this.database) {
      try {
        this.database.close();
        console.log('Database closed');
        this.database = null;
        this.isInitialized = false;
      } catch (error) {
        console.error('Failed to close database:', error);
      }
    }
  }
}

export default new DatabaseService();
