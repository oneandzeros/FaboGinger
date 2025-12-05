/**
 * 图像处理工具集：自动角点识别 + Potrace 描摹
 */

import { applyPerspectiveTransform } from './perspective';
import PotraceModule from 'potrace';

export interface Point {
  x: number;
  y: number;
}

export interface AutoCorrectResult {
  originalDataUrl: string;
  correctedDataUrl: string;
  widthMm: number;
  heightMm: number;
  corners: Point[];
  redPixels: Point[];
}

export interface SvgProcessResult {
  svg: string;
  viewWidth: number;
  viewHeight: number;
  mask: Uint8Array;
  widthMm: number;
  heightMm: number;
}

export interface RectangleSuggestion {
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
}

export interface RectanglePackingOptions {
  maxWidthMm: number;
  maxHeightMm: number;
  minWidthMm?: number;
  minHeightMm?: number;
  stepMm?: number;
  gapMm?: number;
  coverageThreshold?: number;
  orientation?: 'landscape' | 'portrait' | 'both';
  maxShapes?: number;
  progressIntervalRows?: number;
  yieldAfterRows?: number;
  onProgress?: (progress: RectanglePackingProgress) => void | Promise<void>;
  onRectangleAdded?: (suggestion: RectangleSuggestion) => void | Promise<void>; // 每当添加一个新矩形时调用
  shouldAbort?: () => boolean;
  originalMask?: Uint8Array; // 原始mask，用于区分黑色边界和已放置矩形
  effectiveHeightMm?: number; // 有效扫描区域高度（毫米），用于正确计算总行数
}

export interface RectanglePackingProgress {
  progress: number;
  processedRows: number;
  totalRows: number;
  suggestions: number;
  lastSuggestion?: RectangleSuggestion | null;
}

const BOARD_WIDTH_MM = 525;
const BOARD_HEIGHT_MM = 645;
const MAX_SCAN_PIXELS = 10_000;
const PIXELS_PER_MM = 4;

const Potrace: any = PotraceModule;

export async function autoCorrectPerspective(imageData: string): Promise<AutoCorrectResult> {
  const img = await loadImage(imageData);

  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法创建 Canvas 上下文');
  ctx.drawImage(img, 0, 0);

  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const redPixels = detectRedPixels(image);
  if (redPixels.length < 3) {
    throw new Error('未检测到足够的红色标记，请确认胶带清晰可见');
  }

  const inferred = inferCornersFromRedPixels(redPixels, image.width, image.height);
  const normalizedCorners = normalizeCorners(inferred, image.width, image.height);
  const corrected = applyCorrectionWithImage(img, normalizedCorners);

  return {
    originalDataUrl: imageData,
    correctedDataUrl: corrected.dataUrl,
    widthMm: corrected.widthMm,
    heightMm: corrected.heightMm,
    corners: corrected.corners,
    redPixels,
  };
}

export async function generateCorrectedImage(
  imageData: string,
  corners: Point[],
  options?: {
    widthMm?: number;
    heightMm?: number;
    pixelsPerMm?: number;
  }
): Promise<{
  dataUrl: string;
  widthMm: number;
  heightMm: number;
  widthPx: number;
  heightPx: number;
  corners: Point[];
}> {
  const img = await loadImage(imageData);
  return applyCorrectionWithImage(img, corners, options);
}

export async function processImageToSvg(
  imageData: string,
  options?: {
    threshold?: number;
    turdSize?: number;
    optTolerance?: number;
    widthMm?: number;
    heightMm?: number;
  }
): Promise<SvgProcessResult> {
  const img = await loadImage(imageData);

  const maxDimension = 1200;
  const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法创建 Canvas 上下文');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const imageDataObj = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageDataObj.data;

  let threshold = options?.threshold;
  if (threshold === undefined || threshold === null) {
    threshold = calculateOtsuThreshold(data);
  }

  const binaryData = new Uint8Array(canvas.width * canvas.height);
  for (let i = 0; i < data.length; i += 4) {
    const gray = Math.round(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
    const idx = i / 4;
    const value = gray > threshold ? 255 : 0;
    binaryData[idx] = value;
    data[i] = data[i + 1] = data[i + 2] = value;
    data[i + 3] = 255;
  }
  ctx.putImageData(imageDataObj, 0, 0);

  const pngDataUrl = canvas.toDataURL('image/png');

  return new Promise<SvgProcessResult>((resolve, reject) => {
    Potrace.trace(
      pngDataUrl,
      {
        threshold: 128,
        turdSize: options?.turdSize ?? 2,
        optTolerance: options?.optTolerance ?? 0.4,
        optCurve: true,
        turnPolicy: 'minority',
      },
      (error: Error | null, svg: string) => {
        if (error) {
          reject(error);
        } else {
          const widthMm = options?.widthMm ?? BOARD_WIDTH_MM;
          const heightMm = options?.heightMm ?? BOARD_HEIGHT_MM;
          const adjusted = adjustSvgDimensions(svg, {
            widthMm: options?.widthMm,
            heightMm: options?.heightMm,
            viewWidth: canvas.width,
            viewHeight: canvas.height,
          });
          resolve({
            svg: adjusted,
            viewWidth: canvas.width,
            viewHeight: canvas.height,
            mask: binaryData.slice(),
            widthMm,
            heightMm,
          });
        }
      }
    );
  });
}

export function normalizeCorners(corners: Point[], width: number, height: number): Point[] {
  if (corners.length < 3) {
    throw new Error('至少需要三个角点');
  }

  let working = corners.map((p) => clampPoint(p, width, height));

  if (working.length === 3) {
    const sortedByY = [...working].sort((a, b) => a.y - b.y);
    const topTwo = sortedByY.slice(0, 2).sort((a, b) => a.x - b.x);
    const bottom = sortedByY[2];
    const topLeft = topTwo[0];
    const topRight = topTwo[1];
    const bottomRight = bottom;
    const bottomLeft = clampPoint(
      {
        x: topLeft.x + bottomRight.x - topRight.x,
        y: topLeft.y + bottomRight.y - topRight.y,
      },
      width,
      height
    );
    working = [topLeft, topRight, bottomRight, bottomLeft];
  } else if (working.length > 4) {
    working = selectFourExtremePoints(working);
  } else if (working.length === 4) {
    // nothing
  }

  if (working.length !== 4) {
    throw new Error('无法归一化角点');
  }

  const sortedByY = [...working].sort((a, b) => a.y - b.y);
  const topTwo = sortedByY.slice(0, 2).sort((a, b) => a.x - b.x);
  const bottomTwo = sortedByY.slice(-2).sort((a, b) => a.x - b.x);

  if (topTwo.length < 2 || bottomTwo.length < 2) {
    throw new Error('角点排序失败');
  }

  const [topLeft, topRight] = topTwo;
  let [bottomLeft, bottomRight] = bottomTwo;

  // 确保 bottomRight 位于 bottomLeft 右侧
  if (bottomRight.x < bottomLeft.x) {
    [bottomLeft, bottomRight] = [bottomRight, bottomLeft];
  }

  const ordered: Point[] = [topLeft, topRight, bottomRight, bottomLeft];
  return ordered.map((p) => clampPoint(p, width, height));
}

function calculateOtsuThreshold(data: Uint8ClampedArray): number {
  const histogram = new Array(256).fill(0);
  for (let i = 0; i < data.length; i += 4) {
    const gray = Math.round(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
    histogram[gray]++;
  }

  const total = data.length / 4;
  let sum = 0;
  for (let i = 0; i < 256; i++) {
    sum += i * histogram[i];
  }

  let sumB = 0;
  let wB = 0;
  let wF = 0;
  let maxVariance = 0;
  let threshold = 0;

  for (let t = 0; t < 256; t++) {
    wB += histogram[t];
    if (wB === 0) continue;

    wF = total - wB;
    if (wF === 0) break;

    sumB += t * histogram[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const variance = wB * wF * Math.pow(mB - mF, 2);

    if (variance > maxVariance) {
      maxVariance = variance;
      threshold = t;
    }
  }

  return threshold;
}

function detectRedPixels(image: ImageData): Point[] {
  const { data, width, height } = image;
  const pixels: Point[] = [];

  const step = Math.max(1, Math.round(Math.sqrt((width * height) / MAX_SCAN_PIXELS)));

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      if (isRed(r, g, b)) {
        pixels.push({ x, y });
      }
    }
  }

  return pixels;
}

function isRed(r: number, g: number, b: number): boolean {
  const maxOther = Math.max(g, b);
  return r > 150 && r - maxOther > 40 && g < 200 && b < 200;
}

function inferCornersFromRedPixels(points: Point[], width: number, height: number): Point[] {
  const sortedByY = [...points].sort((a, b) => a.y - b.y);
  const topCandidates = sortedByY.slice(0, Math.max(2, Math.round(sortedByY.length * 0.1)));
  const bottomCandidate = sortedByY[sortedByY.length - 1];

  const topLeft = topCandidates.reduce((min, p) => (p.x < min.x ? p : min), topCandidates[0]);
  const topRight = topCandidates.reduce((max, p) => (p.x > max.x ? p : max), topCandidates[0]);

  const bottomRight = bottomCandidate;
  const bottomLeft = {
    x: topLeft.x + bottomRight.x - topRight.x,
    y: topLeft.y + bottomRight.y - topRight.y,
  };

  return [topLeft, topRight, bottomRight, clampPoint(bottomLeft, width, height)];
}

function clampPoint(point: Point, width: number, height: number): Point {
  return {
    x: Math.min(Math.max(point.x, 0), width - 1),
    y: Math.min(Math.max(point.y, 0), height - 1),
  };
}

function selectFourExtremePoints(points: Point[]): Point[] {
  if (points.length <= 4) return points.slice(0, 4);
  const tl = points.reduce((acc, p) => (p.x + p.y < acc.x + acc.y ? p : acc), points[0]);
  const tr = points.reduce((acc, p) => (p.x - p.y > acc.x - acc.y ? p : acc), points[0]);
  const br = points.reduce((acc, p) => (p.x + p.y > acc.x + acc.y ? p : acc), points[0]);
  const bl = points.reduce((acc, p) => (p.y - p.x > acc.y - acc.x ? p : acc), points[0]);
  return [tl, tr, br, bl];
}

function applyCorrectionWithImage(
  img: HTMLImageElement,
  corners: Point[],
  options?: {
    widthMm?: number;
    heightMm?: number;
    pixelsPerMm?: number;
  }
): {
  dataUrl: string;
  widthMm: number;
  heightMm: number;
  widthPx: number;
  heightPx: number;
  corners: Point[];
} {
  const normalized = normalizeCorners(corners, img.width, img.height);
  const widthMm = options?.widthMm ?? BOARD_WIDTH_MM;
  const heightMm = options?.heightMm ?? BOARD_HEIGHT_MM;
  const pixelsPerMm = options?.pixelsPerMm ?? PIXELS_PER_MM;
  const targetWidth = Math.max(1, Math.round(widthMm * pixelsPerMm));
  const targetHeight = Math.max(1, Math.round(heightMm * pixelsPerMm));
  const transformed = applyPerspectiveTransform(img, normalized, {
    targetWidth,
    targetHeight,
  });

  return {
    dataUrl: transformed.dataUrl,
    widthMm,
    heightMm,
    widthPx: targetWidth,
    heightPx: targetHeight,
    corners: normalized,
  };
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function adjustSvgDimensions(
  svg: string,
  params: { widthMm?: number; heightMm?: number; viewWidth: number; viewHeight: number }
): string {
  const { widthMm, heightMm, viewWidth, viewHeight } = params;
  if (typeof DOMParser === 'undefined' || typeof XMLSerializer === 'undefined') {
    return svg;
  }
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svg, 'image/svg+xml');
    const root = doc.documentElement;
    if (!root || root.tagName.toLowerCase() !== 'svg') {
      return svg;
    }

    if (!root.getAttribute('viewBox')) {
      root.setAttribute('viewBox', `0 0 ${viewWidth} ${viewHeight}`);
    }

    if (widthMm && widthMm > 0) {
      root.setAttribute('width', `${widthMm}mm`);
    }
    if (heightMm && heightMm > 0) {
      root.setAttribute('height', `${heightMm}mm`);
    }

    if (!root.getAttribute('xmlns')) {
      root.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    }

    return new XMLSerializer().serializeToString(doc);
  } catch (error) {
    console.warn('[processImageToSvg] 调整 SVG 尺寸失败', error);
    return svg;
  }
}

function buildDescendingRange(max: number, min: number, step: number): number[] {
  const values: number[] = [];
  if (step <= 0) {
    values.push(max, min);
    return Array.from(new Set(values)).sort((a, b) => b - a);
  }
  let current = max;
  while (current >= min) {
    values.push(Number(current.toFixed(4)));
    current -= step;
  }
  if (values[values.length - 1] !== Number(min.toFixed(4))) {
    values.push(Number(min.toFixed(4)));
  }
  return Array.from(new Set(values)).sort((a, b) => b - a);
}

export async function suggestRectanglesFromMask(
  mask: Uint8Array,
  maskWidth: number,
  maskHeight: number,
  widthMm: number,
  heightMm: number,
  options: RectanglePackingOptions
): Promise<RectangleSuggestion[]> {
  if (mask.length !== maskWidth * maskHeight) {
    throw new Error('蒙版尺寸与数组长度不一致');
  }
  if (widthMm <= 0 || heightMm <= 0) {
    throw new Error('无效的实际尺寸');
  }

  const pxPerMmX = maskWidth / widthMm;
  const pxPerMmY = maskHeight / heightMm;

  const maxWidthMm = Math.max(options.maxWidthMm, 1);
  const maxHeightMm = Math.max(options.maxHeightMm, 1);
  const minWidthMm = Math.max(options.minWidthMm ?? 20, 1);
  const minHeightMm = Math.max(options.minHeightMm ?? 20, 1);
  const stepMm = Math.max(options.stepMm ?? 10, 0.2);
  const gapMm = Math.max(options.gapMm ?? 5, 0);
  const coverageThreshold = Math.min(Math.max(options.coverageThreshold ?? 0.95, 0), 1);
  const orientation = options.orientation ?? 'both';
  const maxShapes = options.maxShapes ?? 200;
  const progressIntervalRows = Math.max(1, Math.round(options.progressIntervalRows ?? 5));
  const yieldAfterRows = Math.max(0, Math.round(options.yieldAfterRows ?? 20));
  const onProgress = options.onProgress;
  const onRectangleAdded = options.onRectangleAdded;
  const shouldAbort = options.shouldAbort;

  // 预先计算最小尺寸的像素值（性能优化：避免在循环中重复计算）
  const minWidthPx = Math.max(1, Math.round(minWidthMm * pxPerMmX));
  const minHeightPx = Math.max(1, Math.round(minHeightMm * pxPerMmY));

  const widthCandidates = buildDescendingRange(maxWidthMm, minWidthMm, stepMm);
  const heightCandidates = buildDescendingRange(maxHeightMm, minHeightMm, stepMm);

  const sizePairs: Array<{ widthMm: number; heightMm: number }> = [];
  const seen = new Set<string>();

  const addPair = (w: number, h: number) => {
    const key = `${w.toFixed(3)}-${h.toFixed(3)}`;
    if (!seen.has(key)) {
      seen.add(key);
      sizePairs.push({ widthMm: w, heightMm: h });
    }
  };

  widthCandidates.forEach((w) => {
    heightCandidates.forEach((h) => {
      if (orientation === 'landscape') {
        addPair(w, h);
      } else if (orientation === 'portrait') {
        addPair(h, w);
      } else {
        addPair(w, h);
        if (w !== h) {
          addPair(h, w);
        }
      }
    });
  });

  sizePairs.sort((a, b) => b.widthMm * b.heightMm - a.widthMm * a.heightMm);

  const available = new Uint8Array(maskWidth * maskHeight);
  const original = new Uint8Array(maskWidth * maskHeight);
  for (let i = 0; i < mask.length; i++) {
    const isWhite = mask[i] > 200 ? 1 : 0;
    available[i] = isWhite;
    original[i] = isWhite;
  }

  const gapPxX = Math.round(gapMm * pxPerMmX);
  const gapPxY = Math.round(gapMm * pxPerMmY);
  const stepPxX = Math.max(1, Math.round(stepMm * pxPerMmX));
  const stepPxY = Math.max(1, Math.round(stepMm * pxPerMmY));
  
  // 1mm间距对应的像素
  const boundaryGapMm = 1;
  const boundaryGapPxX = Math.round(boundaryGapMm * pxPerMmX);
  const boundaryGapPxY = Math.round(boundaryGapMm * pxPerMmY);
  
  // 原始mask用于区分黑色边界和已放置矩形
  const originalMask = options.originalMask || mask;

  const suggestions: RectangleSuggestion[] = [];
  
  // 计算实际扫描区域的高度：如果有effectiveHeightMm，使用它来计算；否则使用整个maskHeight
  // effectiveHeightMm 是边界框减去padding后的有效高度（毫米）
  const effectiveHeightMm = options.effectiveHeightMm;
  let totalRows: number;
  if (effectiveHeightMm && effectiveHeightMm > 0) {
    // 如果有指定有效高度，基于有效高度计算总行数
    const pxPerMmY = maskHeight / heightMm;
    const effectiveHeightPx = effectiveHeightMm * pxPerMmY;
    totalRows = Math.max(1, Math.ceil(effectiveHeightPx / stepPxY));
  } else {
    // 否则使用整个maskHeight
    totalRows = Math.max(1, Math.ceil(maskHeight / stepPxY));
  }
  let processedRows = 0;
  let firstPhaseTotalRows = totalRows; // 记录第一阶段的totalRows

  const reportProgress = async (force = false) => {
    if (!onProgress) return;
    if (!force && processedRows % progressIntervalRows !== 0) return;
    try {
      const payload: RectanglePackingProgress = {
        progress: Math.min(1, processedRows / totalRows),
        processedRows,
        totalRows,
        suggestions: suggestions.length,
        lastSuggestion: suggestions.length > 0 ? suggestions[suggestions.length - 1] : null,
      };
      const maybe = onProgress(payload);
      if (maybe instanceof Promise) {
        await maybe;
      }
    } catch (error) {
      console.warn('[suggestRectanglesFromMask] 进度回调异常', error);
    }
  };

  await reportProgress(true);

  // 预计算每行的黑色边界列（性能优化：避免重复扫描）
  // blackBoundaryCols[y] 是一个 Set，包含第 y 行所有有黑色边界的列索引
  const blackBoundaryCols = new Map<number, Set<number>>();
  const precomputeBlackBoundaries = () => {
    for (let yy = 0; yy < maskHeight; yy++) {
      const cols = new Set<number>();
      for (let xx = 0; xx < maskWidth; xx++) {
        const idx = yy * maskWidth + xx;
        if (originalMask[idx] <= 200) {
          cols.add(xx);
        }
      }
      if (cols.size > 0) {
        blackBoundaryCols.set(yy, cols);
      }
    }
  };
  precomputeBlackBoundaries();

  // 检查矩形区域是否可用，考虑不同的间距规则（优化版）
  const isAreaUnused = (x: number, y: number, w: number, h: number): boolean => {
    // 首先检查矩形内部区域是否可用
    for (let yy = y; yy < y + h && yy < maskHeight; yy++) {
      const rowOffset = yy * maskWidth;
      for (let xx = x; xx < x + w && xx < maskWidth; xx++) {
        if (!available[rowOffset + xx]) {
          return false;
        }
      }
    }

    // 检查矩形周围的间距区域
    // 左边界：检查矩形左侧是否有黑色边界或已放置矩形
    if (x > 0) {
      // 使用预计算的边界信息快速检查左边缘是否有黑色边界
      let hasBlackBoundary = false;
      const checkX = Math.max(0, x - 1);
      for (let yy = y; yy < y + h && yy < maskHeight; yy++) {
        const cols = blackBoundaryCols.get(yy);
        if (cols && cols.has(checkX)) {
          hasBlackBoundary = true;
          break;
        }
      }
      
      // 只有当有黑色边界时，才需要检查间距；或者当gap > 0时，检查与已放置矩形的间距
      if (hasBlackBoundary || gapPxX > 0) {
        const gapToUse = hasBlackBoundary ? boundaryGapPxX : gapPxX;
        const startX = Math.max(0, x - gapToUse);
        for (let yy = y; yy < y + h && yy < maskHeight; yy++) {
          const rowOffset = yy * maskWidth;
          const cols = blackBoundaryCols.get(yy);
          for (let xx = startX; xx < x; xx++) {
            if (!available[rowOffset + xx]) {
              // 使用预计算的边界信息快速判断是否是黑色边界
              const isBlack = cols && cols.has(xx);
              if (isBlack && !hasBlackBoundary) {
                // 如果是黑色边界但之前没检测到，需要保持1mm间距
                return false;
              } else if (!isBlack && gapPxX > 0) {
                // 是已放置矩形，只有当gap > 0时才需要检查间距
                return false;
              }
            }
          }
        }
      }
    }

    // 右边界：检查矩形右侧是否有黑色边界或已放置矩形
    if (x + w < maskWidth) {
      const rightEdge = x + w;
      // 使用预计算的边界信息快速检查右边缘是否有黑色边界
      let hasBlackBoundary = false;
      if (rightEdge < maskWidth) {
        for (let yy = y; yy < y + h && yy < maskHeight; yy++) {
          const cols = blackBoundaryCols.get(yy);
          if (cols && cols.has(rightEdge)) {
            hasBlackBoundary = true;
            break;
          }
        }
      }
      
      if (hasBlackBoundary || gapPxX > 0) {
        const gapToUse = hasBlackBoundary ? boundaryGapPxX : gapPxX;
        const endX = Math.min(maskWidth, rightEdge + gapToUse);
        for (let yy = y; yy < y + h && yy < maskHeight; yy++) {
          const rowOffset = yy * maskWidth;
          const cols = blackBoundaryCols.get(yy);
          for (let xx = rightEdge; xx < endX; xx++) {
            if (!available[rowOffset + xx]) {
              // 使用预计算的边界信息快速判断是否是黑色边界
              const isBlack = cols && cols.has(xx);
              if (isBlack && !hasBlackBoundary) {
                return false;
              } else if (!isBlack && gapPxX > 0) {
                return false;
              }
            }
          }
        }
      }
    }

    // 上边界：检查矩形上侧是否有黑色边界或已放置矩形
    if (y > 0) {
      // 使用预计算的边界信息快速检查上边缘是否有黑色边界
      let hasBlackBoundary = false;
      const checkY = Math.max(0, y - 1);
      const cols = blackBoundaryCols.get(checkY);
      if (cols) {
        for (let xx = x; xx < x + w && xx < maskWidth; xx++) {
          if (cols.has(xx)) {
            hasBlackBoundary = true;
            break;
          }
        }
      }
      
      if (hasBlackBoundary || gapPxY > 0) {
        const gapToUse = hasBlackBoundary ? boundaryGapPxY : gapPxY;
        const startY = Math.max(0, y - gapToUse);
        for (let yy = startY; yy < y; yy++) {
          const rowOffset = yy * maskWidth;
          const rowCols = blackBoundaryCols.get(yy);
          for (let xx = x; xx < x + w && xx < maskWidth; xx++) {
            if (!available[rowOffset + xx]) {
              // 使用预计算的边界信息快速判断是否是黑色边界
              const isBlack = rowCols && rowCols.has(xx);
              if (isBlack && !hasBlackBoundary) {
                return false;
              } else if (!isBlack && gapPxY > 0) {
                return false;
              }
            }
          }
        }
      }
    }

    // 下边界：检查矩形下侧是否有黑色边界或已放置矩形
    if (y + h < maskHeight) {
      const bottomEdge = y + h;
      // 使用预计算的边界信息快速检查下边缘是否有黑色边界
      let hasBlackBoundary = false;
      if (bottomEdge < maskHeight) {
        const cols = blackBoundaryCols.get(bottomEdge);
        if (cols) {
          for (let xx = x; xx < x + w && xx < maskWidth; xx++) {
            if (cols.has(xx)) {
              hasBlackBoundary = true;
              break;
            }
          }
        }
      }
      
      if (hasBlackBoundary || gapPxY > 0) {
        const gapToUse = hasBlackBoundary ? boundaryGapPxY : gapPxY;
        const endY = Math.min(maskHeight, bottomEdge + gapToUse);
        for (let yy = bottomEdge; yy < endY; yy++) {
          const rowOffset = yy * maskWidth;
          const rowCols = blackBoundaryCols.get(yy);
          for (let xx = x; xx < x + w && xx < maskWidth; xx++) {
            if (!available[rowOffset + xx]) {
              // 使用预计算的边界信息快速判断是否是黑色边界
              const isBlack = rowCols && rowCols.has(xx);
              if (isBlack && !hasBlackBoundary) {
                return false;
              } else if (!isBlack && gapPxY > 0) {
                return false;
              }
            }
          }
        }
      }
    }

    return true;
  };

  const whiteCoverageRatio = (x: number, y: number, w: number, h: number): number => {
    let white = 0;
    let total = 0;
    for (let yy = y; yy < y + h; yy++) {
      const rowOffset = yy * maskWidth;
      for (let xx = x; xx < x + w; xx++) {
        total++;
        if (original[rowOffset + xx]) {
          white++;
        }
      }
    }
    return total === 0 ? 0 : white / total;
  };

  // 标记已使用的区域，根据周围是黑色边界还是已放置矩形使用不同的间距
  const markUsed = (x: number, y: number, w: number, h: number) => {
    // 标记矩形内部
    for (let yy = y; yy < y + h && yy < maskHeight; yy++) {
      const rowOffset = yy * maskWidth;
      for (let xx = x; xx < x + w && xx < maskWidth; xx++) {
        available[rowOffset + xx] = 0;
      }
    }

    // 标记周围的间距区域
    // 左边界
    if (x > 0) {
      // 使用预计算的边界信息快速检查左边缘是否有黑色边界
      let isBlackBoundary = false;
      const checkX = Math.max(0, x - 1);
      for (let yy = y; yy < y + h && yy < maskHeight; yy++) {
        const cols = blackBoundaryCols.get(yy);
        if (cols && cols.has(checkX)) {
          isBlackBoundary = true;
          break;
        }
      }
      // 只有当有黑色边界或gap > 0时，才标记间距区域
      if (isBlackBoundary || gapPxX > 0) {
        const gapToUse = isBlackBoundary ? boundaryGapPxX : gapPxX;
        const startX = Math.max(0, x - gapToUse);
        for (let yy = y; yy < y + h && yy < maskHeight; yy++) {
          const rowOffset = yy * maskWidth;
          const cols = blackBoundaryCols.get(yy);
          for (let xx = startX; xx < x; xx++) {
            // 只有白色区域才能标记（已放置矩形的区域已经标记过了）
            // 使用预计算的边界信息快速判断
            if (!cols || !cols.has(xx)) {
              available[rowOffset + xx] = 0;
            }
          }
        }
      }
    }

    // 右边界
    if (x + w < maskWidth) {
      const rightEdge = x + w;
      // 使用预计算的边界信息快速检查右边缘是否有黑色边界
      let isBlackBoundary = false;
      if (rightEdge < maskWidth) {
        for (let yy = y; yy < y + h && yy < maskHeight; yy++) {
          const cols = blackBoundaryCols.get(yy);
          if (cols && cols.has(rightEdge)) {
            isBlackBoundary = true;
            break;
          }
        }
      }
      if (isBlackBoundary || gapPxX > 0) {
        const gapToUse = isBlackBoundary ? boundaryGapPxX : gapPxX;
        const endX = Math.min(maskWidth, rightEdge + gapToUse);
        for (let yy = y; yy < y + h && yy < maskHeight; yy++) {
          const rowOffset = yy * maskWidth;
          const cols = blackBoundaryCols.get(yy);
          for (let xx = rightEdge; xx < endX; xx++) {
            // 使用预计算的边界信息快速判断
            if (!cols || !cols.has(xx)) {
              available[rowOffset + xx] = 0;
            }
          }
        }
      }
    }

    // 上边界
    if (y > 0) {
      // 使用预计算的边界信息快速检查上边缘是否有黑色边界
      let isBlackBoundary = false;
      const checkY = Math.max(0, y - 1);
      const cols = blackBoundaryCols.get(checkY);
      if (cols) {
        for (let xx = x; xx < x + w && xx < maskWidth; xx++) {
          if (cols.has(xx)) {
            isBlackBoundary = true;
            break;
          }
        }
      }
      if (isBlackBoundary || gapPxY > 0) {
        const gapToUse = isBlackBoundary ? boundaryGapPxY : gapPxY;
        const startY = Math.max(0, y - gapToUse);
        for (let yy = startY; yy < y; yy++) {
          const rowOffset = yy * maskWidth;
          const rowCols = blackBoundaryCols.get(yy);
          for (let xx = x; xx < x + w && xx < maskWidth; xx++) {
            // 使用预计算的边界信息快速判断
            if (!rowCols || !rowCols.has(xx)) {
              available[rowOffset + xx] = 0;
            }
          }
        }
      }
    }

    // 下边界
    if (y + h < maskHeight) {
      const bottomEdge = y + h;
      // 使用预计算的边界信息快速检查下边缘是否有黑色边界
      let isBlackBoundary = false;
      if (bottomEdge < maskHeight) {
        const cols = blackBoundaryCols.get(bottomEdge);
        if (cols) {
          for (let xx = x; xx < x + w && xx < maskWidth; xx++) {
            if (cols.has(xx)) {
              isBlackBoundary = true;
              break;
            }
          }
        }
      }
      if (isBlackBoundary || gapPxY > 0) {
        const gapToUse = isBlackBoundary ? boundaryGapPxY : gapPxY;
        const endY = Math.min(maskHeight, bottomEdge + gapToUse);
        for (let yy = bottomEdge; yy < endY; yy++) {
          const rowOffset = yy * maskWidth;
          const rowCols = blackBoundaryCols.get(yy);
          for (let xx = x; xx < x + w && xx < maskWidth; xx++) {
            // 使用预计算的边界信息快速判断
            if (!rowCols || !rowCols.has(xx)) {
              available[rowOffset + xx] = 0;
            }
          }
        }
      }
    }
  };

  const toMm = (valuePx: number, perMm: number) => valuePx / perMm;

  // 当gap=0时，跟踪已放置矩形的边缘位置，用于优化对齐
  // 优化：限制边缘数量，只保留最近的边缘位置（性能优化）
  const MAX_EDGES = 50; // 最多保留50个边缘位置
  const placedEdges = gapPxX === 0 && gapPxY === 0 ? {
    rightEdges: new Set<number>(), // 已放置矩形的右边缘x坐标
    bottomEdges: new Set<number>(), // 已放置矩形的下边缘y坐标
    // 维护边缘位置的添加顺序（用于限制数量）
    rightEdgesOrder: [] as number[],
    bottomEdgesOrder: [] as number[],
  } : null;

  // 改进的搜索策略：动态生成候选位置，包括已放置矩形的边缘和可用区域的起始点（优化版）
  // 缓存行偏移量，避免重复计算
  const findCandidatePositions = (currentY: number): Array<{ x: number; priority: number }> => {
    const candidates: Array<{ x: number; priority: number }> = [];
    const seenX = new Set<number>();
    const rowOffset = currentY * maskWidth;
    
    // 1. 高优先级：已放置矩形的边缘位置（优先这些位置，因为可以紧密填充）
    if (placedEdges && placedEdges.rightEdges.size > 0) {
      // 预过滤：只考虑在当前行有效的边缘位置
      for (const edgeX of placedEdges.rightEdges) {
        if (edgeX >= 0 && edgeX < maskWidth && !seenX.has(edgeX) && available[rowOffset + edgeX] !== 0) {
          candidates.push({ x: edgeX, priority: 1 });
          seenX.add(edgeX);
        }
      }
    }
    
    // 2. 中优先级：使用更细粒度的步长来查找可用区域的起始位置
    // 使用step/2的步长来捕获更多可用区域的起始点，但不扫描整行（性能优化）
    const fineStepX = Math.max(1, Math.floor(stepPxX / 2));
    for (let x = 0; x < maskWidth; x += fineStepX) {
      if (!seenX.has(x) && available[rowOffset + x] !== 0) {
        // 检查这是否是一个可用区域的起始点（左边不可用或边界）
        if (x === 0 || available[rowOffset + x - 1] === 0) {
          candidates.push({ x: x, priority: 2 });
          seenX.add(x);
        }
      }
    }
    
    // 3. 低优先级：基于步长的常规搜索点（补充覆盖）
    // 只添加未被高/中优先级覆盖的位置
    for (let x = 0; x < maskWidth; x += stepPxX) {
      if (!seenX.has(x)) {
        candidates.push({ x: x, priority: 3 });
        seenX.add(x);
      }
    }
    
    // 优化排序：按优先级分组，只对同优先级内的元素按x坐标排序
    // 这样可以减少排序比较次数
    const byPriority: Array<Array<{ x: number; priority: number }>> = [[], [], []];
    for (const candidate of candidates) {
      byPriority[candidate.priority - 1].push(candidate);
    }
    
    // 只对每个优先级组内排序
    for (const group of byPriority) {
      if (group.length > 1) {
        group.sort((a, b) => a.x - b.x);
      }
    }
    
    // 合并结果（已经按优先级顺序）
    return byPriority.flat();
  };

  // 主循环：按行扫描，放置矩形
  for (let y = 0; y < maskHeight && suggestions.length < maxShapes; y += stepPxY) {
    if (shouldAbort && shouldAbort()) {
      break;
    }
    
    processedRows += 1;
    
    // 在同一行持续尝试放置矩形，直到无法再放置为止
    let placedInRow = true;
    while (placedInRow && suggestions.length < maxShapes) {
      if (shouldAbort && shouldAbort()) {
        break;
      }
      
      placedInRow = false; // 假设本次循环无法放置，如果成功放置则设为true
      
      // 每次循环都重新生成候选位置列表（包含最新添加的边缘位置）
      const candidatePositions = findCandidatePositions(y);
      
      // 对每个候选位置，尝试找到最大的可放置矩形
      for (const candidate of candidatePositions) {
        if (shouldAbort && shouldAbort()) {
          break;
        }
        
        const x = candidate.x;
        if (x >= maskWidth) continue;
        if (!available[y * maskWidth + x]) continue;

        // 尝试所有尺寸组合，找到最大的可放置矩形
        let bestRect: { x: number; y: number; w: number; h: number; area: number } | null = null;
        
        for (const pair of sizePairs) {
          // 检查是否应该中止
          if (shouldAbort && shouldAbort()) {
            break;
          }
          
          const widthPx = Math.max(1, Math.round(pair.widthMm * pxPerMmX));
          const heightPx = Math.max(1, Math.round(pair.heightMm * pxPerMmY));
          if (widthPx < 1 || heightPx < 1) continue;
          
          // 验证是否满足最小宽度和最小高度要求（使用预先计算的值）
          if (widthPx < minWidthPx || heightPx < minHeightPx) continue;
          
          // 初步边界检查（边缘对齐后还会再次检查）
          if (x + widthPx > maskWidth || y + heightPx > maskHeight) continue;

          // 如果gap=0，尝试将位置精确对齐到已放置矩形的边缘
          let finalX = x;
          let finalY = y;
          
          if (placedEdges) {
            // 首先尝试对齐到已放置矩形的边缘（优先X轴，再Y轴）
            // 尝试对齐到已放置矩形的右边缘（X轴对齐）
            // 优化：预过滤边缘位置，只考虑在合理范围内的边缘
            let bestX = finalX;
            let bestScoreX = Infinity;
            const maxDistanceX = Math.min(stepPxX * 2, maskWidth / 4); // 只考虑距离候选位置较近的边缘
            
            for (const edgeX of placedEdges.rightEdges) {
              // 在边缘对齐循环中也检查abort
              if (shouldAbort && shouldAbort()) {
                break;
              }
              // 预过滤：只考虑在合理范围内的边缘
              const distance = Math.abs(edgeX - x);
              if (distance > maxDistanceX) continue;
              
              if (edgeX >= 0 && edgeX < maskWidth && edgeX + widthPx <= maskWidth) {
                const testX = edgeX;
                const rowOffset = y * maskWidth;
                if (testX >= 0 && testX < maskWidth && available[rowOffset + testX]) {
                  const score = distance; // 已经计算过距离，直接使用
                  if (score < bestScoreX) {
                    bestScoreX = score;
                    bestX = testX;
                    // 如果找到非常接近的位置，可以提前退出（性能优化）
                    if (score <= 1) break;
                  }
                }
              }
            }
            if (bestScoreX < Infinity) {
              finalX = bestX;
            }
            
            // 然后尝试对齐到已放置矩形的下边缘（Y轴对齐）
            let bestY = finalY;
            let bestScoreY = Infinity;
            const maxDistanceY = Math.min(stepPxY * 2, maskHeight / 4); // 只考虑距离候选位置较近的边缘
            
            for (const edgeY of placedEdges.bottomEdges) {
              // 在边缘对齐循环中也检查abort
              if (shouldAbort && shouldAbort()) {
                break;
              }
              // 预过滤：只考虑在合理范围内的边缘
              const distance = Math.abs(edgeY - y);
              if (distance > maxDistanceY) continue;
              
              if (edgeY >= 0 && edgeY < maskHeight && edgeY + heightPx <= maskHeight) {
                const testY = edgeY;
                if (testY >= 0 && testY < maskHeight &&
                    available[testY * maskWidth + finalX]) {
                  const score = distance; // 已经计算过距离，直接使用
                  if (score < bestScoreY) {
                    bestScoreY = score;
                    bestY = testY;
                    // 如果找到非常接近的位置，可以提前退出（性能优化）
                    if (score <= 1) break;
                  }
                }
              }
            }
            if (bestScoreY < Infinity) {
              finalY = bestY;
            }
          }

          // 在调用isAreaUnused之前再次检查abort（因为isAreaUnused可能执行很长时间）
          if (shouldAbort && shouldAbort()) {
            break;
          }
          
          // 边缘对齐后，重新检查边界（因为 finalX 和 finalY 可能已改变）
          if (finalX + widthPx > maskWidth || finalY + heightPx > maskHeight) continue;
          
          // 统一检查位置是否可用
          if (!isAreaUnused(finalX, finalY, widthPx, heightPx)) continue;

          const coverage = whiteCoverageRatio(finalX, finalY, widthPx, heightPx);
          if (coverage < coverageThreshold) continue;

          const area = widthPx * heightPx;
          // 记录最大的可放置矩形
          if (!bestRect || area > bestRect.area) {
            bestRect = {
              x: finalX,
              y: finalY,
              w: widthPx,
              h: heightPx,
              area: area
            };
          }
          
          // 由于sizePairs已按面积从大到小排序，找到的第一个可放置矩形就是最大的
          // 但如果当前矩形面积较小，继续搜索可能找到更大的可放置矩形
          // 所以我们继续尝试所有尺寸，选择最大的
        }
        
        // 放置找到的最佳矩形
        if (bestRect) {
          const newSuggestion: RectangleSuggestion = {
            xMm: toMm(bestRect.x, pxPerMmX),
            yMm: toMm(bestRect.y, pxPerMmY),
            widthMm: toMm(bestRect.w, pxPerMmX),
            heightMm: toMm(bestRect.h, pxPerMmY),
          };
          
          suggestions.push(newSuggestion);
          
          // 立即调用回调，通知新矩形已添加
          if (onRectangleAdded) {
            try {
              const maybe = onRectangleAdded(newSuggestion);
              if (maybe instanceof Promise) {
                await maybe;
              }
            } catch (error) {
              console.warn('[suggestRectanglesFromMask] 矩形添加回调异常', error);
            }
          }

          markUsed(bestRect.x, bestRect.y, bestRect.w, bestRect.h);
          
          // 记录已放置矩形的边缘位置（用于gap=0时的对齐优化）
          // 优化：限制边缘数量，只保留最近的边缘位置
          if (placedEdges) {
            const rightEdge = bestRect.x + bestRect.w;
            const bottomEdge = bestRect.y + bestRect.h;
            
            // 添加新的边缘位置
            if (!placedEdges.rightEdges.has(rightEdge)) {
              placedEdges.rightEdges.add(rightEdge);
              placedEdges.rightEdgesOrder.push(rightEdge);
              // 如果超过最大数量，移除最旧的边缘位置
              if (placedEdges.rightEdgesOrder.length > MAX_EDGES) {
                const oldest = placedEdges.rightEdgesOrder.shift()!;
                placedEdges.rightEdges.delete(oldest);
              }
            }
            
            if (!placedEdges.bottomEdges.has(bottomEdge)) {
              placedEdges.bottomEdges.add(bottomEdge);
              placedEdges.bottomEdgesOrder.push(bottomEdge);
              // 如果超过最大数量，移除最旧的边缘位置
              if (placedEdges.bottomEdgesOrder.length > MAX_EDGES) {
                const oldest = placedEdges.bottomEdgesOrder.shift()!;
                placedEdges.bottomEdges.delete(oldest);
              }
            }
          }
          
          // 成功放置了一个矩形，标记为true，继续在同一行尝试
          placedInRow = true;
          break; // 跳出候选位置循环，重新生成候选位置列表后继续
        }
      }
    }

    // 在报告进度前检查abort
    if (shouldAbort && shouldAbort()) {
      break;
    }
    
    await reportProgress();

    if (yieldAfterRows > 0 && processedRows % yieldAfterRows === 0) {
      // 在yield前再次检查abort
      if (shouldAbort && shouldAbort()) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    
    if (shouldAbort && shouldAbort()) {
      break;
    }
  }

  // 移除低效的第二轮扫描，改为在第一轮使用更智能的搜索策略
  // 通过改进的候选位置生成和立即填充策略，可以在单轮扫描中充分利用空间

  processedRows = Math.min(processedRows, totalRows);
  await reportProgress(true);

  return suggestions;
}
