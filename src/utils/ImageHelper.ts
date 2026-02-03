import { Buffer } from 'buffer';
import UPNG from 'upng-js';

/**
 * Converts a Base64 PNG string to a ZPL-compatible monochrome Hex string.
 * 
 * @param base64Png The Base64 encoded PNG string
 * @returns Object containing the hex string, width, and height
 */
export function processImageForZPL(base64Png: string): { hex: string; width: number; height: number } {
  // Strip data URI prefix if present
  const cleanBase64 = base64Png.replace(/^data:image\/(png|jpg|jpeg);base64,/, '');
  
  const buffer = Buffer.from(cleanBase64, 'base64');
  const img = UPNG.decode(buffer);
  const rgba = UPNG.toRGBA8(img)[0];
  const data = new Uint8Array(rgba);
  
  const width = img.width;
  const height = img.height;
  
  // ZPL requires rows to be byte-aligned
  // We use an array to build the hex string for better performance than string concatenation
  const hexParts: string[] = [];
  
  for (let y = 0; y < height; y++) {
    let rowByte = 0;
    let bitIndex = 0;
    
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];

      // Determine if pixel should be black
      // Logic: If opaque AND dark enough, it's black (1). Otherwise white (0).
      let isBlack = false;
      if (a > 128) { // Ignore transparent pixels
        // Luminance formula: 0.299R + 0.587G + 0.114B
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        isBlack = lum < 128; // Threshold: pixels darker than 50% gray become black
      }

      if (isBlack) {
        rowByte |= (1 << (7 - bitIndex));
      }
      
      bitIndex++;
      if (bitIndex === 8) {
        hexParts.push(rowByte.toString(16).padStart(2, '0').toUpperCase());
        rowByte = 0;
        bitIndex = 0;
      }
    }
    
    // Pad the rest of the row if width is not a multiple of 8
    if (bitIndex > 0) {
      hexParts.push(rowByte.toString(16).padStart(2, '0').toUpperCase());
    }
  }
  
  return { hex: hexParts.join(''), width, height };
}
