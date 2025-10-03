# ES-DE主题转换程序使用指南

这个转换程序可以将ES-DE主题的XML格式转换为JSON格式，便于在React/Next.js应用中使用。

## 功能特性

- 解析ES-DE主题的XML文件（theme.xml, capabilities.xml）
- 处理include标签，递归解析引用的XML文件
- 提取主题变量和枚举值
- 解析视图和元素配置
- 自动复制资源文件（图片、字体, customIcon, customButtonIcon）
- 生成结构化的JSON文件

## 使用方法

### 1. 准备主题文件

将ES-DE主题放在 `es-de_themes` 目录下，每个主题一个子目录：

```
es-de_themes/
├── theme1/
│   ├── theme.xml
│   ├── capabilities.xml
│   ├── art/
│   └── fonts/
├── theme2/
│   ├── theme.xml
│   ├── capabilities.xml
│   └── ...
```

### 2. 运行转换程序

```bash
npm run convert-themes
```

### 3. 查看结果

转换后的文件将保存在 `public/themes` 目录下：

```
public/themes/
├── theme1.json
├── theme1/
│   ├── art/
│   └── fonts/
├── theme2.json
├── theme2/
│   ├── art/
│   └── fonts/
```

## JSON输出格式

转换后的JSON文件包含以下结构：

```json
{
  "name": "主题名称",
  "variables": {
    "变量名": "变量值"
  },
  "capabilities": {
    "variants": ["变体1", "变体2"],
    "colorSchemes": ["配色方案1", "配色方案2"],
    "aspectRatios": ["宽高比1", "宽高比2"]
  },
  "views": [
    {
      "name": "视图名称",
      "elements": [
        {
          "name": "元素名称",
          "type": "元素类型",
          "properties": {
            "属性名": "属性值"
          }
        }
      ]
    }
  ],
  "assets": {
    "images": ["图片路径列表"],
    "fonts": ["字体路径列表"]
  }
}
```

## 支持的XML元素

转换程序支持以下ES-DE主题元素：

- `<image>` - 图片元素
- `<text>` - 文本元素
- `<video>` - 视频元素
- `<carousel>` - 轮播元素
- `<textlist>` - 文本列表元素
- `<grid>` - 网格元素
- `<animation>` - 动画元素
- `<datetime>` - 日期时间元素
- `<rating>` - 评分元素

## 支持的属性

- `pos` - 位置坐标
- `size` - 尺寸
- `origin` - 原点
- `color` - 颜色
- `fontPath` - 字体路径
- `fontSize` - 字体大小
- `alignment` - 对齐方式
- `zIndex` - 层级
- `path` - 文件路径
- 以及其他ES-DE主题支持的属性

## 变量处理

转换程序会保留主题中定义的变量，格式为 `${变量名}`。这些变量可以在React组件中动态替换。

## 注意事项

1. 确保主题目录下有 `theme.xml` 文件
2. 引用的资源文件路径要正确
3. 转换程序会自动创建必要的目录结构
4. 如果资源文件不存在，会在控制台显示警告但不影响转换

## 错误处理

转换程序会处理以下错误情况：

- XML文件格式错误
- 引用的文件不存在
- 资源文件路径错误
- 目录权限问题

所有错误都会在控制台显示详细信息，但不会中断整个转换过程。
