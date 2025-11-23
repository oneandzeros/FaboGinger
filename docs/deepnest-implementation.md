# Deepnest 集成实施方案

## 实施策略

基于现有功能，采用渐进式实施方案：

### 阶段 1：基础功能实现（当前阶段）
- 增强 NestingPanel 组件，添加零件上传功能
- 实现基础的排版算法（使用简单的矩形装箱算法）
- 完善用户界面和交互

### 阶段 2：Deepnest CLI 集成（后续）
- 集成真实的 Deepnest CLI 工具
- 支持更复杂的排版算法
- 性能优化

## 当前实施内容

### 1. NestingPanel 组件增强

**功能需求：**
- ✅ 零件 SVG 上传（支持多文件）
- ✅ 零件列表显示和管理
- ✅ 排版参数配置（间距、旋转角度、质量）
- ✅ 排版结果预览
- ✅ 材料利用率统计

**技术实现：**
- 使用 `input[type="file"]` 实现多文件上传
- 零件列表使用状态管理
- 排版参数通过表单控件配置

### 2. Electron 主进程集成

**功能需求：**
- 接收材料 SVG 和零件 SVG 列表
- 执行排版算法
- 返回排版结果 SVG

**技术实现：**
- 创建 `electron/deepnest.ts` 模块
- 实现基础的矩形装箱算法（作为初步方案）
- 使用临时文件存储 SVG
- 返回合并后的 SVG 结果

### 3. 数据流

```
NestingPanel 组件
  ↓ 用户上传零件 SVG
  收集：materialSvg + partsSvg[] + 参数
  ↓ 通过 IPC 发送
electron/main.ts (run-deepnest handler)
  ↓ 调用排版模块
electron/deepnest.ts
  ↓ 执行排版算法
  返回：nestedSvg + 统计信息
  ↓ 通过 IPC 返回
NestingPanel 组件
  ↓ 显示结果
  用户预览和下载
```

## 排版算法说明

### 基础版本（当前实现）

使用简单的矩形装箱算法：
1. 解析 SVG，提取零件边界框
2. 计算零件的宽高
3. 使用贪心算法进行矩形装箱
4. 生成合并后的 SVG

### 未来版本（Deepnest CLI）

集成真实的 Deepnest 算法，支持：
- 复杂形状的排版
- 旋转优化
- 更高效的利用率

## 文件结构

```
electron/
├── main.ts (更新 run-deepnest handler)
└── deepnest.ts (新建 - 排版算法模块)

src/
├── components/
│   └── NestingPanel.tsx (增强)
└── i18n/
    └── locales/
        ├── zh-CN.json (已有文本)
        └── en-US.json (已有文本)
```

