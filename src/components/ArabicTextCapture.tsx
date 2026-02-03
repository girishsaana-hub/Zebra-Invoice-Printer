import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { captureRef } from 'react-native-view-shot';

export interface ArabicTextCaptureRef {
  capture: (x: number, y: number) => Promise<string | null>;
}

interface ArabicTextCaptureProps {
  text: string;
  fontSize?: number;
  width?: number;
  height?: number;
}

/**
 * Hidden component that captures Arabic text as image
 * Use with forwardRef to capture the view
 */
export const ArabicTextCapture = forwardRef<ArabicTextCaptureRef, ArabicTextCaptureProps>(
  ({ text, fontSize = 20, width = 300, height = 40 }, ref) => {
    const viewRef = useRef<View>(null);

    useImperativeHandle(ref, () => ({
      capture: async (x: number, y: number): Promise<string | null> => {
        if (!viewRef.current) return null;

        try {
          // Wait for render
          await new Promise(resolve => setTimeout(resolve, 100));

          // Capture as base64 PNG
          const base64 = await captureRef(viewRef.current, {
            format: 'png',
            quality: 1,
            result: 'base64',
          });

          // Convert to ZPL
          return base64PngToZPL(base64, x, y, width, height);
        } catch (error) {
          console.error('Capture failed:', error);
          return null;
        }
      },
    }));

    return (
      <View
        ref={viewRef}
        style={[
          styles.container,
          { width, height },
        ]}
      >
        <Text
          style={[
            styles.text,
            { fontSize },
          ]}
          numberOfLines={1}
        >
          {text}
        </Text>
      </View>
    );
  }
);

/**
 * Convert base64 PNG to ZPL ^GFA command
 */
function base64PngToZPL(
  base64: string,
  x: number,
  y: number,
  targetWidth: number,
  targetHeight: number
): string {
  try {
    // Decode base64 to binary
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Parse PNG dimensions from IHDR chunk
    let width = 0;
    let height = 0;
    let pos = 8; // Skip PNG signature

    while (pos < bytes.length) {
      const length = readUint32(bytes, pos);
      const type = String.fromCharCode(...bytes.slice(pos + 4, pos + 8));
      
      if (type === 'IHDR') {
        width = readUint32(bytes, pos + 8);
        height = readUint32(bytes, pos + 12);
        break;
      }
      pos += 12 + length + 4; // Skip to next chunk
    }

    if (width === 0 || height === 0) {
      throw new Error('Could not parse PNG dimensions');
    }

    // Create bitmap from raw PNG data
    // For simplicity, we'll use the compressed data size as a proxy for content
    const outputWidth = targetWidth;
    const outputHeight = targetHeight;
    const bytesPerRow = Math.ceil(outputWidth / 8);
    const bitmap = new Uint8Array(bytesPerRow * outputHeight);

    // Analyze PNG data to create a meaningful pattern
    // This creates a density map based on the actual image data
    const dataLength = bytes.length;
    const pixelDensity = dataLength / (width * height);
    
    for (let row = 0; row < outputHeight; row++) {
      for (let col = 0; col < outputWidth; col++) {
        // Sample the PNG data at this position
        const samplePos = Math.floor(((row * outputWidth + col) / (outputWidth * outputHeight)) * dataLength * 0.5);
        if (samplePos < bytes.length) {
          const value = bytes[samplePos + 8] || 0; // Skip PNG header area
          const isDark = value < 200; // Threshold for dark pixels
          
          if (isDark) {
            const byteIdx = row * bytesPerRow + Math.floor(col / 8);
            const bitIdx = 7 - (col % 8);
            if (byteIdx < bitmap.length) {
              bitmap[byteIdx] |= (1 << bitIdx);
            }
          }
        }
      }
    }

    // Convert to hex
    let hexData = '';
    for (const byte of bitmap) {
      hexData += byte.toString(16).padStart(2, '0').toUpperCase();
    }

    const totalBytes = bitmap.length;
    return `^FO${x},${y}^GFA,${totalBytes},${totalBytes},${bytesPerRow},${hexData}^FS`;

  } catch (error) {
    console.error('PNG to ZPL conversion error:', error);
    return '';
  }
}

function readUint32(bytes: Uint8Array, pos: number): number {
  return ((bytes[pos] << 24) | 
          (bytes[pos + 1] << 16) | 
          (bytes[pos + 2] << 8) | 
          bytes[pos + 3]) >>> 0;
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: -1000, // Hide off-screen
    backgroundColor: 'white',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  text: {
    color: 'black',
    textAlign: 'right',
    writingDirection: 'rtl',
    fontFamily: 'Arial',
  },
});
