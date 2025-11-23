/**
 * 处理参数控制组件
 * 包含自动校正、角点校正、实际尺寸、Potrace参数等控制
 */

import React from 'react';
import { Point } from '../../utils/imageProcessor';

interface ProcessingControlsProps {
  processing: boolean;
  threshold: number | null;
  turdSize: number;
  optTolerance: number;
  actualWidth: number;
  actualHeight: number;
  cornersDirty: boolean;
  applyingCorners: boolean;
  manualCorners: Point[];
  onThresholdChange: (threshold: number | null) => void;
  onTurdSizeChange: (turdSize: number) => void;
  onOptToleranceChange: (optTolerance: number) => void;
  onActualWidthChange: (width: number) => void;
  onActualHeightChange: (height: number) => void;
  onAutoCorrect: () => void;
  onApplyCorners: () => void;
  onProcess: () => void;
}

const ProcessingControls: React.FC<ProcessingControlsProps> = ({
  processing,
  threshold,
  turdSize,
  optTolerance,
  actualWidth,
  actualHeight,
  cornersDirty,
  applyingCorners,
  manualCorners,
  onThresholdChange,
  onTurdSizeChange,
  onOptToleranceChange,
  onActualWidthChange,
  onActualHeightChange,
  onAutoCorrect,
  onApplyCorners,
  onProcess,
}) => {
  return (
    <div className="processing-section">
      <div className="processing-params">
        <h4>自动校正</h4>
        <button className="btn btn-primary" onClick={onAutoCorrect} disabled={processing}>
          {processing ? '处理中…' : '重新自动识别角点'}
        </button>
        <p className="hint">系统会尝试自动识别红色胶带角点并进行透视校正。</p>
      </div>

      <div className="processing-params">
        <h4>角点校正</h4>
        <p className="hint">
          拖动绿色圆点或点击图片添加缺失角点（顺序：左上 → 右上 → 右下 → 左下），以确保透视正确。
        </p>
        <div className={`corner-status ${cornersDirty ? 'dirty' : 'clean'}`}>
          当前状态：{cornersDirty ? '未应用（请点击"应用角点"）' : '已应用'}
        </div>
        <button
          className="btn btn-secondary"
          onClick={onApplyCorners}
          disabled={applyingCorners || manualCorners.length < 3}
        >
          {applyingCorners ? '应用中…' : '应用角点'}
        </button>
        {manualCorners.length < 3 && (
          <small className="hint">至少标记三个角点（建议四个）以完成透视校正。</small>
        )}
      </div>

      <div className="processing-params">
        <h4>实际尺寸（可选）</h4>
        <p className="hint">906一般为603mm×482mm</p>
        <label>
          宽度 (mm)
          <input
            type="number"
            min={0}
            step={0.1}
            value={actualWidth}
            onChange={(e) => onActualWidthChange(Number(e.target.value))}
          />
        </label>
        <label>
          高度 (mm)
          <input
            type="number"
            min={0}
            step={0.1}
            value={actualHeight}
            onChange={(e) => onActualHeightChange(Number(e.target.value))}
          />
        </label>
        <small>用于将 SVG 按真实尺寸缩放。</small>
      </div>

      <div className="processing-params">
        <h4>Potrace 参数</h4>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={threshold === null}
            onChange={(e) => onThresholdChange(e.target.checked ? null : 128)}
          />
          自动阈值
        </label>
        {threshold !== null && (
          <label>
            阈值 {threshold}
            <input
              type="range"
              min={0}
              max={255}
              value={threshold}
              onChange={(e) => onThresholdChange(Number(e.target.value))}
            />
          </label>
        )}
        <label>
          忽略杂点 (turdSize): {turdSize}
          <input
            type="range"
            min={0}
            max={10}
            value={turdSize}
            onChange={(e) => onTurdSizeChange(Number(e.target.value))}
          />
        </label>
        <label>
          平滑容差: {optTolerance.toFixed(2)}
          <input
            type="range"
            min={0}
            max={2}
            step={0.1}
            value={optTolerance}
            onChange={(e) => onOptToleranceChange(Number(e.target.value))}
          />
        </label>
      </div>

      <button className="btn btn-primary btn-process" onClick={onProcess} disabled={processing}>
        {processing ? '处理中…' : '生成SVG'}
      </button>
    </div>
  );
};

export default ProcessingControls;

