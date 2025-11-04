// Image optimization utilities for better performance

export interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'webp' | 'png';
}

/**
 * Compress and resize image file
 */
export const optimizeImage = async (
  file: File,
  options: ImageOptimizationOptions = {}
): Promise<File> => {
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.8,
    format = 'jpeg'
  } = options;

  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img;
      
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      
      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx?.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const optimizedFile = new File([blob], file.name, {
              type: `image/${format}`,
              lastModified: Date.now()
            });
            resolve(optimizedFile);
          } else {
            reject(new Error('Failed to optimize image'));
          }
        },
        `image/${format}`,
        quality
      );
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Create lazy loading image component props
 */
export const createLazyImageProps = (src: string, alt: string = '') => ({
  src,
  alt,
  loading: 'lazy' as const,
  decoding: 'async' as const,
  style: { contentVisibility: 'auto' }
});

/**
 * Preload critical images
 */
export const preloadImage = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
};

/**
 * Create responsive image srcSet
 */
export const createResponsiveSrcSet = (baseUrl: string, sizes: number[]) => {
  return sizes.map(size => `${baseUrl}?w=${size} ${size}w`).join(', ');
};

/**
 * Batch optimize multiple images
 */
export const optimizeImages = async (
  files: File[],
  options: ImageOptimizationOptions = {}
): Promise<File[]> => {
  const promises = files.map(file => optimizeImage(file, options));
  return Promise.all(promises);
};
