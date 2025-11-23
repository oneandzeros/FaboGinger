# 图标配置说明

## 当前状态

Windows 安装包已配置使用 `build/icon.ico` 作为程序图标。

## 图标文件准备

目前使用 `public/FABO.png` 作为临时图标文件。要生成真正的 ICO 格式图标，请使用以下方法之一：

### 方法 1: 在线转换工具（推荐）

1. 访问以下任一在线工具：
   - https://convertio.co/zh/png-ico/
   - https://www.icoconverter.com/
   - https://www.favicon-generator.org/

2. 上传 `public/FABO.png` 文件

3. 选择输出尺寸：
   - 16x16
   - 32x32
   - 48x48
   - 64x64
   - 128x128
   - 256x256
   - （建议包含多个尺寸）

4. 下载生成的 ICO 文件

5. 保存到 `build/icon.ico`

### 方法 2: 使用 ImageMagick（如果已安装）

```bash
convert public/FABO.png -define icon:auto-resize=256,128,64,48,32,16 build/icon.ico
```

### 方法 3: 使用 Python PIL/Pillow

```bash
pip install Pillow
python3 -c "
from PIL import Image
img = Image.open('public/FABO.png')
sizes = [(16,16), (32,32), (48,48), (64,64), (128,128), (256,256)]
img.save('build/icon.ico', format='ICO', sizes=sizes)
"
```

## 注意事项

- ICO 文件应包含多个尺寸（16x16 到 256x256）
- 文件应保存在 `build/icon.ico`
- 如果文件不存在，electron-builder 会使用默认图标

## 验证

打包前可以检查图标文件是否存在：

```bash
ls -lh build/icon.ico
```

如果文件存在，打包时会自动使用；如果不存在，打包时会使用默认图标。

