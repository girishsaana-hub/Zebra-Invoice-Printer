import { InvoiceWithDetails, InvoiceLine } from '../types/Invoice';

/**
 * ZPL Invoice Generator
 * Zebra ZQ520 – 203 DPI – 4 inch width (812 dots)
 * Optimized for Arabic printing using UTF-8 encoding
 */
class ZPLGeneratorService {
  // ZQ520: 203 DPI, 4" paper = 4 * 203 = 812 dots
  private labelWidth = 812;
  private margin = 15;

  generateInvoiceZPL(invoice: InvoiceWithDetails): string {
    let zpl = '';

    const baseHeight = 1300;
    const lineItemHeight = 100;
    const totalHeight = baseHeight + invoice.lines.length * lineItemHeight;

    zpl += '^XA\n';
    zpl += '^MMT\n';
    zpl += '^LS0\n';
    zpl += `^PW${this.labelWidth}\n`;
    zpl += `^LL${totalHeight}\n`;
    
    // UTF-8 encoding for multi-language support
    zpl += '^CI28\n';
    
    let yPos = this.margin;

    // Company Header
    zpl += this.generateCompanyHeader(yPos);
    yPos = 110;

    // INVOICE Title
    zpl += this.centerText('INVOICE', yPos, 32, 32);
    yPos += 40;

    // Invoice Details - Two columns
    zpl += this.generateInvoiceDetails(invoice, yPos);
    yPos += 200;

    // SALES header
    zpl += `^FO200,${yPos}^A0N,28,28^FDSALES^FS\n`;
    zpl += `^FO420,${yPos}^A0N,28,28^FDالمبيعات^FS\n`;
    yPos += 35;

    // Dashed Line
    zpl += this.dashedLine(yPos);
    yPos += 20;

    // Table Header
    zpl += this.generateTableHeader(yPos);
    yPos += 40;

    // Dashed Line
    zpl += this.dashedLine(yPos);
    yPos += 15;

    // Line Items
    for (const line of invoice.lines) {
      zpl += this.generateLineItem(line, yPos);
      yPos += 90;
    }

    // Double line
    zpl += this.equalLine(yPos);
    yPos += 20;

    // Total Row
    zpl += this.generateTotalsRow(invoice, yPos);
    yPos += 40;

    // NET DUE Section
    zpl += this.generateNetDueSection(invoice, yPos);
    yPos += 260;

    // TC CHARGED (no + sign as per original)
    zpl += `^FO${this.margin},${yPos}^A0N,22,22^FDTC CHARGED : ${invoice.net_amount.toFixed(2)}^FS\n`;
    yPos += 35;

    // Long Dashed Line
    zpl += this.longDashedLine(yPos);
    yPos += 20;

    // Count
    const uniqueItems = invoice.lines.length;
    const totalQty = invoice.lines.reduce((sum, line) => sum + line.qty, 0);
    zpl += `^FO${this.margin},${yPos}^A0N,18,18^FDcount : ${uniqueItems} + ${totalQty}=${uniqueItems + totalQty}^FS\n`;
    yPos += 25;
    
    zpl += `^FO${this.margin},${yPos}^A0N,20,20^FDPAYMENT DUE DATE :${this.formatDateShort(invoice.payment_due_date)}^FS\n`;
    yPos += 30;

    // Long Dashed Line
    zpl += this.longDashedLine(yPos);
    yPos += 30;

    // Signatures
    zpl += this.generateSignatureSection(yPos);
    yPos += 70;

    // DUPLICATE centered
    zpl += this.centerText('DUPLICATE', yPos, 24, 24);

    zpl += '^XZ\n';
    return zpl;
  }

  // ================= COMPANY HEADER =================
  private generateCompanyHeader(y: number): string {
    let zpl = '';

    // Logo placeholder - left side
    zpl += `^FO${this.margin},${y}^GB100,80,2^FS\n`;
    zpl += `^FO${this.margin + 30},${y + 30}^A0N,18,18^FDLOGO^FS\n`;

    // Company info - right aligned
    const rightX = 480;
    zpl += `^FO${rightX},${y}^A0N,16,16^FB320,1,0,R^FDVAT REG.NO.: 100057393900003^FS\n`;
    zpl += `^FO${rightX},${y + 20}^A0N,16,16^FB320,1,0,R^FDRAINBOW DIV-OOH^FS\n`;
    zpl += `^FO${rightX},${y + 40}^A0N,16,16^FB320,1,0,R^FDPO BOX:5249-DUBAI-UAE^FS\n`;
    zpl += `^FO${rightX},${y + 60}^A0N,16,16^FB320,1,0,R^FDTEL:04-2979991 FAX:04-2662931^FS\n`;
    zpl += `^FO${rightX},${y + 80}^A0N,16,16^FB320,1,0,R^FDEMAIL:RAINBOW@CHOITHRAMS.COM^FS\n`;

    return zpl;
  }

  // ================= INVOICE DETAILS =================
  private generateInvoiceDetails(invoice: InvoiceWithDetails, y: number): string {
    const leftX = this.margin;
    let zpl = '';

    // Left column
    zpl += `^FO${leftX},${y}^A0N,17,17^FDSALESMAN: ${invoice.salesman_code || ''} - ${invoice.salesman_name || ''} - ${invoice.salesman_phone || ''}^FS\n`;
    y += 24;
    zpl += `^FO${leftX},${y}^A0N,17,17^FDRoute  : ${invoice.route_code || ''} - ${invoice.route_name || ''}^FS\n`;
    y += 24;
    zpl += `^FO${leftX},${y}^A0N,17,17^FDCUST   : ${invoice.store?.code || ''}^FS\n`;
    y += 24;
    zpl += `^FO${leftX},${y}^A0N,17,17^FD${invoice.store?.name || ''}^FS\n`;
    y += 24;
    zpl += `^FO${leftX},${y}^A0N,17,17^FD${invoice.store?.location || ''}^FS\n`;
    y += 24;
    zpl += `^FO${leftX},${y}^A0N,17,17^FDCUST VAT : ${invoice.store?.tax_doc_number || 'N/A'}^FS\n`;
    y += 24;
    zpl += `^FO${leftX},${y}^A0N,17,17^FDCUST TEL : ${invoice.store?.phone || ''}^FS\n`;

    // Right column
    y = y - 120;
    const rightX = 520;
    zpl += `^FO${rightX},${y}^A0N,17,17^FB280,1,0,R^FDINVOICE NO  :${invoice.invoice_number}^FS\n`;
    y += 24;
    zpl += `^FO${rightX},${y}^A0N,17,17^FB280,1,0,R^FDINVOICE TYPE :${invoice.invoice_type || 'CREDIT'}^FS\n`;
    y += 24;
    zpl += `^FO${rightX},${y}^A0N,17,17^FB280,1,0,R^FDINVOICE DATE :${this.formatDateShort(invoice.invoice_date)}^FS\n`;
    y += 24;
    zpl += `^FO${rightX},${y}^A0N,17,17^FB280,1,0,R^FDDELIVERY DATE:${this.formatDateShort(invoice.delivery_date || invoice.invoice_date)}^FS\n`;
    y += 24;
    zpl += `^FO${rightX},${y}^A0N,17,17^FB280,1,0,R^FDTIME        :${invoice.delivery_time || ''}^FS\n`;

    return zpl;
  }

  // ================= TABLE HEADER =================
  private generateTableHeader(y: number): string {
    let zpl = '';

    // English headers
    zpl += `^FO15,${y}^A0N,15,15^FDITEM/DESCRIPTION^FS\n`;
    zpl += `^FO210,${y}^A0N,15,15^FDUPC^FS\n`;
    zpl += `^FO280,${y}^A0N,15,15^FDQTY^FS\n`;
    zpl += `^FO340,${y}^A0N,15,15^FDPRICE^FS\n`;
    zpl += `^FO420,${y}^A0N,15,15^FDDISC/REBATE^FS\n`;
    zpl += `^FO540,${y}^A0N,15,15^FDVAT AMOUNT^FS\n`;
    zpl += `^FO700,${y}^A0N,15,15^FDAMOUNT^FS\n`;

    // Arabic headers
    y += 20;
    zpl += `^FO15,${y}^A0N,13,13^FDبند/وصف^FS\n`;
    zpl += `^FO210,${y}^A0N,13,13^FDرمز المنتج^FS\n`;
    zpl += `^FO280,${y}^A0N,13,13^FDالكمية^FS\n`;
    zpl += `^FO340,${y}^A0N,13,13^FDالسعر^FS\n`;
    zpl += `^FO420,${y}^A0N,13,13^FDالخصم/الحسم^FS\n`;
    zpl += `^FO540,${y}^A0N,13,13^FDمبلغ الضريبة^FS\n`;
    zpl += `^FO700,${y}^A0N,13,13^FDالمبلغ^FS\n`;

    return zpl;
  }

  // ================= LINE ITEM =================
  private generateLineItem(line: InvoiceLine, y: number): string {
    let zpl = '';
    
    // Row 1
    zpl += `^FO15,${y}^A0N,16,16^FD${line.item_code}^FS\n`;
    zpl += `^FO210,${y}^A0N,16,16^FD${line.upc_code || ''}^FS\n`;
    zpl += `^FO280,${y}^A0N,16,16^FD${line.qty}^FS\n`;
    zpl += `^FO310,${y}^A0N,16,16^FD${line.uom}^FS\n`;
    zpl += `^FO340,${y}^A0N,16,16^FD${line.unit_price.toFixed(2)}^FS\n`;
    zpl += `^FO440,${y}^A0N,16,16^FD${line.total_discount.toFixed(2)}^FS\n`;
    zpl += `^FO550,${y}^A0N,14,14^FD+${line.total_tax.toFixed(2)}(${line.tax_percentage || 5}%)^FS\n`;
    zpl += `^FO700,${y}^A0N,16,16^FB100,1,0,R^FD${line.net_amount.toFixed(2)}^FS\n`;

    // Row 2: SKU Name
    y += 18;
    zpl += `^FO15,${y}^A0N,14,14^FD${this.truncateText(line.sku_name, 40)}^FS\n`;

    // Row 3: Arabic placeholder
    y += 16;
    zpl += `^FO15,${y}^A0N,12,12^FDبند/وصف^FS\n`;

    // Row 4: Excise Duty
    y += 18;
    zpl += `^FO15,${y}^A0N,12,12^FDExcise Duty : ${(line.excise_duty || 0).toFixed(2)}^FS\n`;

    return zpl;
  }

  // ================= TOTAL =================
  private generateTotalsRow(invoice: InvoiceWithDetails, y: number): string {
    const totalQty = invoice.lines.reduce((sum, line) => sum + line.qty, 0);
    let zpl = '';
    zpl += `^FO15,${y}^A0N,22,22^FDTOTAL^FS\n`;
    zpl += `^FO280,${y}^A0N,22,22^FD${totalQty}^FS\n`;
    zpl += `^FO440,${y}^A0N,22,22^FD${invoice.total_discount.toFixed(2)}^FS\n`;
    zpl += `^FO550,${y}^A0N,22,22^FD+${invoice.total_tax.toFixed(2)}^FS\n`;
    zpl += `^FO700,${y}^A0N,22,22^FB100,1,0,R^FD${invoice.net_amount.toFixed(2)}^FS\n`;
    return zpl;
  }

  // ================= NET DUE =================
  private generateNetDueSection(invoice: InvoiceWithDetails, y: number): string {
    // Calculate sales
    const sales = invoice.net_amount + invoice.total_discount - invoice.total_tax;
    
    const rows = [
      { label: 'SALES', value: sales, arabic: 'المبيعات' },
      { label: 'DISCOUNT', value: -invoice.total_discount, arabic: 'القرص' },
      { label: 'GOOD RETURNS', value: invoice.good_returns || 0, arabic: 'البضائع المرتجعة' },
      { label: 'DAMAGED RETURNS', value: invoice.damaged_returns || 0, arabic: 'بضاعة معدومة مرتجعة' },
      { label: 'VAT AMOUNT', value: invoice.total_tax, arabic: 'مبلغ ضريبة القيمة المضافة' },
      { label: 'EXCISE DUTY AMOUNT', value: invoice.excise_duty_amount || 0, arabic: 'مبلغ ضريبة الاستهلاك' },
      { label: 'NET SALES', value: invoice.net_amount, arabic: 'صافي المبيعات' }
    ];

    let zpl = '';
    // Section header
    zpl += `^FO${this.margin},${y}^A0N,20,20^FDNET DUE THIS INVOICE^FS\n`;
    zpl += `^FO550,${y}^A0N,20,20^FB240,1,0,R^FDصافي مستحق الفاتورة^FS\n`;
    y += 28;

    for (const r of rows) {
      const sign = r.value >= 0 ? '+' : '';
      zpl += `^FO${this.margin},${y}^A0N,16,16^FD${r.label}^FS\n`;
      zpl += `^FO380,${y}^A0N,16,16^FD${sign}${r.value.toFixed(2)}^FS\n`;
      zpl += `^FO550,${y}^A0N,16,16^FB240,1,0,R^FD${r.arabic}^FS\n`;
      y += 22;
    }
    return zpl;
  }

  // ================= SIGNATURE =================
  private generateSignatureSection(y: number): string {
    let zpl = '';
    // Customer signature - left
    zpl += `^FO${this.margin},${y + 40}^A0N,18,18^FDCUSTOMER SIGNATURE__________^FS\n`;
    // Salesman signature - right
    zpl += `^FO480,${y}^A0N,18,18^FDSALESMAN SIGNATURE__________^FS\n`;
    return zpl;
  }

  // ================= HELPERS =================
  private centerText(text: string, y: number, h: number, w: number): string {
    return `^FO0,${y}^A0N,${h},${w}^FB${this.labelWidth},1,0,C^FD${text}^FS\n`;
  }

  private dashedLine(y: number): string {
    let dashLine = '';
    for (let i = 0; i < 76; i++) {
      dashLine += '-';
    }
    return `^FO${this.margin},${y}^A0N,14,14^FD${dashLine}^FS\n`;
  }

  private longDashedLine(y: number): string {
    let dashLine = '';
    for (let i = 0; i < 90; i++) {
      dashLine += '-';
    }
    return `^FO${this.margin},${y}^A0N,12,12^FD${dashLine}^FS\n`;
  }

  private equalLine(y: number): string {
    const lineWidth = this.labelWidth - 2 * this.margin;
    let zpl = '';
    zpl += `^FO${this.margin},${y}^GB${lineWidth},2,2^FS\n`;
    zpl += `^FO${this.margin},${y + 5}^GB${lineWidth},2,2^FS\n`;
    return zpl;
  }

  private truncateText(text: string, maxLen: number): string {
    if (!text) return '';
    return text.length > maxLen ? text.substring(0, maxLen - 3) + '...' : text;
  }

  private formatDateShort(d: string): string {
    if (!d) return '';
    const dt = new Date(d);
    return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${String(dt.getFullYear()).slice(-2)}`;
  }
}

export default new ZPLGeneratorService();
