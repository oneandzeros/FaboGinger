/**
 * 边界框管理组件
 * 负责边界框的添加和管理
 */

import React from 'react';

interface BoundaryBoxManagerProps {
  hasBoundaryBox: boolean;
  boundaryBoxWidthMm: number;
  boundaryBoxHeightMm: number;
  onWidthChange: (width: number) => void;
  onHeightChange: (height: number) => void;
  onAddBoundaryBox: () => void;
  onClearShapes: () => void;
}

const BoundaryBoxManager: React.FC<BoundaryBoxManagerProps> = ({
  hasBoundaryBox,
  boundaryBoxWidthMm,
  boundaryBoxHeightMm,
  onWidthChange,
  onHeightChange,
  onAddBoundaryBox,
  onClearShapes,
}) => {
  return (
    <div className="shape-section">
      <h5>【管理操作】</h5>
      <div className="shape-control-grid">
        <label>
          边界框宽度 (mm)
          <input
            type="number"
            min={1}
            step={1}
            value={boundaryBoxWidthMm}
            onChange={(e) => {
              const value = Number(e.target.value);
              onWidthChange(Number.isFinite(value) ? Math.max(1, value) : 600);
            }}
          />
        </label>
        <label>
          边界框高度 (mm)
          <input
            type="number"
            min={1}
            step={1}
            value={boundaryBoxHeightMm}
            onChange={(e) => {
              const value = Number(e.target.value);
              onHeightChange(Number.isFinite(value) ? Math.max(1, value) : 400);
            }}
          />
        </label>
      </div>
      <div className="shape-buttons">
        <button className="btn btn-secondary" onClick={onAddBoundaryBox}>
          {hasBoundaryBox ? '重新添加边界框' : '添加边界框'}
        </button>
        <button className="btn btn-secondary" onClick={onClearShapes}>
          清空追加图形
        </button>
      </div>
    </div>
  );
};

export default BoundaryBoxManager;

