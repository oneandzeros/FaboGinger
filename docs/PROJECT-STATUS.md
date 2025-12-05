# FaboGinger 项目状态梳理

**更新时间**: 2024-11-23  
**当前版本**: 1.0.1

---

## 📋 项目概述

FaboGinger 是一个基于 **Electron + React** 的桌面应用程序，专门用于**激光切割余料的再利用**。通过拍照识别剩余材料、自动透视校正、位图描摹和排版优化，帮助用户最大化利用激光切割后的剩余材料。

### 核心价值
- 📸 **拍照识别**：快速捕获余料图像
- 🔄 **自动校正**：智能透视变换，将倾斜拍摄的图像校正为正视图
- 🎨 **矢量转换**：使用 Potrace 将位图转换为高质量 SVG
- 📐 **排版优化**：智能排版零件，最大化材料利用率

---

## 🎯 三步工作流程

### 1️⃣ 拍摄余料 (Capture Material)
- ✅ 摄像头实时拍照
- ✅ 上传本地图片
- ✅ 图片旋转调整

### 2️⃣ 处理图像 (Process Image)
- ✅ **自动透视校正**：自动检测红色标记角点
- ✅ **手动角点校正**：支持拖动/点击调整角点
- ✅ **实际尺寸设置**：支持设置材料物理尺寸（如 603mm × 482mm）
- ✅ **Potrace 位图描摹**：转换为高质量 SVG 矢量图
- ✅ **边界框管理**：添加、调整、拖拽边界框
- ✅ **基础图形工具**：
  - 手动添加圆角矩形和圆形
  - 自动填充矩形（智能扫描空白区域）
- ✅ **SVG 预览与编辑**：实时预览、缩放、拖拽

### 3️⃣ 排版优化 (Nesting Optimization)
- ✅ 查看材料 SVG 轮廓
- ✅ 零件 SVG 上传（支持多文件）
- ✅ 排版参数配置（旋转、间距、质量）
- ✅ 基础排版算法（贪心装箱算法）
- ✅ 排版结果预览
- ✅ 材料利用率统计
- ✅ 导出 SVG 文件
- 🔄 Deepnest CLI 集成（计划中）

---

## 🛠 技术栈

### 核心框架
- **前端**: React 18.2 + TypeScript
- **桌面**: Electron 28.0
- **构建**: Vite 5.0
- **打包**: electron-builder 24.9

### 主要依赖
- **图像处理**: Potrace 2.1.8（位图描摹）
- **国际化**: i18next + react-i18next
- **透视校正**: 自定义算法

### 开发工具
- TypeScript
- Vite
- Concurrently（并发运行开发服务）
- Wait-on（等待服务就绪）

---

## 📦 当前版本信息

- **版本号**: 1.0.1
- **最后更新**: 2024-11-23
- **Windows 安装包**:
  - `FaboGinger-Setup-1.0.1.exe` (140M) - 完整安装程序
  - `FaboGinger-1.0.1-portable.exe` (75M) - 便携版

---

## ✅ 最近完成的功能和修复

### 功能增强

1. **图形工具优化** ✅
   - 追加图形限制在边界框内部的白色区域内
   - 优化矩形间距逻辑：
     - 矩形旁边有黑色边界 → 自动保持 1mm 距离
     - 矩形旁边是已放置矩形 → 使用用户设置的间距
   - 添加最大矩形大小设置（默认 200×200mm）
   - 实现间距为 0 时的边去重功能

2. **参数配置优化** ✅
   - Padding 默认值设置为 2mm
   - 移除 StrokeWidth 界面选项，固定使用 0.1mm
   - 所有参数添加单位标注 (mm)

3. **边界框和导出** ✅
   - 修复边界框导出位置与预览不一致的问题
   - 导出时保持边界框原始位置

4. **状态管理优化** ✅
   - 修复矩形间距修改后不生效的问题（使用 useRef 解决闭包问题）

### Bug 修复

1. **Windows 安装包问题** ✅
   - 修复空白界面问题（资源路径改为相对路径）
   - 配置应用程序图标（真正的 ICO 格式，包含 6 个尺寸）

2. **代码质量** ✅
   - 修复重复定义错误
   - 优化异步状态管理

---

## 📁 项目结构

```
FaboGinger/
├── electron/              # Electron 主进程
│   ├── main.ts           # 主进程入口
│   ├── preload.ts        # 预加载脚本
│   └── deepnest.ts       # 排版算法模块
│
├── src/
│   ├── components/       # React 组件
│   │   ├── CameraCapture.tsx          # 相机捕获
│   │   ├── ImageProcessor.tsx         # 图像处理主组件
│   │   │   └── ImageProcessor/        # 子组件
│   │   │       ├── BoundaryBoxManager.tsx
│   │   │       ├── CornerEditor.tsx
│   │   │       ├── ProcessingControls.tsx
│   │   │       ├── ShapeTools.tsx
│   │   │       └── SvgPreview.tsx
│   │   ├── NestingPanel.tsx           # 排版优化面板
│   │   └── LanguageSwitcher.tsx       # 语言切换
│   │
│   ├── hooks/            # 自定义 Hooks
│   │   ├── useBoundaryBox.ts          # 边界框管理
│   │   ├── useCornerEditing.ts        # 角点编辑
│   │   ├── useShapeTools.ts           # 图形工具
│   │   └── useSvgManipulation.ts      # SVG 操作
│   │
│   ├── utils/            # 工具函数
│   │   ├── imageProcessor.ts          # 图像处理（Potrace）
│   │   ├── perspective.ts             # 透视校正
│   │   ├── svgUtils.ts                # SVG 工具
│   │   └── coordinateUtils.ts         # 坐标转换
│   │
│   └── i18n/             # 国际化
│       ├── config.ts
│       └── locales/
│           ├── zh-CN.json             # 中文
│           └── en-US.json             # 英文
│
├── build/                # 构建资源
│   └── icon.ico          # 应用程序图标（ICO 格式，6 个尺寸）
│
├── dist/                 # Electron 主进程构建输出
├── dist-react/           # React 应用构建输出
├── release/              # 打包后的安装程序
│
└── docs/                 # 文档
    ├── PROJECT-STATUS.md              # 项目状态（本文档）
    ├── deepnest-implementation.md     # Deepnest 实施文档
    └── fixes-summary.md               # 修复总结
```

---

## 🔧 默认配置

### 图形工具默认值
- **Padding（留白）**: 2mm
- **CornerRadius（圆角）**: 2mm
- **StrokeWidth（线宽）**: 0.1mm（固定，不在界面显示）
- **Gap（矩形间距）**: 0mm
- **Step（扫描步长）**: 1.0mm
- **MaxRectWidth（最大宽度）**: 200mm
- **MaxRectHeight（最大高度）**: 200mm

### 排版参数默认值
- **旋转模式**: none（不允许旋转）
- **间距**: 0mm
- **质量**: balanced（平衡）

---

## 🔍 核心功能实现

### 1. 透视校正
- **自动检测**: 检测红色标记（建议在四角贴红色胶带）
- **手动校正**: 拖动/点击调整角点
- **算法**: 自定义透视变换算法

### 2. 位图描摹
- **工具**: Potrace 2.1.8
- **参数**: 可调整阈值、turdSize、optTolerance
- **输出**: 高质量 SVG 矢量图

### 3. 边界框管理
- **添加**: 支持设置尺寸（宽度×高度）
- **拖拽**: 实时调整位置
- **限制**: 确保图形在边界框内部

### 4. 图形工具
- **手动添加**: 圆角矩形、圆形
- **自动填充**: 智能扫描白色区域，自动填充矩形
- **间距规则**:
  - 黑色边界 → 1mm 间距
  - 已放置矩形 → 用户设置间距
- **边去重**: 间距为 0 时，合并相邻矩形的重合边

### 5. 排版优化
- **基础算法**: 贪心装箱算法（Bottom-Left Fill）
- **支持功能**:
  - 旋转角度限制（none/90/all）
  - 间距设置
  - 质量选择（fast/balanced/best）
- **统计信息**: 材料利用率、已放置零件数

---

## ⚠️ 已知问题和限制

### 当前限制
1. **排版算法**: 使用基础贪心算法，性能和利用率不如专业 Deepnest
2. **形状支持**: 主要针对矩形，复杂形状支持有限
3. **Windows 调试**: 生产环境启用了开发者工具（用于调试）

### 待优化
1. **Deepnest CLI 集成**: 计划集成真实的 Deepnest 命令行工具
2. **排版算法优化**: 改进 Bottom-Left Fill 算法
3. **批量处理**: 支持批量处理多个材料
4. **历史记录**: 保存排版历史

---

## 📝 最近修改记录

### 最新提交 (cb45bfc)
- ✅ 修复矩形间距更新问题（使用 useRef）
- ✅ 修复边界框导出位置不一致
- ✅ 实现边去重功能（间距为 0 时）

### 主要修改
- ✅ 调整顶部布局，步骤标题居中
- ✅ 更新 README，添加中英文对照
- ✅ 重构 ImageProcessor 组件
- ✅ 添加 SVG 预览缩放和边界框拖拽
- ✅ 实现自动填充矩形优化
- ✅ 添加半自动角点调整

---

## 🚀 开发指南

### 启动开发环境
```bash
npm run dev
```
- React 前端: http://localhost:5173
- Electron 自动启动
- 开发者工具自动打开

### 构建生产版本
```bash
# 完整构建
npm run build

# Windows 安装包
npm run build:win
```

### 打包选项
- `npm run build:win` - 标准安装包 + 便携版
- `npm run build:win:portable` - 仅便携版
- `npm run build:win:all` - 所有架构（x64 + ia32）
- `npm run build:win:dir` - 仅目录（不打包）

---

## 📊 功能完成度

### 已完成 ✅
- [x] 摄像头拍照和图片上传
- [x] 自动/手动透视校正
- [x] Potrace 位图描摹
- [x] 边界框管理
- [x] 手动添加图形
- [x] 自动填充矩形
- [x] SVG 预览和编辑
- [x] 基础排版算法
- [x] 零件上传和管理
- [x] 排版参数配置
- [x] 多语言支持（中/英）
- [x] Windows 安装包
- [x] 应用程序图标

### 进行中 🔄
- [ ] Deepnest CLI 集成
- [ ] 排版算法优化

### 计划中 📋
- [ ] 批量处理
- [ ] 排版历史
- [ ] 更多图形类型
- [ ] 材料数据库

---

## 🔗 相关文档

- `README.md` - 项目主文档（中英文）
- `docs/deepnest-implementation.md` - Deepnest 实施文档
- `docs/deepnest-integration-summary.md` - Deepnest 集成总结
- `docs/fixes-summary.md` - 修复总结
- `README-ICON.md` - 图标配置说明
- `FIXES.md` - 修复说明

---

## 📞 项目信息

- **GitHub**: git@github.com:oneandzeros/FaboGinger.git
- **许可证**: MIT License
- **作者**: FaboGinger Team

---

**最后更新**: 2024-11-23  
**文档版本**: 1.0




