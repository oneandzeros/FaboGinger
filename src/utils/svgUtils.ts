/**
 * SVG操作工具函数
 */

/**
 * 解析SVG的viewBox属性
 * @param root SVG根元素
 * @returns viewBox对象或null
 */
export const parseSvgViewBox = (
  root: SVGSVGElement
): { x: number; y: number; width: number; height: number } | null => {
  const raw = root.getAttribute('viewBox');
  if (raw) {
    const parts = raw
      .replace(/,/g, ' ')
      .trim()
      .split(/\s+/)
      .map(Number);
    if (parts.length === 4 && parts.every((value) => Number.isFinite(value))) {
      const [x, y, width, height] = parts;
      if (width > 0 && height > 0) {
        return { x, y, width, height };
      }
    }
  }

  const parseDimension = (value: string | null): number => {
    if (!value) return NaN;
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : NaN;
  };

  const width = parseDimension(root.getAttribute('width'));
  const height = parseDimension(root.getAttribute('height'));
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }
  root.setAttribute('viewBox', `0 0 ${width} ${height}`);
  return { x: 0, y: 0, width, height };
};

/**
 * 检查SVG中是否存在边界框
 * @param svgString SVG字符串
 * @returns 是否存在边界框
 */
export const checkBoundaryBoxExists = (svgString: string): boolean => {
  if (typeof DOMParser === 'undefined') return false;
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');
    const root = doc.documentElement;
    if (!root) return false;
    const boundaryBox = root.querySelector('[data-boundary-box="true"]');
    return boundaryBox !== null;
  } catch {
    return false;
  }
};

/**
 * 获取边界框的边界信息
 * @param svgString SVG字符串
 * @returns 边界框边界信息或null
 */
export const getBoundaryBoxBounds = (
  svgString: string
): { x: number; y: number; width: number; height: number } | null => {
  if (typeof DOMParser === 'undefined') return null;
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');
    const root = doc.documentElement;
    if (!root) return null;
    const boundaryBox = root.querySelector('[data-boundary-box="true"]') as SVGRectElement | null;
    if (!boundaryBox) return null;

    const x = parseFloat(boundaryBox.getAttribute('x') || '0');
    const y = parseFloat(boundaryBox.getAttribute('y') || '0');
    const width = parseFloat(boundaryBox.getAttribute('width') || '0');
    const height = parseFloat(boundaryBox.getAttribute('height') || '0');

    if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(width) && Number.isFinite(height)) {
      return { x, y, width, height };
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * 更新SVG中边界框的位置
 * @param svgString SVG字符串
 * @param newX 新X坐标
 * @param newY 新Y坐标
 * @returns 更新后的SVG字符串
 */
export const updateBoundaryBoxPosition = (
  svgString: string,
  newX: number,
  newY: number
): string | null => {
  if (typeof DOMParser === 'undefined' || typeof XMLSerializer === 'undefined') return null;
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');
    const root = doc.documentElement as SVGSVGElement | null;
    if (!root) return null;
    const boundaryBox = root.querySelector('[data-boundary-box="true"]') as SVGRectElement | null;
    if (!boundaryBox) return null;
    boundaryBox.setAttribute('x', `${newX}`);
    boundaryBox.setAttribute('y', `${newY}`);
    return new XMLSerializer().serializeToString(doc);
  } catch (error) {
    console.warn('[updateBoundaryBoxPosition] 更新失败', error);
    return null;
  }
};

