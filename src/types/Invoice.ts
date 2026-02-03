export interface Invoice {
  uid: string;
  invoice_number: string;
  invoice_date: string;
  delivery_date: string;
  delivery_time: string;
  store_uid: string;
  total_amount: number;
  total_discount: number;
  total_tax: number;
  net_amount: number;
  line_count: number;
  status: string;
  payment_status: string;
  payment_due_date: string;
  notes: string;
  invoice_type: string; // CREDIT, CASH, etc.
  salesman_code: string;
  salesman_name: string;
  salesman_phone?: string;
  route_code: string;
  route_name: string;
  good_returns: number;
  damaged_returns: number;
  excise_duty_amount: number;
  appearance?: string;
}

export interface InvoiceLine {
  uid: string;
  invoice_uid: string;
  line_number: number;
  sku_uid: string;
  item_code: string;
  sku_name: string;
  upc_code: string; // Barcode/UPC
  uom: string;
  qty: number;
  unit_price: number;
  total_amount: number;
  total_discount: number;
  total_tax: number;
  tax_percentage: number;
  net_amount: number;
  excise_duty: number;
}

export interface Store {
  uid: string;
  code: string;
  name: string;
  legal_name: string;
  tax_doc_number: string;
  phone: string;
  location: string;
}

export interface Organization {
  uid: string;
  code: string;
  name: string;
  name_arabic: string;
  vat_reg_number: string;
  division: string;
  po_box: string;
  city: string;
  country: string;
  phone: string;
  fax: string;
  email: string;
}

export interface InvoiceWithDetails extends Invoice {
  store: Store | null;
  lines: InvoiceLine[];
  organization: Organization | null;
}
