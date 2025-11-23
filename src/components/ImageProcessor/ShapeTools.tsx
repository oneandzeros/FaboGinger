/**
 * 图形工具组件
 * 包含手动添加图形和自动填充功能
 */

import React from 'react';
import { RectanglePackingProgress } from '../../utils/imageProcessor';
import { ShapeMessageTone } from '../../hooks/useShapeTools';

interface ShapeState {
  padding: number;
  cornerRadius: number;
  strokeWidth: number;
  strokeColor: string;
  gap: number;
  step: number;
}

interface ShapeToolsProps {
  hasBoundaryBox: boolean;
  shapeState: ShapeState;
  onShapeStateChange: (updates: Partial<ShapeState>) => void;
  onAddShape: (shape: 'roundedRect' | 'circle') => void;
  onAutoFill: () => void;
  onStopAutoFill: () => void;
  autoFilling: boolean;
  autoFillProgress: RectanglePackingProgress | null;
  shapeMessage: string | null;
  shapeMessageTone: ShapeMessageTone;
}

const ShapeTools: React.FC<ShapeToolsProps> = ({
  hasBoundaryBox,
  shapeState,
  onShapeStateChange,
  onAddShape,
  onAutoFill,
  onStopAutoFill,
  autoFilling,
  autoFillProgress,
  shapeMessage,
  shapeMessageTone,
}) => {
  return (
    <>
      {/* 手动添加图形区域 */}
      <div className="shape-section">
        <h5>【手动添加图形】</h5>
        <div className="shape-control-grid">
          <label>
            留白
            <input
              type="number"
              min={0}
              step={1}
              value={shapeState.padding}
              onChange={(e) => {
                const value = Number(e.target.value);
                onShapeStateChange({ padding: Number.isFinite(value) ? Math.max(0, value) : 0 });
              }}
            />
          </label>
          <label>
            圆角
            <input
              type="number"
              min={0}
              step={1}
              value={shapeState.cornerRadius}
              onChange={(e) => {
                const value = Number(e.target.value);
                onShapeStateChange({ cornerRadius: Number.isFinite(value) ? Math.max(0, value) : 0 });
              }}
            />
          </label>
          <label>
            线宽
            <input
              type="number"
              min={0.1}
              step={0.1}
              value={shapeState.strokeWidth}
              onChange={(e) => {
                const value = Number(e.target.value);
                onShapeStateChange({ strokeWidth: Number.isFinite(value) ? Math.max(0.1, value) : 0.1 });
              }}
            />
          </label>
          <label className="color-picker">
            颜色
            <input
              type="color"
              value={shapeState.strokeColor}
              onChange={(e) => onShapeStateChange({ strokeColor: e.target.value })}
            />
          </label>
        </div>
        <div className="shape-buttons">
          <button
            className="btn btn-secondary"
            onClick={() => onAddShape('roundedRect')}
            disabled={!hasBoundaryBox}
            title={!hasBoundaryBox ? '请先添加边界框' : ''}
          >
            添加圆角矩形
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => onAddShape('circle')}
            disabled={!hasBoundaryBox}
            title={!hasBoundaryBox ? '请先添加边界框' : ''}
          >
            添加圆形
          </button>
        </div>
      </div>

      {/* 自动填充矩形区域 */}
      <div className="shape-section">
        <h5>【自动填充矩形】</h5>
        <div className="shape-control-grid">
          <label>
            留白
            <input
              type="number"
              min={0}
              step={1}
              value={shapeState.padding}
              onChange={(e) => {
                const value = Number(e.target.value);
                onShapeStateChange({ padding: Number.isFinite(value) ? Math.max(0, value) : 0 });
              }}
            />
          </label>
          <label>
            圆角
            <input
              type="number"
              min={0}
              step={1}
              value={shapeState.cornerRadius}
              onChange={(e) => {
                const value = Number(e.target.value);
                onShapeStateChange({ cornerRadius: Number.isFinite(value) ? Math.max(0, value) : 0 });
              }}
            />
          </label>
          <label>
            线宽
            <input
              type="number"
              min={0.1}
              step={0.1}
              value={shapeState.strokeWidth}
              onChange={(e) => {
                const value = Number(e.target.value);
                onShapeStateChange({ strokeWidth: Number.isFinite(value) ? Math.max(0.1, value) : 0.1 });
              }}
            />
          </label>
          <label className="color-picker">
            颜色
            <input
              type="color"
              value={shapeState.strokeColor}
              onChange={(e) => onShapeStateChange({ strokeColor: e.target.value })}
            />
          </label>
          <label>
            矩形间距 (mm)
            <input
              type="number"
              min={0}
              step={1}
              value={shapeState.gap}
              onChange={(e) => {
                const value = Number(e.target.value);
                onShapeStateChange({ gap: Number.isFinite(value) ? Math.max(0, value) : 0 });
              }}
            />
          </label>
          <label>
            扫描步长 (mm)
            <input
              type="number"
              min={1.0}
              step={0.1}
              value={shapeState.step}
              onChange={(e) => {
                const value = Number(e.target.value);
                onShapeStateChange({ step: Number.isFinite(value) ? Math.max(1.0, value) : 1.0 });
              }}
            />
          </label>
        </div>
        <div className="shape-buttons">
          <button
            className="btn btn-primary"
            onClick={onAutoFill}
            disabled={autoFilling || !hasBoundaryBox}
            title={!hasBoundaryBox ? '请先添加边界框' : ''}
          >
            {autoFilling ? '自动填充中…' : '自动填充矩形'}
          </button>
          {autoFilling && (
            <button className="btn btn-secondary" onClick={onStopAutoFill}>
              停止
            </button>
          )}
        </div>
        {autoFilling && autoFillProgress && (
          <div className="shape-progress">
            <span>扫描进度 {Math.round((autoFillProgress.progress ?? 0) * 100)}%</span>
            <span>
              行程 {autoFillProgress.processedRows}
              {autoFillProgress.totalRows ? ` / ${autoFillProgress.totalRows}` : ''}
            </span>
            <span>已放置 {autoFillProgress.suggestions} 个矩形</span>
          </div>
        )}
      </div>

      {/* 消息显示 */}
      {shapeMessage && (
        <div className={`shape-message ${shapeMessageTone}`}>
          {autoFilling && <span className="shape-spinner" aria-hidden="true" />}
          {shapeMessage}
        </div>
      )}
    </>
  );
};

export default ShapeTools;

