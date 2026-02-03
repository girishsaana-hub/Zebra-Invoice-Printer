import { captureRef } from 'react-native-view-shot';
import { pngBase64ToZPL, textToZPLBitmap } from '../utils/PngToZplConverter';

/**
 * Arabic Text to ZPL Converter using react-native-view-shot
 * 
 * This captures native Text components with Arabic text and converts to ZPL bitmap.
 */

export interface ArabicTextOptions {
  width?: number;
  height?: number;
  fontSize?: number;
}

export interface CapturedArabic {
  zpl: string;
  width: number;
  height: number;
  bytesPerRow: number;
}

class ArabicImageGenerator {
  /**
   * Capture a React Native view containing Arabic text and convert to ZPL
   * 
   * @param viewRef Reference to the view (from useRef)
   * @param x X position in ZPL
   * @param y Y position in ZPL
   * @param options Capture options
   * @returns ZPL command and dimensions
   */
  async captureToZPL(
    viewRef: any,
    x: number,
    y: number,
    options: ArabicTextOptions = {}
  ): Promise<CapturedArabic | null> {
    const {
      width = 300,
      height = 50,
    } = options;

    if (!viewRef?.current) {
      console.error('View ref not available');
      return null;
    }

    try {
      // Small delay to ensure layout is complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Capture as base64 PNG
      const base64 = await captureRef(viewRef.current, {
        format: 'png',
        quality: 1,
        result: 'base64',
      });

      // Convert PNG to ZPL
      const result = pngBase64ToZPL(base64, x, y, width, height);
      
      if (result) {
        return result;
      }

      // Fallback: use pattern generation
      console.warn('PNG conversion failed, using fallback pattern');
      return textToZPLBitmap('Arabic', x, y, width, height);

    } catch (error) {
      console.error('Capture failed:', error);
      // Return fallback pattern
      return textToZPLBitmap('Arabic', x, y, width, height);
    }
  }

  /**
   * Generate Arabic text ZPL using pattern generation (fallback)
   * This doesn't require external dependencies
   */
  generatePattern(
    text: string,
    x: number,
    y: number,
    width: number = 200,
    height: number = 40
  ): CapturedArabic {
    return textToZPLBitmap(text, x, y, width, height);
  }

  /**
   * Batch process multiple Arabic text elements
   */
  async batchCapture(
    items: Array<{
      id: string;
      ref: any;
      x: number;
      y: number;
      width?: number;
      height?: number;
    }>
  ): Promise<Map<string, CapturedArabic>> {
    const results = new Map<string, CapturedArabic>();

    for (const item of items) {
      const result = await this.captureToZPL(item.ref, item.x, item.y, {
        width: item.width,
        height: item.height,
      });

      if (result) {
        results.set(item.id, result);
      }
    }

    return results;
  }
}

export default new ArabicImageGenerator();
