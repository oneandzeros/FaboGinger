/**
 * 坐标转换工具函数
 */

import { Point } from './imageProcessor';

/**
 * 将屏幕坐标转换为图片原始坐标
 * @param clientX 屏幕X坐标
 * @param clientY 屏幕Y坐标
 * @param imageElement 图片元素
 * @returns 图片坐标或null（如果坐标不在图片范围内）
 */
export const toImagePoint = (
  clientX: number,
  clientY: number,
  imageElement: HTMLImageElement | null
): Point | null => {
  if (!imageElement) return null;
  const rect = imageElement.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return null;
  const xRatio = (clientX - rect.left) / rect.width;
  const yRatio = (clientY - rect.top) / rect.height;
  if (xRatio < 0 || xRatio > 1 || yRatio < 0 || yRatio > 1) {
    return null;
  }
  return {
    x: xRatio * imageElement.naturalWidth,
    y: yRatio * imageElement.naturalHeight,
  };
};

/**
 * 将坐标限制在图片范围内
 * @param point 坐标点
 * @param imageElement 图片元素
 * @returns 限制后的坐标点
 */
export const clampToImage = (
  point: Point,
  imageElement: HTMLImageElement | null
): Point => {
  if (!imageElement) return point;
  return {
    x: Math.min(Math.max(point.x, 0), imageElement.naturalWidth - 1),
    y: Math.min(Math.max(point.y, 0), imageElement.naturalHeight - 1),
  };
};

/**
 * 将屏幕坐标转换为SVG viewBox坐标系中的坐标
 * @param clientX 屏幕X坐标
 * @param clientY 屏幕Y坐标
 * @param svgElement SVG元素
 * @returns SVG坐标系中的坐标或null
 */
export const toSvgPoint = (
  clientX: number,
  clientY: number,
  svgElement: SVGSVGElement
): { x: number; y: number } | null => {
  if (!svgElement) return null;
  const rect = svgElement.getBoundingClientRect();
  const viewBox = svgElement.viewBox.baseVal;
  const xRatio = (clientX - rect.left) / rect.width;
  const yRatio = (clientY - rect.top) / rect.height;
  return {
    x: viewBox.x + xRatio * viewBox.width,
    y: viewBox.y + yRatio * viewBox.height,
  };
};

