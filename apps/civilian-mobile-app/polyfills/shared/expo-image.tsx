import type { ImageProps } from 'expo-image';
import * as ExpoImage from 'expo-image';
import React, { forwardRef, useState, useEffect, useCallback, useRef } from 'react';

type Src = ImageProps['source'];
function computeSourceKey(src: Src): string {
  if (Array.isArray(src)) return src.map(computeSourceKey).join('|');
  if (typeof src === 'number') return String(src);
  if (typeof src === 'string') return src;
  if (src && typeof src === 'object' && 'uri' in src) return src.uri ?? '';
  return '';
}

const WrappedImage = forwardRef<ExpoImage.Image, ImageProps>(function WrappedImage(props, ref) {
  const [fallbackSource, setFallbackSource] = useState<Src | null>(null);
  const source = props.source;
  const onError = props.onError;
  const style = props.style;
  const currentKey = computeSourceKey(props.source);
  const prevKeyRef = useRef(currentKey);

  useEffect(() => {
    if (prevKeyRef.current !== currentKey) {
      // parent really pointed to a different image: clear any old fallback
      setFallbackSource(null);
      prevKeyRef.current = currentKey;
    }
  }, [currentKey]);
  const handleError: ImageProps['onError'] = useCallback(
    (e: ExpoImage.ImageErrorEventData) => {
      onError?.(e);

      /* already swapped or dealing with a multi‑src array */
      if (fallbackSource || Array.isArray(source)) return;

      // prevent it from recursing
      if (
        source &&
        typeof source === 'object' &&
        'uri' in source &&
        source?.uri?.startsWith('data:')
      ) {
        return;
      }
      /* try to infer a sensible grid size */
      const finalStyle = Array.isArray(style) ? Object.assign({}, ...style) : style;

      setFallbackSource(require('../../src/lib/create/placeholder.svg'));
    },
    [source, fallbackSource, onError, style]
  );

  return (
    <ExpoImage.Image {...props} source={fallbackSource ?? source} ref={ref} onError={handleError} />
  );
});

/* expose static helpers so nothing breaks */
Object.assign(WrappedImage, ExpoImage);

/* re‑export everything that expo-image provides */
export * from 'expo-image';
export const Image = WrappedImage;
export default Image;
