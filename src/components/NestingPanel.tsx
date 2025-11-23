import { useState } from 'react';
import './NestingPanel.css';

interface NestingPanelProps {
  materialSvg: string;
  actualSize?: { width: number; height: number };
  onBack: () => void;
}

const NestingPanel: React.FC<NestingPanelProps> = ({ materialSvg, actualSize, onBack }) => {
  const [outputMessage, setOutputMessage] = useState<string | null>(null);

  const handleRunDeepnest = async () => {
    if (!window.electronAPI) {
      setOutputMessage('Electron API 未初始化');
      return;
    }

    setOutputMessage('正在调用 Deepnest ...');
    const result = await window.electronAPI.runDeepnest({
      materialSvg,
      partsSvg: [],
      outputPath: 'nested-output.svg',
    });

    if (result.success) {
      setOutputMessage(result.message ?? 'Deepnest 调用完成');
    } else {
      setOutputMessage(result.message ?? '调用失败');
    }
  };

  const handleDownload = () => {
    if (!materialSvg) return;
    
    // 生成时间戳（月日时分）
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    const timestamp = `${month}${day}-${hour}${minute}`;
    
    const blob = new Blob([materialSvg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `material-${timestamp}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="nesting-panel">
      <div className="panel-header">
        <button className="btn" onClick={onBack}>← 返回调参</button>
        <div className="size-info">
          {actualSize ? (
            <span>实际尺寸：{actualSize.width.toFixed(1)} × {actualSize.height.toFixed(1)} mm</span>
          ) : (
            <span>未设置实际尺寸</span>
          )}
        </div>
        <button className="btn btn-secondary" onClick={handleDownload}>下载当前 SVG</button>
      </div>

      <div className="material-preview" dangerouslySetInnerHTML={{ __html: materialSvg }} />

      <div className="panel-actions">
        <button className="btn btn-primary" onClick={handleRunDeepnest}>调用 Deepnest 排版</button>
        {outputMessage && <span className="run-message">{outputMessage}</span>}
      </div>
    </div>
  );
};

export default NestingPanel;
