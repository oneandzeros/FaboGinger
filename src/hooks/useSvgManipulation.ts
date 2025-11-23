/**
 * SVG操作自定义Hook
 * 管理SVG的规范化、缩放、预览等操作
 */

import { useMemo } from 'react';
import { SvgProcessResult } from '../utils/imageProcessor';
import { parseSvgViewBox, getBoundaryBoxBounds } from '../utils/svgUtils';

interface UseSvgManipulationProps {
  svgResult: SvgProcessResult | null;
  hasBoundaryBox: boolean;
  actualWidth: number;
  actualHeight: number;
}

interface UseSvgManipulationReturn {
  previewSvg: string | null;
  normalizeBoundaryBoxDimensions: (svgString: string) => string;
  scaleSvgToBoundaryBox: (svgString: string) => string;
}

export const useSvgManipulation = ({
  svgResult,
  hasBoundaryBox,
  actualWidth,
  actualHeight,
}: UseSvgManipulationProps): UseSvgManipulationReturn => {
  // 规范化边界框尺寸
  const normalizeBoundaryBoxDimensions = (svgString: string): string => {
    if (typeof DOMParser === 'undefined' || typeof XMLSerializer === 'undefined') {
      return svgString;
    }
    if (!svgResult) return svgString;

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgString, 'image/svg+xml');
      const root = doc.documentElement as SVGSVGElement | null;
      if (!root || root.tagName.toLowerCase() !== 'svg') {
        return svgString;
      }

      const boundaryBox = root.querySelector('[data-boundary-box="true"]') as SVGRectElement | null;
      if (!boundaryBox) return svgString;

      const bounds = parseSvgViewBox(root);
      if (!bounds) return svgString;

      // 从边界框的data属性读取物理尺寸（如果不存在则使用默认值）
      const boundaryWidthMm = parseFloat(boundaryBox.getAttribute('data-boundary-width-mm') || '600');
      const boundaryHeightMm = parseFloat(boundaryBox.getAttribute('data-boundary-height-mm') || '400');

      // 计算在原始viewBox坐标系中的像素尺寸
      const originalPxPerMmX = svgResult.viewWidth / svgResult.widthMm;
      const originalPxPerMmY = svgResult.viewHeight / svgResult.heightMm;
      const boundaryWidthPxOriginal = boundaryWidthMm * originalPxPerMmX;
      const boundaryHeightPxOriginal = boundaryHeightMm * originalPxPerMmY;

      // 获取当前边界框位置
      let currentX = parseFloat(boundaryBox.getAttribute('x') || '0');
      let currentY = parseFloat(boundaryBox.getAttribute('y') || '0');

      // 更新边界框的尺寸
      boundaryBox.setAttribute('width', `${boundaryWidthPxOriginal}`);
      boundaryBox.setAttribute('height', `${boundaryHeightPxOriginal}`);

      // 确保边界框在原始viewBox范围内
      const originalBounds = {
        x: 0,
        y: 0,
        width: svgResult.viewWidth,
        height: svgResult.viewHeight
      };
      const maxX = originalBounds.x + originalBounds.width - boundaryWidthPxOriginal;
      const maxY = originalBounds.y + originalBounds.height - boundaryHeightPxOriginal;

      if (currentX < originalBounds.x || currentX > maxX || currentY < originalBounds.y || currentY > maxY) {
        // 超出范围，重新居中
        const centerX = originalBounds.x + originalBounds.width / 2;
        const centerY = originalBounds.y + originalBounds.height / 2;
        currentX = centerX - boundaryWidthPxOriginal / 2;
        currentY = centerY - boundaryHeightPxOriginal / 2;
      } else {
        // 在范围内，但确保不超出边界
        currentX = Math.max(originalBounds.x, Math.min(currentX, maxX));
        currentY = Math.max(originalBounds.y, Math.min(currentY, maxY));
      }

      boundaryBox.setAttribute('x', `${currentX}`);
      boundaryBox.setAttribute('y', `${currentY}`);

      // 更新保存的物理尺寸信息
      boundaryBox.setAttribute('data-boundary-width-mm', `${boundaryWidthMm}`);
      boundaryBox.setAttribute('data-boundary-height-mm', `${boundaryHeightMm}`);

      return new XMLSerializer().serializeToString(doc);
    } catch (error) {
      console.warn('[normalizeBoundaryBoxDimensions] 规范化边界框尺寸失败', error);
      return svgString;
    }
  };

  // 缩放SVG到边界框
  const scaleSvgToBoundaryBox = (svgString: string): string => {
    if (typeof DOMParser === 'undefined' || typeof XMLSerializer === 'undefined') {
      return svgString;
    }
    if (!svgResult) return svgString;

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgString, 'image/svg+xml');
      const root = doc.documentElement as SVGSVGElement | null;
      if (!root || root.tagName.toLowerCase() !== 'svg') {
        return svgString;
      }

      const boundaryBox = root.querySelector('[data-boundary-box="true"]') as SVGRectElement | null;
      if (!boundaryBox) return svgString;

      // 获取边界框的位置和尺寸
      const boundaryX = parseFloat(boundaryBox.getAttribute('x') || '0');
      const boundaryY = parseFloat(boundaryBox.getAttribute('y') || '0');
      const boundaryWidthPx = parseFloat(boundaryBox.getAttribute('width') || '0');
      const boundaryHeightPx = parseFloat(boundaryBox.getAttribute('height') || '0');

      if (boundaryWidthPx <= 0 || boundaryHeightPx <= 0) return svgString;

      // 使用getBBox获取边界框的实际位置
      let bboxX = boundaryX;
      let bboxY = boundaryY;
      let bboxWidth = boundaryWidthPx;
      let bboxHeight = boundaryHeightPx;

      try {
        const tempSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        const currentViewBox = root.getAttribute('viewBox') || '';
        tempSvg.setAttribute('viewBox', currentViewBox);
        tempSvg.style.position = 'absolute';
        tempSvg.style.visibility = 'hidden';
        tempSvg.style.width = '0';
        tempSvg.style.height = '0';
        document.body.appendChild(tempSvg);

        const tempRoot = root.cloneNode(true) as SVGSVGElement;
        tempSvg.appendChild(tempRoot);

        const tempBoundaryBox = tempRoot.querySelector('[data-boundary-box="true"]') as SVGRectElement;
        if (tempBoundaryBox) {
          const bbox = tempBoundaryBox.getBBox();
          bboxX = bbox.x;
          bboxY = bbox.y;
          bboxWidth = bbox.width;
          bboxHeight = bbox.height;
        }

        document.body.removeChild(tempSvg);
      } catch (error) {
        console.warn('[scaleSvgToBoundaryBox] 无法使用getBBox，使用直接属性值', error);
      }

      // 调整整个SVG的transform，使边界框对齐到(0,0)
      const boundaryParent = boundaryBox.parentElement;
      if (boundaryParent && boundaryParent !== root) {
        const existingTransform = boundaryParent.getAttribute('transform') || '';
        const translateX = -bboxX;
        const translateY = -bboxY;
        const newTransform = existingTransform
          ? `translate(${translateX}, ${translateY}) ${existingTransform}`
          : `translate(${translateX}, ${translateY})`;
        boundaryParent.setAttribute('transform', newTransform);
      } else {
        boundaryBox.setAttribute('x', '0');
        boundaryBox.setAttribute('y', '0');
      }

      // 将viewBox设置为边界框的尺寸
      root.setAttribute('viewBox', `0 0 ${bboxWidth} ${bboxHeight}`);

      // 设置SVG的物理尺寸为用户输入的值
      root.setAttribute('width', `${actualWidth}mm`);
      root.setAttribute('height', `${actualHeight}mm`);

      return new XMLSerializer().serializeToString(doc);
    } catch (error) {
      console.warn('[scaleSvgToBoundaryBox] 缩放SVG到边界框失败', error);
      return svgString;
    }
  };

  // 预览SVG
  const previewSvg = useMemo(() => {
    if (!svgResult) return null;
    if (typeof DOMParser === 'undefined' || typeof XMLSerializer === 'undefined') {
      return svgResult.svg;
    }
    try {
      let svgToProcess = svgResult.svg;

      // 如果存在边界框，规范化边界框尺寸
      if (hasBoundaryBox) {
        try {
          svgToProcess = normalizeBoundaryBoxDimensions(svgToProcess);
        } catch (error) {
          console.warn('[previewSvg] 规范化边界框尺寸失败，继续使用原始SVG', error);
        }
      }

      const parser = new DOMParser();
      const doc = parser.parseFromString(svgToProcess, 'image/svg+xml');
      const root = doc.documentElement as SVGSVGElement | null;
      if (!root || root.tagName.toLowerCase() !== 'svg') {
        return svgToProcess;
      }
      root.removeAttribute('width');
      root.removeAttribute('height');
      if (!root.getAttribute('preserveAspectRatio')) {
        root.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      }
      const existingStyle = root.getAttribute('style') ?? '';
      const normalizedStyle = existingStyle
        .split(';')
        .map((item) => item.trim())
        .filter(Boolean)
        .filter((item) => {
          const lowered = item.toLowerCase();
          return !lowered.startsWith('width:') && !lowered.startsWith('height:') && !lowered.startsWith('max-width:') && !lowered.startsWith('max-height:');
        });
      normalizedStyle.push('width:100%', 'height:auto', 'max-width:100%', 'max-height:100%', 'display:block');
      root.setAttribute('style', normalizedStyle.join(';'));
      return new XMLSerializer().serializeToString(doc);
    } catch (error) {
      console.warn('[ImageProcessor] 预览 SVG 缩放失败', error);
      return svgResult.svg;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [svgResult?.svg, hasBoundaryBox]);

  return {
    previewSvg,
    normalizeBoundaryBoxDimensions,
    scaleSvgToBoundaryBox,
  };
};

