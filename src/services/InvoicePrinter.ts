import { InvoiceWithDetails } from '../types/Invoice';
import ZPLGeneratorService from './ZPLGeneratorService';
import { useArabicCapture, ArabicTextItem } from '../hooks/useArabicCapture';

/**
 * Complete invoice printing solution with Arabic support
 * 
 * Usage example:
 * 
 * const MyComponent = () => {
 *   const { printInvoice, ArabicViews } = useInvoicePrinter();
 *   
 *   const handlePrint = async (invoice) => {
 *     const zpl = await printInvoice(invoice);
 *     await printer.write(zpl);
 *   };
 *   
 *   return (
 *     <View>
 *       <Button title="Print" onPress={handlePrint} />
 *       <ArabicViews />  // Hidden views for capturing Arabic
 *     </View>
 *   );
 * };
 */

export function useInvoicePrinter() {
  const { captureAll, ArabicViews } = useArabicCapture();

  /**
   * Generate ZPL with Arabic text
   * 
   * This captures Arabic text as bitmaps and includes them in the ZPL
   */
  const generateZPLWithArabic = async (invoice: InvoiceWithDetails): Promise<string> => {
    // Define all Arabic text elements
    const arabicItems: ArabicTextItem[] = [
      // SALES header
      { id: 'sales', text: 'المبيعات', x: 420, y: 345, fontSize: 24, width: 150, height: 35 },
      
      // Table headers (second row)
      { id: 'header_itemDesc', text: 'بند/وصف', x: 15, y: 400, fontSize: 14, width: 100, height: 18 },
      { id: 'header_upc', text: 'رمز المنتج', x: 210, y: 400, fontSize: 14, width: 100, height: 18 },
      { id: 'header_qty', text: 'الكمية', x: 280, y: 400, fontSize: 14, width: 80, height: 18 },
      { id: 'header_price', text: 'السعر', x: 340, y: 400, fontSize: 14, width: 80, height: 18 },
      { id: 'header_discount', text: 'الخصم/الحسم', x: 420, y: 400, fontSize: 14, width: 120, height: 18 },
      { id: 'header_vat', text: 'مبلغ الضريبة', x: 540, y: 400, fontSize: 14, width: 120, height: 18 },
      { id: 'header_amount', text: 'المبلغ', x: 700, y: 400, fontSize: 14, width: 80, height: 18 },
      
      // NET DUE header
      { id: 'netDueHeader', text: 'صافي مستحق الفاتورة', x: 550, y: 680, fontSize: 20, width: 200, height: 25 },
      
      // NET DUE row labels
      { id: 'netDue_sales', text: 'المبيعات', x: 550, y: 708, fontSize: 16, width: 180, height: 20 },
      { id: 'netDue_discount', text: 'القرص', x: 550, y: 730, fontSize: 16, width: 180, height: 20 },
      { id: 'netDue_goodReturns', text: 'البضائع المرتجعة', x: 550, y: 752, fontSize: 16, width: 180, height: 20 },
      { id: 'netDue_damagedReturns', text: 'بضاعة معدومة مرتجعة', x: 550, y: 774, fontSize: 16, width: 180, height: 20 },
      { id: 'netDue_vat', text: 'مبلغ ضريبة القيمة المضافة', x: 550, y: 796, fontSize: 16, width: 180, height: 20 },
      { id: 'netDue_excise', text: 'مبلغ ضريبة الاستهلاك', x: 550, y: 818, fontSize: 16, width: 180, height: 20 },
      { id: 'netDue_netSales', text: 'صافي المبيعات', x: 550, y: 840, fontSize: 16, width: 180, height: 20 },
    ];

    // Capture all Arabic text as ZPL bitmaps
    const captured = await captureAll(arabicItems);
    
    // Create map of results
    const arabicZpl = new Map<string, string>();
    for (const result of captured) {
      arabicZpl.set(result.id, result.zpl);
    }

    // Generate complete ZPL
    const zpl = ZPLGeneratorService.generateInvoiceZPL(invoice, arabicZpl);
    
    return zpl;
  };

  /**
   * Generate ZPL without Arabic (English only)
   */
  const generateZPLEnglishOnly = (invoice: InvoiceWithDetails): string => {
    return ZPLGeneratorService.generateInvoiceZPL(invoice, new Map());
  };

  return {
    generateZPLWithArabic,
    generateZPLEnglishOnly,
    ArabicViews,
  };
}

export default useInvoicePrinter;
