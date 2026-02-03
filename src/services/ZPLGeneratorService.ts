import { InvoiceWithDetails, InvoiceLine } from '../types/Invoice';

/**
 * ZPL Invoice Generator - Zebra ZQ520
 * Matches original format.jpeg layout exactly
 * 
 * ZQ520: 4-inch (104mm) printable width = 832 dots at 203 DPI
 * 
 * Arabic text: Using ^A@N for bold TrueType font rendering
 * Text alignment: Using ^FB (Field Block) for proper alignment
 */
class ZPLGeneratorService {
  private width = 832;  // 4 inch at 203 DPI
  private margin = 15;

  generateInvoiceZPL(invoice: InvoiceWithDetails): string {
    // Calculate label height based on content
    const lineItemHeight = 110;
    const baseHeight = 1500;
    const labelHeight = baseHeight + (invoice.lines.length * lineItemHeight);

    let zpl = '';
    
    // Start label with Arabic font setup
    zpl += '^XA\n';
    zpl += '^MMT\n';                           // Tear-off mode
    zpl += `^PW${this.width}\n`;              // Print width
    zpl += `^LL${labelHeight}\n`;             // Label length
    zpl += '^CI28\n';                         // UTF-8 encoding
    zpl += '^CWZ,E:TT0003M_.TTF\n';           // Arabic TrueType font

    let y = 20;

    // ===== COMPANY HEADER =====
    // Logo placeholder (left side)
    zpl += `^FO${this.margin},${y}^GB100,85,2^FS\n`;
    zpl += `^FO${this.margin + 25},${y + 32}^A0N,20,20^FDLOGO^FS\n`;
    
    // Company info (right aligned)
    const companyX = 380;
    const companyWidth = this.width - companyX - this.margin;
    zpl += `^FO${companyX},${y}^A0N,18,18^FB${companyWidth},1,0,R^FDVAT REG.NO.: 100057393900003^FS\n`;
    y += 22;
    zpl += `^FO${companyX},${y}^A0N,18,18^FB${companyWidth},1,0,R^FDRAINBOW DIV-OOH^FS\n`;
    y += 22;
    zpl += `^FO${companyX},${y}^A0N,18,18^FB${companyWidth},1,0,R^FDPO BOX:5249-DUBAI-UAE^FS\n`;
    y += 22;
    zpl += `^FO${companyX},${y}^A0N,18,18^FB${companyWidth},1,0,R^FDTEL:04-2979991 FAX:04-2662931^FS\n`;
    y += 22;
    zpl += `^FO${companyX},${y}^A0N,18,18^FB${companyWidth},1,0,R^FDEMAIL:RAINBOW@CHOITHRAMS.COM^FS\n`;
    
    y = 150;

    // ===== INVOICE TITLE =====
    zpl += `^FO0,${y}^A0N,42,42^FB${this.width},1,0,C^FDINVOICE^FS\n`;
    y += 60;

    // ===== INVOICE DETAILS - TWO COLUMNS =====
    const leftX = this.margin;
    const rightColX = 420;  // Right column starts here
    const rightColWidth = this.width - rightColX - this.margin;
    const startY = y;

    // Left column - Customer info
    zpl += `^FO${leftX},${y}^A0N,20,20^FDSALESMAN: ${this.truncate((invoice.salesman_code || '') + ' - ' + (invoice.salesman_name || ''), 38)}^FS\n`;
    y += 28;
    zpl += `^FO${leftX},${y}^A0N,20,20^FDRoute  : ${this.truncate((invoice.route_code || '') + ' - ' + (invoice.route_name || ''), 38)}^FS\n`;
    y += 28;
    zpl += `^FO${leftX},${y}^A0N,20,20^FDCUST   : ${invoice.store?.code || ''}^FS\n`;
    y += 28;
    zpl += `^FO${leftX},${y}^A0N,20,20^FD${this.truncate(invoice.store?.name || '', 35)}^FS\n`;
    y += 28;
    zpl += `^FO${leftX},${y}^A0N,20,20^FD${this.truncate(invoice.store?.location || '', 35)}^FS\n`;
    y += 28;
    zpl += `^FO${leftX},${y}^A0N,20,20^FDCUST VAT : ${invoice.store?.tax_doc_number || 'N/A'}^FS\n`;
    y += 28;
    zpl += `^FO${leftX},${y}^A0N,20,20^FDCUST TEL : ${invoice.store?.phone || ''}^FS\n`;

    // Right column - Invoice info (RIGHT ALIGNED)
    y = startY;
    zpl += `^FO${rightColX},${y}^A0N,20,20^FB${rightColWidth},1,0,R^FDINVOICE NO  :${invoice.invoice_number}^FS\n`;
    y += 28;
    zpl += `^FO${rightColX},${y}^A0N,20,20^FB${rightColWidth},1,0,R^FDINVOICE TYPE :${invoice.invoice_type || 'CREDIT'}^FS\n`;
    y += 28;
    zpl += `^FO${rightColX},${y}^A0N,20,20^FB${rightColWidth},1,0,R^FDINVOICE DATE :${this.formatDate(invoice.invoice_date)}^FS\n`;
    y += 28;
    zpl += `^FO${rightColX},${y}^A0N,20,20^FB${rightColWidth},1,0,R^FDDELIVERY DATE:${this.formatDate(invoice.delivery_date || invoice.invoice_date)}^FS\n`;
    y += 28;
    zpl += `^FO${rightColX},${y}^A0N,20,20^FB${rightColWidth},1,0,R^FDTIME        :${invoice.delivery_time || ''}^FS\n`;

    y = startY + 200;

    // ===== SALES HEADER (bilingual) =====
    zpl += `^FO${this.margin},${y}^A0N,28,28^FB${this.width - 250},1,0,C^FDSALES^FS\n`;
    // Arabic BOLD - right aligned
    zpl += `^FO${this.margin},${y}^AZN,28,28^FB${this.width - 2 * this.margin},1,0,R^FDالمبيعات^FS\n`;
    y += 42;

    // ===== DASHED LINE =====
    zpl += this.dashedLine(y);
    y += 25;

    // ===== TABLE HEADERS =====
    // Column positions for 832px width
    const cItem = this.margin;      // ITEM/DESCRIPTION
    const cUPC = 160;               // UPC  
    const cQty = 280;               // QTY
    const cPrice = 360;             // PRICE
    const cDisc = 450;              // DISC/REBATE
    const cVAT = 560;               // VAT AMOUNT
    const cAmt = 720;               // AMOUNT
    const colAmtWidth = this.width - cAmt - this.margin;

    // English headers (first row)
    zpl += `^FO${cItem},${y}^A0N,18,18^FDITEM/DESCRIPTION^FS\n`;
    zpl += `^FO${cUPC},${y}^A0N,18,18^FB100,1,0,C^FDUPC^FS\n`;
    zpl += `^FO${cQty},${y}^A0N,18,18^FDQTY^FS\n`;
    zpl += `^FO${cPrice},${y}^A0N,18,18^FDPRICE^FS\n`;
    zpl += `^FO${cDisc},${y}^A0N,18,18^FDDISC/REBATE^FS\n`;
    zpl += `^FO${cVAT},${y}^A0N,18,18^FB140,1,0,C^FDVAT AMOUNT^FS\n`;
    zpl += `^FO${cAmt},${y}^A0N,18,18^FB${colAmtWidth},1,0,R^FDAMOUNT^FS\n`;
    
    // Arabic headers (second row) - BOLD, with UPC and VAT CENTER aligned
    y += 24;
    zpl += `^FO${cItem},${y}^AZN,16,16^FB140,1,0,L^FDبند/وصف^FS\n`;
    zpl += `^FO${cUPC},${y}^AZN,16,16^FB100,1,0,C^FDرمز المنتج العالمي^FS\n`;  // CENTER
    zpl += `^FO${cQty},${y}^AZN,16,16^FB70,1,0,L^FDالكمية^FS\n`;
    zpl += `^FO${cPrice},${y}^AZN,16,16^FB80,1,0,L^FDالسعر^FS\n`;
    zpl += `^FO${cDisc},${y}^AZN,16,16^FB100,1,0,L^FDالخصم/الحسم^FS\n`;
    zpl += `^FO${cVAT},${y}^AZN,16,16^FB140,1,0,C^FDمبلغ ضريبة القيمة المضافة^FS\n`;  // CENTER
    zpl += `^FO${cAmt},${y}^AZN,16,16^FB${colAmtWidth},1,0,R^FDالمبلغ^FS\n`;
    y += 26;

    // Dashed line after header
    zpl += this.dashedLine(y);
    y += 22;

    // ===== LINE ITEMS =====
    for (const line of invoice.lines) {
      // Row 1: Item code, qty, uom, price, disc, vat, amount
      zpl += `^FO${cItem},${y}^A0N,20,20^FD${line.item_code}^FS\n`;
      zpl += `^FO${cQty},${y}^A0N,20,20^FD${line.qty}^FS\n`;
      zpl += `^FO${cQty + 40},${y}^A0N,20,20^FD${line.uom || 'EA'}^FS\n`;
      zpl += `^FO${cPrice},${y}^A0N,20,20^FD${line.unit_price.toFixed(2)}^FS\n`;
      zpl += `^FO${cDisc},${y}^A0N,20,20^FD${line.total_discount.toFixed(2)}^FS\n`;
      zpl += `^FO${cVAT},${y}^A0N,18,18^FB140,1,0,C^FD+${line.total_tax.toFixed(2)}(${line.tax_percentage || 5}%)^FS\n`;
      zpl += `^FO${cAmt},${y}^A0N,20,20^FB${colAmtWidth},1,0,R^FD${line.net_amount.toFixed(2)}^FS\n`;
      
      // Row 2: SKU description
      y += 26;
      zpl += `^FO${cItem},${y}^A0N,18,18^FD${this.truncate(line.sku_name, 65)}^FS\n`;
      
      // Row 3: UPC code and Arabic label (بند/وصف)
      y += 24;
      zpl += `^FO${cItem},${y}^A0N,18,18^FD${line.upc_code || ''}^FS\n`;
      zpl += `^FO${cUPC + 70},${y}^AZN,16,16^FB100,1,0,L^FDبند/وصف^FS\n`;
      
      // Row 4: Excise duty
      y += 24;
      zpl += `^FO${cItem},${y}^A0N,18,18^FDExcise Duty : ${(line.excise_duty || 0).toFixed(2)}^FS\n`;
      
      y += 30; // Space between line items
    }

    // ===== EQUALS LINE (double line) =====
    zpl += this.equalLine(y);
    y += 30;

    // ===== TOTAL ROW =====
    const totalQty = invoice.lines.reduce((s, l) => s + l.qty, 0);
    zpl += `^FO${cItem},${y}^A0N,24,24^FDTOTAL^FS\n`;
    zpl += `^FO${cQty},${y}^A0N,24,24^FD${totalQty}^FS\n`;
    zpl += `^FO${cDisc},${y}^A0N,24,24^FD${invoice.total_discount.toFixed(2)}^FS\n`;
    zpl += `^FO${cVAT},${y}^A0N,24,24^FB140,1,0,C^FD+${invoice.total_tax.toFixed(2)}^FS\n`;
    zpl += `^FO${cAmt},${y}^A0N,24,24^FB${colAmtWidth},1,0,R^FD${invoice.net_amount.toFixed(2)}^FS\n`;
    y += 55;

    // ===== NET DUE SECTION =====
    const sales = invoice.net_amount + invoice.total_discount - invoice.total_tax;
    
    // Header row - English left, Arabic BOLD right aligned
    zpl += `^FO${this.margin},${y}^A0N,22,22^FDNET DUE THIS INVOICE^FS\n`;
    zpl += `^FO${this.margin},${y}^AZN,20,20^FB${this.width - 2 * this.margin},1,0,R^FDصافي مستحق الفاتورة^FS\n`;
    y += 38;

    // Net due rows - English left, Value middle, Arabic BOLD right
    const valX = 280;
    const valWidth = 120;
    
    const netRows = [
      { en: 'SALES', ar: 'المبيعات', val: sales },
      { en: 'DISCOUNT', ar: 'الخصم', val: -invoice.total_discount },
      { en: 'GOOD RETURNS', ar: 'البضائع المرتجعة', val: invoice.good_returns || 0 },
      { en: 'DAMAGED RETURNS', ar: 'بضاعة معدومة مرتجعة', val: invoice.damaged_returns || 0 },
      { en: 'VAT AMOUNT', ar: 'مبلغ ضريبة القيمة المضافة', val: invoice.total_tax },
      { en: 'EXCISE DUTY AMOUNT', ar: 'مبلغ ضريبة الاستهلاك', val: invoice.excise_duty_amount || 0 },
      { en: 'NET SALES', ar: 'صافي المبيعات', val: invoice.net_amount }
    ];

    for (const row of netRows) {
      const sign = row.val >= 0 ? '+' : '';
      zpl += `^FO${this.margin},${y}^A0N,20,20^FD${row.en}^FS\n`;
      zpl += `^FO${valX},${y}^A0N,20,20^FB${valWidth},1,0,R^FD${sign}${row.val.toFixed(2)}^FS\n`;
      // Arabic BOLD - right aligned
      zpl += `^FO${this.margin},${y}^AZN,18,18^FB${this.width - 2 * this.margin},1,0,R^FD${row.ar}^FS\n`;
      y += 30;
    }

    // ===== TC CHARGED =====
    y += 12;
    zpl += `^FO${this.margin},${y}^A0N,22,22^FDTC CHARGED :^FS\n`;
    zpl += `^FO${valX},${y}^A0N,22,22^FB${valWidth},1,0,R^FD+${invoice.net_amount.toFixed(2)}^FS\n`;
    y += 12;
    zpl += `^FO${valX},${y}^GB${valWidth},1,1^FS\n`; // Underline
    y += 24;

    // ===== COUNT =====
    const unique = invoice.lines.length;
    const sumQty = invoice.lines.reduce((s, l) => s + l.qty, 0);
    zpl += this.dashedLine(y);
    y += 24;
    zpl += `^FO${this.margin},${y}^A0N,20,20^FD  count : ${unique} + ${sumQty}=${unique + sumQty}^FS\n`;
    y += 30;

    // ===== PAYMENT DUE DATE =====
    zpl += `^FO${this.margin},${y}^A0N,22,22^FDPAYMENT DUE DATE :${this.formatDate(invoice.payment_due_date)}^FS\n`;
    y += 32;
    zpl += this.dashedLine(y);
    y += 50;

    // ===== SIGNATURES =====
    zpl += `^FO${this.width - 320},${y}^A0N,20,20^FDSALESMAN SIGNATURE__________^FS\n`;
    y += 45;
    zpl += `^FO${this.margin},${y}^A0N,20,20^FDCUSTOMER SIGNATURE__________^FS\n`;
    y += 60;

    // ===== DUPLICATE =====
    zpl += `^FO0,${y}^A0N,28,28^FB${this.width},1,0,C^FDDUPLICATE^FS\n`;

    // End label
    zpl += '^XZ\n';
    
    return zpl;
  }

  // ===== HELPERS =====
  private dashedLine(y: number): string {
    const dashCount = Math.floor((this.width - 2 * this.margin) / 8);
    let line = '';
    for (let i = 0; i < dashCount; i++) {
      line += '- ';
    }
    return `^FO${this.margin},${y}^A0N,14,14^FD${line}^FS\n`;
  }

  private equalLine(y: number): string {
    const lineWidth = this.width - 2 * this.margin;
    let zpl = '';
    zpl += `^FO${this.margin},${y}^GB${lineWidth},2,2^FS\n`;
    zpl += `^FO${this.margin},${y + 6}^GB${lineWidth},2,2^FS\n`;
    return zpl;
  }

  private truncate(text: string, max: number): string {
    if (!text) return '';
    return text.length > max ? text.substring(0, max - 3) + '...' : text;
  }

  private formatDate(d: string): string {
    if (!d) return '';
    const dt = new Date(d);
    return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${String(dt.getFullYear()).slice(-2)}`;
  }
}

export default new ZPLGeneratorService();