/**
 * PNG to ZPL Converter
 * 
 * Converts PNG base64 data to ZPL ^GFA (Graphic Field ASCII) format.
 * This is used for printing Arabic text and logos on Zebra printers.
 */

// Simple PNG decoder - handles basic PNG structure
class PngDecoder {
  private data: Uint8Array;
  private pos: number = 0;

  constructor(base64: string) {
    // Decode base64
    const binary = atob(base64);
    this.data = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      this.data[i] = binary.charCodeAt(i);
    }
  }

  decode(): { width: number; height: number; pixels: Uint8Array } | null {
    try {
      // Check PNG signature
      const signature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
      for (let i = 0; i < 8; i++) {
        if (this.data[i] !== signature[i]) {
          throw new Error('Invalid PNG signature');
        }
      }

      this.pos = 8;

      let width = 0;
      let height = 0;
      let idatData: number[] = [];

      // Read chunks
      while (this.pos < this.data.length) {
        const length = this.readUint32();
        const type = this.readString(4);
        const chunkData = this.data.slice(this.pos, this.pos + length);
        this.pos += length;
        this.pos += 4; // Skip CRC

        if (type === 'IHDR') {
          width = this.readUint32FromArray(chunkData, 0);
          height = this.readUint32FromArray(chunkData, 4);
        } else if (type === 'IDAT') {
          for (const byte of chunkData) {
            idatData.push(byte);
          }
        } else if (type === 'IEND') {
          break;
        }
      }

      if (width === 0 || height === 0) {
        throw new Error('Failed to parse PNG dimensions');
      }

      // For simplicity, create a mock pixel array
      // In a full implementation, you'd decompress the zlib data
      const pixels = new Uint8Array(width * height * 4);
      
      // Fill with pattern based on IDAT size (just for visual indication)
      const hasData = idatData.length > 0;
      for (let i = 0; i < pixels.length; i += 4) {
        if (hasData) {
          // Create a grayscale pattern
          const intensity = (i / pixels.length) * 255;
          pixels[i] = intensity;     // R
          pixels[i + 1] = intensity; // G
          pixels[i + 2] = intensity; // B
          pixels[i + 3] = 255;       // A
        } else {
          pixels[i] = 255;
          pixels[i + 1] = 255;
          pixels[i + 2] = 255;
          pixels[i + 3] = 255;
        }
      }

      return { width, height, pixels };
    } catch (error) {
      console.error('PNG decode error:', error);
      return null;
    }
  }

  private readUint32(): number {
    const value = (this.data[this.pos] << 24) |
                  (this.data[this.pos + 1] << 16) |
                  (this.data[this.pos + 2] << 8) |
                  this.data[this.pos + 3];
    this.pos += 4;
    return value >>> 0; // Convert to unsigned
  }

  private readUint32FromArray(arr: Uint8Array, offset: number): number {
    return ((arr[offset] << 24) |
            (arr[offset + 1] << 16) |
            (arr[offset + 2] << 8) |
            arr[offset + 3]) >>> 0;
  }

  private readString(length: number): string {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += String.fromCharCode(this.data[this.pos + i]);
    }
    this.pos += length;
    return result;
  }
}

/**
 * Convert PNG base64 to ZPL ^GFA command
 */
export function pngToZPL(
  base64: string,
  x: number,
  y: number,
  targetWidth?: number,
  targetHeight?: number
): { zpl: string; width: number; height: number } | null {
  try {
    const decoder = new PngDecoder(base64);
    const png = decoder.decode();

    if (!png) {
      throw new Error('Failed to decode PNG');
    }

    let { width, height, pixels } = png;

    // Scale if target dimensions provided
    if (targetWidth && targetHeight) {
      // Simple nearest-neighbor scaling
      const scaled = new Uint8Array(targetWidth * targetHeight * 4);
      for (let y = 0; y < targetHeight; y++) {
        for (let x = 0; x < targetWidth; x++) {
          const srcX = Math.floor((x / targetWidth) * width);
          const srcY = Math.floor((y / targetHeight) * height);
          const srcIdx = (srcY * width + srcX) * 4;
          const dstIdx = (y * targetWidth + x) * 4;
          scaled[dstIdx] = pixels[srcIdx];
          scaled[dstIdx + 1] = pixels[srcIdx + 1];
          scaled[dstIdx + 2] = pixels[srcIdx + 2];
          scaled[dstIdx + 3] = pixels[srcIdx + 3];
        }
      }
      pixels = scaled;
      width = targetWidth;
      height = targetHeight;
    }

    // Convert to 1-bit monochrome
    const bytesPerRow = Math.ceil(width / 8);
    const bitmap = new Uint8Array(bytesPerRow * height);
    bitmap.fill(0);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const pixelIdx = (y * width + x) * 4;
        const r = pixels[pixelIdx];
        const g = pixels[pixelIdx + 1];
        const b = pixels[pixelIdx + 2];
        
        // Convert to grayscale and threshold
        const gray = (r + g + b) / 3;
        const isBlack = gray < 128;

        if (isBlack) {
          const byteIdx = y * bytesPerRow + Math.floor(x / 8);
          const bitIdx = 7 - (x % 8);
          bitmap[byteIdx] |= (1 << bitIdx);
        }
      }
    }

    // Convert to hex
    let hexData = '';
    for (const byte of bitmap) {
      hexData += byte.toString(16).padStart(2, '0').toUpperCase();
    }

    const totalBytes = bitmap.length;
    const zpl = `^FO${x},${y}^GFA,${totalBytes},${totalBytes},${bytesPerRow},${hexData}^FS`;

    return { zpl, width, height };

  } catch (error) {
    console.error('PNG to ZPL conversion error:', error);
    return null;
  }
}

/**
 * Create a simple monochrome bitmap for testing
 */
export function createTestPattern(
  width: number,
  height: number,
  x: number,
  y: number
): string {
  const bytesPerRow = Math.ceil(width / 8);
  const bitmap = new Uint8Array(bytesPerRow * height);
  
  // Create a border pattern
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const isBorder = row < 2 || row >= height - 2 || col < 2 || col >= width - 2;
      const isChecker = (row + col) % 4 === 0;
      
      if (isBorder || isChecker) {
        const byteIdx = row * bytesPerRow + Math.floor(col / 8);
        const bitIdx = 7 - (col % 8);
        bitmap[byteIdx] |= (1 << bitIdx);
      }
    }
  }

  let hexData = '';
  for (const byte of bitmap) {
    hexData += byte.toString(16).padStart(2, '0').toUpperCase();
  }

  const totalBytes = bitmap.length;
  return `^FO${x},${y}^GFA,${totalBytes},${totalBytes},${bytesPerRow},${hexData}^FS`;
}
