import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeftIcon, DownloadIcon, UploadIcon, PlayIcon, XIcon } from './Icons';
import './NestingPanel.css';

interface PartSvg {
  id: string;
  name: string;
  content: string;
}

interface NestingPanelProps {
  materialSvg: string;
  actualSize?: { width: number; height: number };
  onBack: () => void;
}

const NestingPanel: React.FC<NestingPanelProps> = ({ materialSvg, actualSize, onBack }) => {
  const { t } = useTranslation();
  const [partsSvg, setPartsSvg] = useState<PartSvg[]>([]);
  const [nestedResult, setNestedResult] = useState<string | null>(null);
  const [efficiency, setEfficiency] = useState<number | null>(null);
  const [partsPlaced, setPartsPlaced] = useState<number>(0);
  const [outputMessage, setOutputMessage] = useState<string | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [rotationMode, setRotationMode] = useState<'none' | '90' | 'all'>('90');
  const [spacing, setSpacing] = useState<number>(2);
  const [quality, setQuality] = useState<'fast' | 'balanced' | 'best'>('balanced');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadParts = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newParts: PartSvg[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.name.toLowerCase().endsWith('.svg')) {
        setOutputMessage(t('nestingPanel.error.invalidSvg', { defaultValue: '无效的 SVG 文件' }));
        continue;
      }

      try {
        const content = await file.text();
        newParts.push({
          id: `${Date.now()}-${i}`,
          name: file.name,
          content,
        });
      } catch (error) {
        setOutputMessage(t('nestingPanel.error.uploadFailed', { 
          defaultValue: '上传失败：{{message}}', 
          message: error instanceof Error ? error.message : String(error) 
        }));
      }
    }

    if (newParts.length > 0) {
      setPartsSvg((prev) => [...prev, ...newParts]);
    }

    // 重置 input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemovePart = (id: string) => {
    setPartsSvg((prev) => prev.filter((part) => part.id !== id));
    // 如果删除零件后结果失效，清空结果
    if (nestedResult) {
      setNestedResult(null);
      setEfficiency(null);
      setPartsPlaced(0);
    }
  };

  const handleRunDeepnest = async () => {
    if (!window.electronAPI) {
      setOutputMessage(t('nestingPanel.error.electronNotInit', { defaultValue: 'Electron API 未初始化' }));
      return;
    }

    if (partsSvg.length === 0) {
      setOutputMessage(t('nestingPanel.error.noParts', { defaultValue: '请至少上传一个零件 SVG' }));
      return;
    }

    setIsOptimizing(true);
    setOutputMessage(t('nestingPanel.optimizing', { defaultValue: '优化中…' }));
    setNestedResult(null);
    setEfficiency(null);
    setPartsPlaced(0);

    try {
      const result = await window.electronAPI.runDeepnest({
        materialSvg,
        partsSvg: partsSvg.map((part) => part.content),
        outputPath: 'nested-output.svg',
        rotationMode,
        spacing,
        quality,
      });

      if (result.success) {
        if (result.resultSvg) {
          setNestedResult(result.resultSvg);
        }
        if (result.efficiency !== undefined) {
          setEfficiency(result.efficiency);
        }
        if (result.partsPlaced !== undefined) {
          setPartsPlaced(result.partsPlaced);
        }
        setOutputMessage(result.message ?? t('nestingPanel.deepnestComplete', { defaultValue: 'Deepnest 调用完成' }));
      } else {
        setOutputMessage(result.message ?? t('nestingPanel.deepnestFailed', { defaultValue: '调用失败' }));
      }
    } catch (error) {
      setOutputMessage(
        t('nestingPanel.deepnestFailed', { defaultValue: '调用失败' }) + 
        (error instanceof Error ? `: ${error.message}` : '')
      );
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleDownload = () => {
    const svgToDownload = nestedResult || materialSvg;
    if (!svgToDownload) return;
    
    // 生成时间戳（月日时分）
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    const timestamp = `${month}${day}${hour}${minute}`;
    
    const filename = nestedResult 
      ? `nested-result${timestamp}.svg` 
      : `material${timestamp}.svg`;
    
    const blob = new Blob([svgToDownload], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const displaySvg = nestedResult || materialSvg;

  return (
    <div className="nesting-panel">
      <div className="panel-header">
        <button className="btn btn-secondary" onClick={onBack}>
          <ArrowLeftIcon size={18} />
          <span>{t('nestingPanel.back')}</span>
        </button>
        <div className="size-info">
          {actualSize ? (
            <span>{t('nestingPanel.actualSize', { width: actualSize.width.toFixed(1), height: actualSize.height.toFixed(1) })}</span>
          ) : (
            <span>{t('nestingPanel.noActualSize', { defaultValue: '未设置实际尺寸' })}</span>
          )}
        </div>
        <button className="btn btn-secondary" onClick={handleDownload}>
          <DownloadIcon size={18} />
          <span>{nestedResult ? t('nestingPanel.downloadResult', { defaultValue: '下载排版结果' }) : t('nestingPanel.download')}</span>
        </button>
      </div>

      <div className="nesting-content">
        <div className="nesting-left">
          {/* 零件上传区域 */}
          <div className="nesting-section">
            <h4>{t('nestingPanel.partsSection.title', { defaultValue: '零件文件' })}</h4>
            <input
              ref={fileInputRef}
              type="file"
              accept=".svg"
              multiple
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <button className="btn btn-secondary" onClick={handleUploadParts}>
              <UploadIcon size={18} />
              <span>{t('nestingPanel.partsSection.uploadParts', { defaultValue: '上传零件 SVG' })}</span>
            </button>
            <p className="hint">{t('nestingPanel.partsSection.uploadHint', { defaultValue: '可以上传多个 SVG 文件作为要排版的零件' })}</p>
            
            {partsSvg.length === 0 ? (
              <p className="no-parts">{t('nestingPanel.partsSection.noParts', { defaultValue: '尚未上传零件' })}</p>
            ) : (
              <>
                <p className="parts-count">{t('nestingPanel.partsSection.partsCount', { count: partsSvg.length, defaultValue: '已上传 {{count}} 个零件' })}</p>
                <div className="parts-list">
                  {partsSvg.map((part) => (
                    <div key={part.id} className="part-item">
                      <span className="part-name">{part.name}</span>
                      <button className="btn btn-small btn-secondary" onClick={() => handleRemovePart(part.id)}>
                        <XIcon size={14} />
                        <span>{t('nestingPanel.partsSection.removePart', { defaultValue: '删除' })}</span>
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* 参数配置区域 */}
          <div className="nesting-section">
            <h4>{t('nestingPanel.parametersSection.title', { defaultValue: '排版参数' })}</h4>
            <div className="param-group">
              <label>
                {t('nestingPanel.parametersSection.rotation', { defaultValue: '允许旋转角度' })}
                <select value={rotationMode} onChange={(e) => setRotationMode(e.target.value as 'none' | '90' | 'all')}>
                  <option value="none">{t('nestingPanel.parametersSection.rotationNone', { defaultValue: '不允许旋转' })}</option>
                  <option value="90">{t('nestingPanel.parametersSection.rotation90', { defaultValue: '仅 90° 倍数' })}</option>
                  <option value="all">{t('nestingPanel.parametersSection.rotationAll', { defaultValue: '允许所有角度' })}</option>
                </select>
              </label>
              <label>
                {t('nestingPanel.parametersSection.spacing', { defaultValue: '零件间距 (mm)' })}
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={spacing}
                  onChange={(e) => setSpacing(Number(e.target.value))}
                />
              </label>
              <label>
                {t('nestingPanel.parametersSection.quality', { defaultValue: '排版质量' })}
                <select value={quality} onChange={(e) => setQuality(e.target.value as 'fast' | 'balanced' | 'best')}>
                  <option value="fast">{t('nestingPanel.parametersSection.qualityFast', { defaultValue: '快速' })}</option>
                  <option value="balanced">{t('nestingPanel.parametersSection.qualityBalanced', { defaultValue: '平衡' })}</option>
                  <option value="best">{t('nestingPanel.parametersSection.qualityBest', { defaultValue: '最佳' })}</option>
                </select>
              </label>
            </div>
          </div>

          {/* 排版按钮和状态 */}
          <div className="nesting-section">
            <button 
              className="btn btn-primary" 
              onClick={handleRunDeepnest}
              disabled={isOptimizing || partsSvg.length === 0}
            >
              <PlayIcon size={18} />
              <span>{isOptimizing ? t('nestingPanel.optimizing', { defaultValue: '优化中…' }) : t('nestingPanel.optimize')}</span>
            </button>
            {outputMessage && <p className={`run-message ${nestedResult ? 'success' : ''}`}>{outputMessage}</p>}
          </div>

          {/* 结果统计 */}
          {nestedResult && (
            <div className="nesting-section result-section">
              <h4>{t('nestingPanel.resultSection.title', { defaultValue: '排版结果' })}</h4>
              {efficiency !== null && (
                <div className="result-stat">
                  <span>{t('nestingPanel.resultSection.efficiency', { defaultValue: '材料利用率' })}: </span>
                  <strong>{(efficiency * 100).toFixed(1)}%</strong>
                </div>
              )}
              {partsPlaced > 0 && (
                <div className="result-stat">
                  <span>{t('nestingPanel.resultSection.partsPlaced', { defaultValue: '已放置零件' })}: </span>
                  <strong>{t('nestingPanel.resultSection.partsTotal', { total: partsPlaced, defaultValue: '共 {{total}} 个' })}</strong>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 预览区域 */}
        <div className="nesting-right">
          <div className="preview-container">
            <h4>{nestedResult ? t('nestingPanel.resultSection.title', { defaultValue: '排版结果' }) : t('nestingPanel.materialInfo', { defaultValue: '余料信息' })}</h4>
            <div className="material-preview" dangerouslySetInnerHTML={{ __html: displaySvg }} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default NestingPanel;
