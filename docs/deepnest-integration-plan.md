# Deepnest 集成方案

## 1. 功能概述

Deepnest 是一个开源的排版算法，用于优化零件在材料板上的排列，以最大化材料利用率。本方案将集成 Deepnest 到 FaboGinger 项目中。

## 2. 技术方案选择

### 方案 A：使用 Deepnest CLI 工具（推荐）
- **优点**：
  - Deepnest 提供命令行工具
  - 可以直接调用可执行文件
  - 功能完整，性能好
- **缺点**：
  - 需要下载和安装 Deepnest 可执行文件
  - 需要处理跨平台问题（Windows/macOS/Linux）
  - 需要管理可执行文件的路径

### 方案 B：使用 JavaScript 库
- **优点**：
  - 可以直接集成到 Node.js
  - 不需要外部依赖
- **缺点**：
  - 可能需要找到合适的 npm 包
  - 性能可能不如原生工具

### 方案 C：使用在线 API 服务
- **优点**：
  - 不需要本地安装
  - 易于维护
- **缺点**：
  - 需要网络连接
  - 可能存在隐私问题
  - 可能产生费用

**推荐：方案 A（CLI 工具）+ 方案 B（JavaScript 库作为备选）**

## 3. 功能设计

### 3.1 前端功能增强

#### 3.1.1 NestingPanel 组件增强
- 添加零件 SVG 上传功能
  - 支持单个/多个 SVG 文件上传
  - 显示已上传的零件列表
  - 支持删除已上传的零件
  - 显示零件预览
- 添加排版参数配置
  - 旋转角度限制
  - 间距设置
  - 排版质量/速度平衡
- 添加排版进度显示
  - 实时显示排版进度
  - 显示当前利用率
- 添加排版结果预览
  - 显示优化后的排版结果
  - 支持缩放和拖拽查看
  - 显示材料利用率统计

### 3.2 后端功能实现

#### 3.2.1 Electron 主进程 Deepnest 集成
- 实现 CLI 调用逻辑
  - 检测 Deepnest 可执行文件是否存在
  - 创建临时文件存储材料 SVG 和零件 SVG
  - 调用 Deepnest CLI 进行排版
  - 读取排版结果
  - 清理临时文件
- 实现 JavaScript 库集成（备选方案）
  - 如果 CLI 不可用，使用 JS 库
- 错误处理
  - 文件不存在错误
  - 排版失败错误
  - 超时处理
- 进度反馈
  - 通过 IPC 实时反馈排版进度

## 4. 实施步骤

### 阶段 1：前端功能开发
1. 增强 NestingPanel 组件
   - 添加零件上传 UI
   - 添加参数配置 UI
   - 添加结果预览 UI
2. 更新国际化文本
3. 添加样式

### 阶段 2：后端集成开发
1. 创建 Deepnest 工具模块
   - 实现 CLI 调用
   - 实现文件处理
   - 实现错误处理
2. 更新 IPC handler
3. 添加进度反馈机制

### 阶段 3：测试与优化
1. 功能测试
2. 性能优化
3. 错误处理完善
4. 用户体验优化

## 5. 技术实现细节

### 5.1 文件结构

```
electron/
├── main.ts (已存在)
└── deepnest.ts (新建 - Deepnest 集成模块)

src/
├── components/
│   └── NestingPanel.tsx (增强)
├── utils/
│   └── deepnestUtils.ts (新建 - Deepnest 工具函数)
└── i18n/
    └── locales/
        ├── zh-CN.json (更新)
        └── en-US.json (更新)
```

### 5.2 数据流

```
用户上传零件 SVG
    ↓
NestingPanel 收集材料 SVG + 零件 SVG 列表
    ↓
通过 IPC 发送到 Electron 主进程
    ↓
Electron 主进程：
  1. 创建临时目录
  2. 保存材料 SVG 和零件 SVG 文件
  3. 调用 Deepnest CLI
  4. 读取排版结果
  5. 清理临时文件
  6. 返回结果 SVG
    ↓
NestingPanel 接收结果并显示
    ↓
用户下载或确认使用
```

### 5.3 Deepnest CLI 调用示例

```typescript
// 假设 Deepnest CLI 命令格式
deepnest --material material.svg --parts part1.svg part2.svg --output result.svg --rotations 0,90,180,270 --spacing 2
```

## 6. 备选方案说明

如果 Deepnest CLI 不可用，可以考虑：

1. **使用 SVG Nest 库**：一个纯 JavaScript 的排版库
   - npm 包：`svg-nest`
   - 可以直接集成到 Electron

2. **使用其他排版库**：
   - `@nest/nest.js`
   - `packing-algorithm`

3. **简化实现**：
   - 先实现基础的排版功能
   - 后续再集成专业的 Deepnest

## 7. 注意事项

1. **Deepnest 安装**：
   - 需要提供 Deepnest 的安装说明
   - 或者将 Deepnest 打包到应用中
   - 或者提供自动下载功能

2. **跨平台支持**：
   - Windows: `.exe` 文件
   - macOS: 可执行文件或应用
   - Linux: 可执行文件

3. **性能考虑**：
   - 排版是计算密集型操作
   - 需要考虑超时处理
   - 提供取消功能

4. **用户体验**：
   - 排版可能需要较长时间
   - 需要清晰的进度反馈
   - 需要友好的错误提示

## 8. 后续优化

1. 支持更多排版参数
2. 支持批量排版
3. 保存排版历史
4. 导出排版报告（材料利用率等）

