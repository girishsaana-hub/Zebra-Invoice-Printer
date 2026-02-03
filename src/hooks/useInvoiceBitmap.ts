import { useRef, useState, useCallback } from 'react';
import { captureRef } from 'react-native-view-shot';
import { InvoiceWithDetails } from '../types/Invoice';
import { pngBase64ToZPL } from '../utils/PngToZplConverter';

/**
 * Hook for printing invoice as bitmap
 * 
 * Usage:
 * const { printInvoice, getInvoiceView, isPrinting } = useInvoiceBitmap();
 * 
 * // In your JSX, render the view:
 * {getInvoiceView(invoiceData)}
 * 
 * // To print:
 * const zpl = await printInvoice(invoiceData);
 */

export function useInvoiceBitmap() {
  const invoiceRef = useRef<any>(null);
  const [currentInvoice, setCurrentInvoice] = useState<InvoiceWithDetails | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  /**
   * Capture invoice and convert to ZPL
   */
  const printInvoice = useCallback(async (
    invoice: InvoiceWithDetails
  ): Promise<string | null> => {
    setIsPrinting(true);
    
    try {
      // Set the invoice to render
      setCurrentInvoice(invoice);

      // Wait for React to render
      await new Promise(resolve => setTimeout(resolve, 500));

      // Check if ref is available
      if (!invoiceRef.current) {
        console.error('Invoice ref not available');
        setIsPrinting(false);
        return null;
      }

      // Capture as PNG
      console.log('Capturing invoice as PNG...');
      const base64 = await captureRef(invoiceRef.current, {
        format: 'png',
        quality: 1,
        result: 'base64',
        width: 576,
      });

      console.log('PNG captured, converting to ZPL...');
      
      // Convert PNG to ZPL
      const result = pngBase64ToZPL(base64, 0, 0);
      
      if (!result) {
        console.error('Failed to convert PNG to ZPL');
        setIsPrinting(false);
        return null;
      }

      // Wrap in ZPL command
      const zpl = '^XA\n^PW' + result.width + '\n' + result.zpl + '\n^XZ';
      
      console.log('ZPL generated: ' + zpl.length + ' chars, ' + result.width + 'x' + result.height + ' pixels');
      
      return zpl;

    } catch (error) {
      console.error('Print invoice error:', error);
      return null;
    } finally {
      setIsPrinting(false);
    }
  }, []);

  /**
   * Get the ref to pass to InvoiceTemplate
   */
  const getInvoiceRef = useCallback(() => {
    return invoiceRef;
  }, []);

  /**
   * Get current invoice being rendered
   */
  const getCurrentInvoice = useCallback(() => {
    return currentInvoice;
  }, [currentInvoice]);

  return {
    printInvoice,
    getInvoiceRef,
    getCurrentInvoice,
    isPrinting,
  };
}

export default useInvoiceBitmap;
