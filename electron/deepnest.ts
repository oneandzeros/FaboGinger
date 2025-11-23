/**
 * Deepnest 集成模块
 * 实现优化的排版算法（作为 Deepnest CLI 的替代方案）
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface NestingConfig {
  materialSvg: string;
  partsSvg: string[];
  rotationMode: 'none' | '90' | 'all';
  spacing: number;
  quality: 'fast' | 'balanced' | 'best';
}

export interface NestingResult {
  resultSvg: string;
  efficiency: number;
  partsPlaced: number;
}

interface PartInfo {
  id: string;
  width: number;
  height: number;
  svg: string;
  rotated: boolean;
  area: number;
}

interface PlacedPart {
  x: number;
  y: number;
  part: PartInfo;
  rotation: number;
}

/**
 * 解析 SVG 获取边界框（改进版）
 */
function parseSvgBounds(svgContent: string): { width: number; height: number; viewBox?: string; x?: number; y?: number } | null {
  try {
    // 优先使用 viewBox
    const viewBoxMatch = svgContent.match(/viewBox=["']([^"']+)["']/);
    if (viewBoxMatch) {
      const [, viewBox] = viewBoxMatch;
      const parts = viewBox.trim().split(/\s+/).map(Number);
      if (parts.length === 4 && parts.every((v) => Number.isFinite(v))) {
        const [x, y, width, height] = parts;
        if (width > 0 && height > 0) {
          return { x, y, width, height, viewBox };
        }
      }
    }

    // 回退到 width/height
    const widthMatch = svgContent.match(/width=["']([^"']+)["']/);
    const heightMatch = svgContent.match(/height=["']([^"']+)["']/);
    
    if (widthMatch && heightMatch) {
      const width = parseFloat(widthMatch[1].replace(/[^0-9.]/g, ''));
      const height = parseFloat(heightMatch[1].replace(/[^0-9.]/g, ''));
      if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
        return { width, height };
      }
    }

    return null;
  } catch (error) {
    console.error('解析 SVG 边界失败:', error);
    return null;
  }
}

/**
 * 优化的矩形装箱算法（Bottom-Left Fill 改进版）
 * 按面积从大到小排序，提高利用率
 */
export async function runNesting(config: NestingConfig): Promise<NestingResult> {
  // 解析材料 SVG 边界
  const materialBounds = parseSvgBounds(config.materialSvg);
  if (!materialBounds || !materialBounds.width || !materialBounds.height) {
    throw new Error('无法解析材料 SVG 边界，请确保 SVG 包含有效的 width/height 或 viewBox 属性');
  }

  const materialWidth = materialBounds.width;
  const materialHeight = materialBounds.height;
  const materialArea = materialWidth * materialHeight;

  if (materialArea <= 0) {
    throw new Error('材料尺寸无效');
  }

  // 解析零件 SVG 边界并准备零件信息
  const parts: PartInfo[] = [];
  for (let i = 0; i < config.partsSvg.length; i++) {
    const partSvg = config.partsSvg[i];
    if (!partSvg || !partSvg.trim()) {
      console.warn(`零件 ${i} 的 SVG 为空，跳过`);
      continue;
    }

    const bounds = parseSvgBounds(partSvg);
    if (!bounds || !bounds.width || !bounds.height) {
      console.warn(`零件 ${i} 的 SVG 边界解析失败，跳过`);
      continue;
    }

    let width = bounds.width;
    let height = bounds.height;
    let rotated = false;
    let rotation = 0;

    // 根据旋转模式优化尺寸
    if (config.rotationMode === '90') {
      // 允许90度旋转，选择更合适的方向
      if (height > width && materialWidth >= height && materialHeight >= width) {
        // 旋转90度后能放下
        [width, height] = [height, width];
        rotated = true;
        rotation = 90;
      } else if (width > height && materialHeight >= width && materialWidth >= height) {
        // 当前方向更合适，不旋转
      }
    } else if (config.rotationMode === 'all') {
      // 尝试所有角度，选择最佳方向（简化：只尝试0和90度）
      if (height > width) {
        [width, height] = [height, width];
        rotated = true;
        rotation = 90;
      }
    }

    // 检查零件是否适合材料
    const partWidth = width + config.spacing * 2;
    const partHeight = height + config.spacing * 2;

    if (partWidth > materialWidth || partHeight > materialHeight) {
      console.warn(`零件 ${i} (${width}x${height}) 太大，无法放入材料 (${materialWidth}x${materialHeight})，跳过`);
      continue;
    }

    parts.push({
      id: `part-${i}`,
      width: partWidth,
      height: partHeight,
      svg: partSvg,
      rotated,
      area: width * height, // 使用实际零件面积，不包括间距
    });
  }

  if (parts.length === 0) {
    throw new Error('没有有效的零件，请确保零件 SVG 包含有效的边界信息且尺寸适合材料');
  }

  // 按面积从大到小排序，优先放置大零件（提高利用率）
  parts.sort((a, b) => b.area - a.area);

  // 优化的装箱算法（改进的贪心 + Bottom-Left Fill）
  // 按面积从大到小排序后，使用改进的放置策略
  const placed: PlacedPart[] = [];
  const occupiedRegions: Array<{ x: number; y: number; width: number; height: number }> = [];
  let totalUsedArea = 0;

  // 根据质量设置步长（影响搜索精度）
  const stepSize = config.quality === 'best' ? config.spacing / 2 : 
                   config.quality === 'balanced' ? config.spacing : 
                   config.spacing * 2;

  for (const part of parts) {
    let bestPosition: { x: number; y: number } | null = null;
    let bestScore = Infinity; // 使用评分系统：y 越小越好，x 越小越好

    // 生成候选位置（使用步长优化性能）
    const candidatePositions: Array<{ x: number; y: number }> = [];
    
    // 先尝试已有的边界位置（Bottom-Left Fill 策略）
    for (const region of occupiedRegions) {
      // 尝试放在已放置零件的右侧
      const rightX = region.x + region.width;
      if (rightX + part.width <= materialWidth) {
        candidatePositions.push({ x: rightX, y: region.y });
      }
      // 尝试放在已放置零件的上方
      const topY = region.y + region.height;
      if (topY + part.height <= materialHeight) {
        candidatePositions.push({ x: region.x, y: topY });
      }
    }

    // 如果没有候选位置，从左上角开始
    if (candidatePositions.length === 0) {
      candidatePositions.push({ x: config.spacing, y: config.spacing });
    }

    // 评估每个候选位置
    for (const pos of candidatePositions) {
      // 检查是否与已放置的零件重叠
      const overlap = occupiedRegions.some(
        (region) =>
          pos.x < region.x + region.width &&
          pos.x + part.width > region.x &&
          pos.y < region.y + region.height &&
          pos.y + part.height > region.y
      );

      if (!overlap && 
          pos.x + part.width <= materialWidth && 
          pos.y + part.height <= materialHeight) {
        // 评分：优先选择靠下靠左的位置
        const score = pos.y * materialWidth + pos.x;
        if (score < bestScore) {
          bestScore = score;
          bestPosition = pos;
        }
      }
    }

    // 如果快速模式没找到位置，尝试更多位置
    if (!bestPosition && config.quality !== 'fast') {
      for (let y = config.spacing; y <= materialHeight - part.height; y += stepSize) {
        for (let x = config.spacing; x <= materialWidth - part.width; x += stepSize) {
          const overlap = occupiedRegions.some(
            (region) =>
              x < region.x + region.width &&
              x + part.width > region.x &&
              y < region.y + region.height &&
              y + part.height > region.y
          );

          if (!overlap) {
            const score = y * materialWidth + x;
            if (score < bestScore) {
              bestScore = score;
              bestPosition = { x, y };
              // 如果质量不是最佳，找到第一个合适位置就停止
              if (config.quality !== 'best') break;
            }
          }
        }
        if (bestPosition && config.quality !== 'best') break;
      }
    }

    // 如果找到位置，放置零件
    if (bestPosition) {
      placed.push({
        x: bestPosition.x,
        y: bestPosition.y,
        part,
        rotation: part.rotated ? 90 : 0,
      });

      // 记录占用区域
      occupiedRegions.push({
        x: bestPosition.x,
        y: bestPosition.y,
        width: part.width,
        height: part.height,
      });

      totalUsedArea += part.area;
    } else {
      console.warn(`零件 ${part.id} 无法放置`);
    }
  }

  // 生成合并后的 SVG
  const resultSvg = await generateResultSvg(config.materialSvg, placed, materialBounds, config.spacing);

  // 计算利用率（只计算实际零件面积，不包括间距）
  const efficiency = totalUsedArea / materialArea;

  return {
    resultSvg,
    efficiency: Math.min(efficiency, 1), // 确保不超过100%
    partsPlaced: placed.length,
  };
}

/**
 * 生成合并后的 SVG（改进版，使用 DOM API）
 */
async function generateResultSvg(
  materialSvg: string,
  placed: PlacedPart[],
  materialBounds: { width: number; height: number; viewBox?: string },
  spacing: number
): Promise<string> {
  try {
    // 创建一个临时的 XML 解析器（在 Node.js 环境中）
    // 注意：Node.js 中没有 DOMParser，我们需要使用字符串操作或安装 xmldom
    
    // 简化方案：使用字符串操作，但更加可靠
    const materialViewBox = materialBounds.viewBox || `0 0 ${materialBounds.width} ${materialBounds.height}`;
    
    // 提取材料 SVG 的主体部分（去掉 </svg> 标签）
    let resultSvg = materialSvg.replace(/<\/svg>\s*$/, '');

    // 确保材料 SVG 有 viewBox
    if (!resultSvg.includes('viewBox=')) {
      resultSvg = resultSvg.replace(/<svg/, `<svg viewBox="${materialViewBox}"`);
    }

    // 创建一个分组来包含所有零件
    resultSvg += `<g id="nested-parts">`;

    // 添加放置的零件
    for (const { x, y, part, rotation } of placed) {
      // 提取零件 SVG 的内容（去掉 <svg> 标签）
      let partContent = part.svg
        .replace(/<svg[^>]*>/, '')
        .replace(/<\/svg>\s*$/, '')
        .trim();

      if (!partContent) continue;

      // 计算零件内容的偏移（考虑间距）
      const offsetX = x + spacing;
      const offsetY = y + spacing;

      // 构建 transform
      let transform = `translate(${offsetX}, ${offsetY})`;
      if (rotation !== 0) {
        // 旋转时需要考虑旋转中心
        const centerX = part.width / 2 - spacing;
        const centerY = part.height / 2 - spacing;
        transform += ` rotate(${rotation} ${centerX} ${centerY})`;
      }

      // 包装零件内容在一个 <g> 中，应用 transform
      const transformedPart = `<g transform="${transform}" data-part-id="${part.id}">${partContent}</g>`;
      resultSvg += transformedPart;
    }

    resultSvg += `</g></svg>`;

    return resultSvg;
  } catch (error) {
    console.error('生成结果 SVG 失败:', error);
    throw new Error(`生成结果 SVG 失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

