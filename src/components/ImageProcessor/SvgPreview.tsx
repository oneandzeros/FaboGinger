/**
 * SVG预览组件
 * 负责SVG的显示和预览
 */

import React, { RefObject } from 'react';
import { SvgProcessResult } from '../../utils/imageProcessor';

interface SvgPreviewProps {
  svgResult: SvgProcessResult | null;
  previewSvg: string | null;
  svgContainerRef: RefObject<HTMLDivElement>;
}

const SvgPreview: React.FC<SvgPreviewProps> = ({
  svgResult,
  previewSvg,
  svgContainerRef,
}) => {
  if (!svgResult) return null;

  return (
    <div className="svg-preview">
      <h3>生成的SVG</h3>
      <div className="svg-container" ref={svgContainerRef}>
        <div
          className="svg-preview-area"
          style={
            svgResult.viewWidth > 0 && svgResult.viewHeight > 0
              ? { aspectRatio: svgResult.viewWidth / svgResult.viewHeight }
              : undefined
          }
          dangerouslySetInnerHTML={{ __html: previewSvg ?? svgResult.svg }}
        />
      </div>
    </div>
  );
};

export default SvgPreview;

