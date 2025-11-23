# 构建资源说明

## Windows 图标文件

Windows 安装包需要 `icon.ico` 文件。请将应用程序图标放在此目录下，命名为 `icon.ico`。

### 图标要求：
- 格式：ICO 格式
- 推荐尺寸：256x256 像素（包含多个尺寸：16x16, 32x32, 48x48, 64x64, 128x128, 256x256）
- 可以使用在线工具将 PNG 转换为 ICO，例如：
  - https://convertio.co/zh/png-ico/
  - https://www.icoconverter.com/

### 临时解决方案：
如果没有准备图标文件，electron-builder 会使用默认图标，但建议尽快添加自定义图标以提升专业度。

