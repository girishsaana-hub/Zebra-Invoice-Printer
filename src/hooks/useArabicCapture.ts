import { useRef, useCallback } from 'react';
import { ArabicTextCapture, ArabicTextCaptureRef } from '../components/ArabicTextCapture';

export interface ArabicTextItem {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize?: number;
  width?: number;
  height?: number;
}

export interface CapturedResult {
  id: string;
  zpl: string;
}

/**
 * Hook for capturing multiple Arabic text elements
 * 
 * Usage:
 * const { refs, captureAll, ArabicViews } = useArabicCapture();
 * 
 * // In JSX:
 * <ArabicViews items={[
 *   { id: 'sales', text: 'المبيعات', fontSize: 24 },
 *   { id: 'netDue', text: 'صافي مستحق الفاتورة', fontSize: 20 },
 * ]} />
 * 
 * // In print function:
 * const results = await captureAll([
 *   { id: 'sales', text: 'المبيعات', x: 420, y: 100 },
 *   { id: 'netDue', text: 'صافي مستحق الفاتورة', x: 550, y: 200 },
 * ]);
 */
export function useArabicCapture() {
  const refs = useRef<Map<string, React.RefObject<ArabicTextCaptureRef>>>(new Map());

  const getOrCreateRef = (id: string) => {
    if (!refs.current.has(id)) {
      refs.current.set(id, { current: null });
    }
    return refs.current.get(id)!;
  };

  /**
   * Capture a single Arabic text element
   */
  const capture = useCallback(async (item: ArabicTextItem): Promise<CapturedResult | null> => {
    const ref = getOrCreateRef(item.id);
    if (!ref.current) {
      console.warn(`Ref not found for ${item.id}`);
      return null;
    }

    const zpl = await ref.current.capture(item.x, item.y);
    if (!zpl) return null;

    return { id: item.id, zpl };
  }, []);

  /**
   * Capture multiple Arabic text elements
   */
  const captureAll = useCallback(async (items: ArabicTextItem[]): Promise<CapturedResult[]> => {
    const results: CapturedResult[] = [];

    for (const item of items) {
      const result = await capture(item);
      if (result) {
        results.push(result);
      }
    }

    return results;
  }, [capture]);

  /**
   * React component that renders all Arabic text views
   */
  const ArabicViews = ({ items }: { items: Array<{
    id: string;
    text: string;
    fontSize?: number;
    width?: number;
    height?: number;
  }> }) => {
    return (
      <>
        {items.map((item) => (
          <ArabicTextCapture
            key={item.id}
            ref={getOrCreateRef(item.id)}
            text={item.text}
            fontSize={item.fontSize}
            width={item.width}
            height={item.height}
          />
        ))}
      </>
    );
  };

  return {
    refs,
    capture,
    captureAll,
    ArabicViews,
  };
}
