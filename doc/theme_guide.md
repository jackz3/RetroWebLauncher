# ES-DE 主题开发快速指南

本文档旨在为开发人员提供创建 ES-DE 主题所需的核心信息，重点介绍关键概念和元素属性。

## 核心概念

### 1. 文件结构

- **`theme.xml`**: 主题的入口点。可以放在主题根目录作为全局默认配置，也可以放在各个系统独立的文件夹下（例如 `snes/theme.xml`）作为系统专属配置。
- **`capabilities.xml`**: **必需文件**，位于主题根目录。用于声明主题名称、支持的变体（variants）、配色方案（color schemes）、宽高比（aspect ratios）、语言等。没有此文件，主题将不会加载。
- **资源文件**: 图片、字体、视频等资源文件通常放在一个公共目录（如 `_inc` 或 `assets`）中，通过相对路径 `./` 或 `./../` 引用。

### 2. XML 结构

主题由嵌套的 XML 标签构成：

```xml
<theme>
    <!-- 视图定义 -->
    <view name="system, gamelist">
        <!-- 元素定义 -->
        <image name="background">
            <!-- 属性定义 -->
            <path>./assets/background.png</path>
            <pos>0 0</pos>
            <size>1 1</size>
            <zIndex>0</zIndex>
        </image>
    </view>
</theme>
```

- **`<theme>`**: 所有配置的根标签。
- **`<view>`**: 定义应用界面。主要有两个视图：`system` (系统选择界面) 和 `gamelist` (游戏列表界面)。可以同时为多个视图定义通用元素，如 `name="system, gamelist"`。
- **`<element>`**: 视图中的视觉组件，如 `image`, `text`, `carousel` 等。必须有一个唯一的 `name` 属性。
- **`<property>`**: 元素的属性，如 `<pos>`, `<size>`, `<color>` 等，用于控制元素的外观和行为。

### 3. `capabilities.xml`

此文件是主题的“清单”，用于声明主题提供的可配置选项，这些选项会显示在 ES-DE 的 UI 设置菜单中。

- **`<themeName>`**: 在 UI 设置中显示的主题名称。
- **`<variant>`**: 定义不同的布局或功能集（如带视频的列表、纯文本列表）。
- **`<colorScheme>`**: 定义不同的颜色变量集。
- **`<aspectRatio>`**: 为不同的屏幕宽高比（如 `16:9`, `4:3`）提供专门的布局。
- **`<language>`**: 声明支持的多语言，以便提供本地化文本或资源。

### 4. 变体 (Variants)

变体 (Variants) 是主题的核心功能之一，它允许一个主题提供多种不同的布局或功能配置，用户可以在 UI 设置菜单中自由切换。例如，一个主题可以提供“带视频的列表”、“网格视图”和“简约模式”等多种变体。

#### 声明变体

所有可用的变体都必须在 `capabilities.xml` 文件中声明。

```xml
<!-- capabilities.xml -->
<themeCapabilities>
    ...
    <variant name="withVideos">
        <label>带视频的列表</label>
        <selectable>true</selectable>
    </variant>
    <variant name="grid">
        <label>网格视图</label>
        <selectable>true</selectable>
    </variant>
</themeCapabilities>
```
- **`<variant name="...">`**: 定义一个变体，`name` 必须唯一。
- **`<label>`**: 在 UI 设置菜单中显示的名称。
- **`<selectable>`**: `true` 表示用户可以选择此变体。

#### 使用变体

在主题的 `.xml` 文件中，使用 `<variant>` 标签来应用特定于变体的配置。

```xml
<theme>
    <!-- 为 "withVideos" 和 "grid" 变体加载通用配置 -->
    <variant name="withVideos, grid">
        <include>./shared_elements.xml</include>
    </variant>

    <!-- "withVideos" 变体的特定配置 -->
    <variant name="withVideos">
        <view name="gamelist">
            <video name="gameVideo">
                <pos>0.5 0.5</pos>
                <size>0.4 0.3</size>
            </video>
        </view>
    </variant>

    <!-- "grid" 变体的特定配置 -->
    <variant name="grid">
        <view name="gamelist">
            <grid name="gameGrid">
                <pos>0.1 0.1</pos>
                <size>0.8 0.8</size>
            </grid>
        </view>
    </variant>
</theme>
```
- `name` 属性可以包含一个或多个变体名称，用逗号或空格分隔。
- 通用配置 (对所有变体生效) 可以通过将所有变体名称都列出来实现，或者使用特殊的 `all` 值：`<variant name="all">`。

#### 变体触发器 (Variant Triggers)

这是一个可选的高级功能，可以根据系统内容自动切换变体。例如，如果一个系统没有任何视频文件，则自动从“视频列表”变体切换到“无视频”变体。

- **触发条件**: `noVideos` (无视频) 或 `noMedia` (无指定类型的媒体文件)。
- **配置位置**: 在 `capabilities.xml` 的 `<variant>` 定义内。

```xml
<!-- capabilities.xml -->
<variant name="withVideos">
    <label>带视频的列表</label>
    <selectable>true</selectable>
    <override>
        <trigger>noVideos</trigger>
        <useVariant>withoutVideos</useVariant>
    </override>
</variant>

<variant name="withoutVideos">
    <label>无视频列表</label>
    <selectable>false</selectable> <!-- 通常将自动切换的目标设为不可选 -->
</variant>
```
- **`<override>`**: 定义一个覆盖规则。
- **`<trigger>`**: 触发器类型。
- **`<useVariant>`**: 要切换到的目标变体。

使用触发器会带来轻微的性能开销，因为它需要在启动和导航时扫描游戏媒体文件。

### 5. 变量

变量是实现动态和可维护主题的关键。使用 `${variableName}` 的语法。

- **系统变量**: 由 ES-DE 提供，包含当前系统的信息。
  - `${system.name}`: 系统短名称 (例如 `snes`)。
  - `${system.fullName}`: 系统全名 (例如 `Super Nintendo Entertainment System`)。
  - `${system.theme}`: 系统主题目录名。
- **主题变量**: 在 `<variables>` 标签内自定义。
  ```xml
  <variables>
      <mainColor>FFFFFF</mainColor>
  </variables>
  <text name="title">
      <color>${mainColor}</color>
  </text>
  ```

### 6. 渲染顺序 (`zIndex`)

`zIndex` 属性决定元素的堆叠顺序，值越大的元素渲染在越上层。

| 元素类型 | 默认 `zIndex` |
| :--- | :---: |
| image, video | 30 |
| animation, badges | 35 |
| text, datetime | 40 |
| gamelistinfo, rating | 45 |
| carousel, grid, textlist | 50 |
| helpsystem | 始终最前 |

### 7. 配置解析顺序

理解主题配置的解析顺序对于避免潜在的混淆至关重要。ES-DE 始终遵循以下顺序：

1.  Transitions (过渡效果)
2.  Variables (变量)
3.  Color schemes (配色方案)
4.  Font sizes (字体大小)
5.  Languages (语言)
6.  Included files (通过 `<include>` 包含的文件)
7.  通用配置 (非 variant 或 aspectRatio 的部分)
8.  Variants (变体)
9.  Aspect ratios (宽高比)

这意味着，即使一个 variant 的定义在 XML 文件中位于通用配置之上，它也总是在通用配置之后被解析。

---

## 元素参考

这里列出了所有可用元素及其核心属性和默认值。

### 主要元素 (Primary Elements)

每个视图只能有一个主要元素，用于核心导航。

#### `carousel` (轮播)

用于系统或游戏导航的轮播组件。

- **`pos`**: 位置 (归一化坐标)。**默认**: `0 0.38378`。
- **`size`**: 尺寸 (归一化坐标)。**默认**: `1 0.2324`。
- **`origin`**: 坐标原点。**默认**: `0 0`。
- **`type`**: 轮播类型。`horizontal` (水平), `vertical` (垂直), `horizontalWheel` (水平滚轮), `verticalWheel` (垂直滚轮)。**默认**: `horizontal`。
- **`staticImage`** (`system` 视图): 静态图片路径。
- **`imageType`** (`gamelist` 视图): 显示的游戏图片类型，如 `marquee`, `cover`, `screenshot`。**默认**: `marquee`。
- **`defaultImage`**: `staticImage` 或 `imageType` 未找到时的备用图片。
- **`defaultFolderImage`**: 文件夹的备用图片。
- **`maxItemCount`**: (水平/垂直类型) 显示的条目数量。**默认**: `3`。
- **`itemsBeforeCenter` / `itemsAfterCenter`**: (滚轮类型) 中心点前/后的条目数。**默认**: `8` / `8`。
- **`itemStacking`**: 项目堆叠方式。`centered`, `ascending`, `descending` 等。**默认**: `centered`。
- **`selectedItemMargins`**: 选中项的额外边距。**默认**: `0 0`。
- **`selectedItemOffset`**: 选中项的偏移量。**默认**: `0 0`。
- **`itemSize`**: 未选中项的尺寸。**默认**: `0.25 0.155`。
- **`itemScale`**: 选中项的缩放倍数。**默认**: `1.2`。
- **`itemRotation`**: (滚轮类型) 项目旋转角度。**默认**: `7.5`。
- **`itemRotationOrigin`**: (滚轮类型) 项目旋转中心。**默认**: `-3 0.5`。
- **`itemAxisHorizontal`**: (滚轮类型) 保持项目水平。**默认**: `false`。
- **`itemAxisRotation`**: (水平/垂直类型) 项目自身轴旋转。**默认**: `0`。
- **`imageFit`**: 图片适应方式。`contain`, `fill`, `cover`。**默认**: `contain`。
- **`imageCropPos`**: 裁剪图片时的位置。**默认**: `0.5 0.5`。
- **`imageInterpolation`**: 图片插值。`nearest`, `linear`。**默认**: `linear`。
- **`imageCornerRadius`**: 图片圆角半径。**默认**: `0`。
- **`imageColor` / `imageColorEnd`**: 图片颜色/渐变。**默认**: `FFFFFFFF`。
- **`imageSelectedColor` / `imageSelectedColorEnd`**: 选中项的图片颜色/渐变。
- **`imageBrightness`**: 图片亮度。**默认**: `0`。
- **`imageSaturation`**: 图片饱和度。**默认**: `1`。
- **`itemTransitions`**: 项目过渡动画。`animate`, `instant`。**默认**: `animate`。
- **`itemDiagonalOffset`**: 对角线布局偏移。**默认**: `0`。
- **`itemHorizontalAlignment` / `itemVerticalAlignment`**: 项目对齐。**默认**: `center`。
- **`wheelHorizontalAlignment` / `wheelVerticalAlignment`**: (滚轮类型) 滚轮对齐。**默认**: `center`。
- **`horizontalOffset` / `verticalOffset`**: 轮播整体偏移。**默认**: `0`。
- **`reflections`**: 是否启用倒影。**默认**: `false`。
- **`reflectionsOpacity`**: 倒影不透明度。**默认**: `0.5`。
- **`reflectionsFalloff`**: 倒影衰减。**默认**: `1`。
- **`unfocusedItemOpacity`**: 未选中项不透明度。**默认**: `0.5`。
- **`unfocusedItemSaturation`**: 未选中项饱和度。**默认**: `1`。
- **`unfocusedItemDimming`**: 未选中项变暗程度。**默认**: `1`。
- **`fastScrolling`**: 是否启用快速滚动。**默认**: `false`。
- **`color` / `colorEnd`**: 背景面板颜色/渐变。**默认**: `FFFFFFD8`。
- **`text`**: (`system` 视图) 无图片时的备用文本。
- **`textColor` / `textSelectedColor`**: 文本颜色/选中时颜色。**默认**: `000000FF`。
- **`textBackgroundColor` / `textSelectedBackgroundColor`**: 文本背景色/选中时背景色。**默认**: `FFFFFF00`。
- **`textHorizontalScrolling`**: 文本是否水平滚动。**默认**: `false`。
- **`fontPath`**: 字体文件路径。
- **`fontSize`**: 字体大小。**默认**: `0.085`。
- **`letterCase`**: 字母大小写。`none`, `uppercase`, `lowercase`, `capitalize`。**默认**: `none`。
- **`lineSpacing`**: 行间距。**默认**: `1.5`。
- **`zIndex`**: **默认**: `50`。

#### `grid` (网格)

用于系统或游戏导航的网格布局。

- **`pos`**: 位置。**默认**: `0 0.1`。
- **`size`**: 尺寸。**默认**: `1 0.8`。
- **`origin`**: 坐标原点。**默认**: `0 0`。
- **`staticImage`** (`system` 视图): 静态图片路径。
- **`imageType`** (`gamelist` 视图): 显示的游戏图片类型。**默认**: `marquee`。
- **`defaultImage`**: `staticImage` 或 `imageType` 未找到时的备用图片。
- **`defaultFolderImage`**: 文件夹的备用图片。
- **`itemSize`**: 网格项的尺寸。**默认**: `0.15 0.25`。
- **`itemScale`**: 选中项的缩放倍数。**默认**: `1.05`。
- **`itemSpacing`**: 网格项之间的间距。
- **`scaleInwards`**: 是否向内缩放。**默认**: `false`。
- **`itemTransitions`**: 项目过渡动画。`animate`, `instant`。**默认**: `animate`。
- **`rowTransitions`**: 行过渡动画。`animate`, `instant`。**默认**: `animate`。
- **`unfocusedItemOpacity`**: 未选中项不透明度。**默认**: `1`。
- **`unfocusedItemSaturation`**: 未选中项饱和度。**默认**: `1`。
- **`unfocusedItemDimming`**: 未选中项变暗程度。**默认**: `1`。
- **`fastScrolling`**: 是否启用快速滚动。**默认**: `false`。
- **`imageFit`**: 图片适应方式。`contain`, `fill`, `cover`。**默认**: `contain`。
- **`imageCropPos`**: 当 `imageFit` 为 `cover` 时，裁剪图片的位置。**默认**: `0.5 0.5` (居中)。
- **`imageInterpolation`**: 图片插值。`nearest`, `linear`。**默认**: `linear`。
- **`imageRelativeScale`**: 图片相对于项目尺寸的缩放。**默认**: `1`。
- **`imageCornerRadius`**: 图片圆角半径。**默认**: `0`。
- **`imageColor` / `imageSelectedColor`**: 图片颜色/选中时颜色。
- **`backgroundImage`**: 网格项的背景图。
- **`backgroundCornerRadius`**: 背景图圆角半径。**默认**: `0`。
- **`backgroundColor`**: 背景颜色。
- **`backgroundSelectedColor`**: 选中项的背景颜色。
- **`backgroundCenterColor`**: 背景渐变中心颜色。
- **`backgroundEdgeColor`**: 背景渐变边缘颜色。
- **`selectorImage`**: 选中项的选择器图片。
- **`selectorImageTile`**: 是否平铺选择器图片。**默认**: `false`。
- **`selectorCornerRadius`**: 选择器圆角半径。**默认**: `0`。
- **`selectorColor` / `selectorColorEnd`**: 选择器颜色/渐变。
- **`selectorGradientType`**: 选择器渐变方向。`horizontal`, `vertical`。**默认**: `horizontal`。
- **`selectorLayer`**: 选择器渲染层级。`bottom`, `middle`, `top`。**默认**: `top`。
- **`text`**: (`system` 视图) 无图片时的备用文本。
- **`textColor` / `textSelectedColor`**: 文本颜色/选中时颜色。**默认**: `000000FF`。
- **`textBackgroundColor` / `textSelectedBackgroundColor`**: 文本背景色/选中时背景色。
- **`textHorizontalScrolling`**: 文本是否水平滚动。**默认**: `false`。
- **`fontPath`**: 字体文件路径。
- **`fontSize`**: 字体大小。**默认**: `0.045`。
- **`letterCase`**: 字母大小写。`none`, `uppercase`, `lowercase`, `capitalize`。**默认**: `none`。
- **`letterCaseAutoCollections`**: 自动收藏集的字母大小写。
- **`letterCaseCustomCollections`**: 自定义收藏集的字母大小写。
- **`lineSpacing`**: 行间距。**默认**: `1.5`。
- **`systemNameSuffix`**: 在收藏集中是否显示系统名称后缀。**默认**: `true`。
- **`letterCaseSystemNameSuffix`**: 系统名称后缀的字母大小写。**默认**: `uppercase`。
- **`fadeAbovePrimary`**: (`system` 视图) 淡入淡出时是否隐藏上层元素。**默认**: `false`。
- **`zIndex`**: **默认**: `50`。

#### `textlist` (文本列表)

用于系统或游戏导航的文本列表。

- **`pos`**: 位置。**默认**: `0 0.1`。
- **`size`**: 尺寸。**默认**: `1 0.8`。
- **`origin`**: 坐标原点。**默认**: `0 0`。
- **`selectorWidth`**: 选择条宽度。**默认**: 与元素宽度相同。
- **`selectorHeight`**: 选择条高度。**默认**: `1.5 * fontSize`。
- **`selectorHorizontalOffset` / `selectorVerticalOffset`**: 选择条偏移。**默认**: `0`。
- **`selectorColor` / `selectorColorEnd`**: 选择条颜色/渐变。**默认**: `333333FF`。
- **`selectorGradientType`**: 选择条渐变方向。`horizontal`, `vertical`。**默认**: `horizontal`。
- **`selectorImagePath`**: 选择条图片路径。
- **`selectorImageTile`**: 是否平铺选择条图片。**默认**: `false`。
- **`primaryColor`**: 主条目文本颜色。**默认**: `0000FFFF`。
- **`secondaryColor`**: 次条目（文件夹）文本颜色。**默认**: `00FF00FF`。
- **`selectedColor`**: 选中文本颜色。**默认**: 与 `primaryColor` 相同。
- **`selectedSecondaryColor`**: 选中次条目文本颜色。
- **`selectedBackgroundColor`**: 选中文本背景色。**默认**: `00000000`。
- **`selectedSecondaryBackgroundColor`**: 选中次条目文本背景色。
- **`selectedBackgroundMargins`**: 选中文本背景的边距。**默认**: `0 0`。
- **`selectedBackgroundCornerRadius`**: 选中文本背景圆角。**默认**: `0`。
- **`textHorizontalScrolling`**: 文本是否水平滚动。**默认**: `true`。
- **`textHorizontalScrollSpeed`**: 文本水平滚动速度。**默认**: `1`。
- **`textHorizontalScrollDelay`**: 文本水平滚动延迟（秒）。**默认**: `3`。
- **`textHorizontalScrollGap`**: 文本水平滚动间隙。**默认**: `1.5`。
- **`fontPath`**: 字体文件路径。
- **`fontSize`**: 字体大小。**默认**: `0.045`。
- **`horizontalAlignment`**: 水平对齐。`left`, `center`, `right`。**默认**: `left`。
- **`horizontalMargin`**: 水平边距。**默认**: `0`。
- **`letterCase`**: 字母大小写。`none`, `uppercase`, `lowercase`, `capitalize`。**默认**: `none`。
- **`letterCaseAutoCollections`**: 自动收藏集的字母大小写。
- **`letterCaseCustomCollections`**: 自定义收藏集的字母大小写。
- **`lineSpacing`**: 行间距。**默认**: `1.5`。
- **`indicators`**: 指示器样式。`none`, `ascii`, `symbols`。**默认**: `symbols`。
- **`collectionIndicators`**: 收藏集编辑时的指示器样式。`ascii`, `symbols`。**默认**: `symbols`。
- **`systemNameSuffix`**: 在收藏集中是否显示系统名称后缀。**默认**: `true`。
- **`letterCaseSystemNameSuffix`**: 系统名称后缀的字母大小写。**默认**: `uppercase`。
- **`fadeAbovePrimary`**: (`system` 视图) 淡入淡出时是否隐藏上层元素。**默认**: `false`。
- **`zIndex`**: **默认**: `50`。

### 次要元素 (Secondary Elements)

可以在视图中无限次使用。

#### `image`

显示静态或动态图片。

- **`pos`**, **`size`**, **`origin`**: 位置、尺寸、原点。
- **`maxSize` / `cropSize`**: 最大尺寸/裁剪尺寸。
- **`rotation`**: 旋转角度。**默认**: `0`。
- **`rotationOrigin`**: 旋转中心。**默认**: `0.5 0.5`。
- **`path`**: 静态图片路径。
- **`imageType`** (`gamelist` 视图): 游戏图片类型，如 `miximage`, `screenshot`, `cover` 等。
- **`default`**: 当 `path` 或 `imageType` 图片未找到时的备用图片。
- **`defaultFolder`**: (`gamelist` 视图) 文件夹的备用图片。
- **`tile`**: 是否平铺图片。**默认**: `false`。
- **`color` / `colorEnd`**: 颜色叠加/渐变。**默认**: `FFFFFFFF` (无效果)。
- **`gradientType`**: 渐变方向。`horizontal`, `vertical`。**默认**: `horizontal`。
- **`brightness`**: 亮度。**默认**: `0`。
- **`saturation`**: 饱和度。**默认**: `1`。
- **`opacity`**: 不透明度。**默认**: `1`。
- **`interpolation`**: 插值。`nearest`, `linear`。
- **`fit`**: 图片适应方式。`contain`, `fill`, `cover`。**默认**: `contain`。
- **`cropPos`**: 当 `fit` 为 `cover` 时，裁剪图片的位置。**默认**: `0.5 0.5` (居中)。
- **`cornerRadius`**: 圆角半径。**默认**: `0`。
- **`scrollFadeIn`**: 滚动时淡入。**默认**: `false`。
- **`visible`**: 是否可见。**默认**: `true`。
- **`zIndex`**: **默认**: `30`。

#### `video`

播放视频。

- **`pos`**, **`size`**, **`origin`**: 位置、尺寸、原点。
- **`maxSize` / `cropSize`**: 最大尺寸/裁剪尺寸。
- **`path`**: 静态视频文件路径。
- **`default`**: 游戏视频未找到时的备用视频。
- **`imageType`**: 视频播放前显示的预览图类型。
- **`delay`**: 播放前显示预览图的延迟（秒）。**默认**: `1.5`。
- **`audio`**: 是否播放音频。**默认**: `true`。
- **`iterationCount`**: 循环播放次数。**默认**: `0` (无限)。
- **`onIterationsDone`**: 循环结束后行为。`nothing`, `image`。**默认**: `nothing`。
- **`pillarboxes`**: 是否显示黑边。**默认**: `true`。
- **`scanlines`**: 是否显示扫描线。**默认**: `false`。
- **`fadeInTime`**: 淡入时间。**默认**: `1`。
- **`visible`**: 是否可见。**默认**: `true`。
- **`zIndex`**: **默认**: `30`。

#### `animation`

播放 GIF 或 Lottie (.json) 动画。

- **`pos`**, **`size`**, **`origin`**: 位置、尺寸、原点。
- **`maxSize`**: 最大尺寸。
- **`path`**: 动画文件路径。
- **`speed`**: 播放速度。**默认**: `1`。
- **`direction`**: 播放方向。`normal`, `reverse`, `alternate`。**默认**: `normal`。
- **`iterationCount`**: 循环播放次数。**默认**: `0` (无限)。
- **`color` / `colorEnd`**: 颜色叠加/渐变。**默认**: `FFFFFFFF`。
- **`visible`**: 是否可见。**默认**: `true`。
- **`zIndex`**: **默认**: `35`。

#### `text`

显示文本。

- **`pos`**, **`size`**, **`origin`**: 位置、尺寸、原点。
- **`rotation`**: 旋转角度。**默认**: `0`。
- **`rotationOrigin`**: 旋转中心。**默认**: `0.5 0.5`。
- **`text`**: 要显示的静态字符串。
- **`systemdata`** (`system` 视图): 显示系统数据，如 `name`, `fullname`, `gamecount`。
- **`metadata`** (`gamelist` 视图): 显示游戏元数据，如 `name`, `description`, `developer`, `genre`。
- **`defaultValue`**: 当元数据为空时显示的默认值。
- **`fontPath`**: 字体路径。
- **`fontSize`**: 字体大小。**默认**: `0.045`。
- **`color`**: 文本颜色。**默认**: `000000FF`。
- **`backgroundColor`**: 背景颜色。**默认**: `00000000` (透明)。
- **`backgroundCornerRadius`**: 背景圆角。**默认**: `0`。
- **`glowColor`**: 发光颜色。**默认**: `00000000` (禁用)。
- **`glowSize`**: 发光大小。**默认**: `0`。
- **`glowOffset`**: 发光偏移。**默认**: `0 0`。
- **`horizontalAlignment`**: 水平对齐。**默认**: `left`。
- **`verticalAlignment`**: 垂直对齐。**默认**: `center`。
- **`letterCase`**: 字母大小写。`none`, `uppercase`, `lowercase`, `capitalize`。**默认**: `none`。
- **`lineSpacing`**: 行间距。**默认**: `1.5`。
- **`container`**: 是否使用可滚动容器（对长文本如描述有用）。**默认**: `description` 为 `true`，其他为 `false`。
- **`containerStartDelay`**: 容器滚动开始延迟（秒）。**默认**: `3`。
- **`containerScrollSpeed`**: 容器滚动速度。**默认**: `1`。
- **`containerReset`**: 容器失焦时是否重置滚动。**默认**: `true`。
- **`visible`**: 是否可见。**默认**: `true`。
- **`zIndex`**: **默认**: `40`。

#### `datetime`

显示日期和时间。

- **`pos`**, **`size`**, **`origin`**: 位置、尺寸、原点。
- **`metadata`**: 要显示的时间戳，`releasedate` 或 `lastplayed`。
- **`defaultValue`**: 当元数据为空时显示的默认值。
- **`fontPath`**, **`fontSize`**, **`color`**, **`horizontalAlignment`** 等属性与 `text` 元素类似。
- **`format`**: 日期时间格式字符串 (例如 `%Y-%m-%d %H:%M`)。
- **`displayRelative`**: 是否显示为相对时间 (例如 "2天前")。**默认**: `lastplayed` 为 `true`。
- **`visible`**: 是否可见。**默认**: `true`。
- **`zIndex`**: **默认**: `40`。

#### `gamelistinfo`

显示游戏数量、筛选器等信息。

- **`pos`**, **`size`**, **`origin`**: 位置、尺寸、原点。
- **`fontPath`**, **`fontSize`**, **`color`**, **`horizontalAlignment`** 等属性与 `text` 元素类似。
- **`visible`**: 是否可见。**默认**: `true`。
- **`zIndex`**: **默认**: `45`。

#### `rating`

以图形方式显示游戏评分。

- **`pos`**, **`size`**, **`origin`**: 位置、尺寸、原点。
- **`filledPath`**: “填充”状态的评分图标路径 (例如亮星星)。
- **`unfilledPath`**: “未填充”状态的评分图标路径 (例如暗星星)。
- **`color`**: 颜色叠加。**默认**: `FFFFFFFF`。
- **`hideIfZero`**: 评分为0时是否隐藏。**默认**: `false`。
- **`overlay`**: 是否将填充图标叠加在未填充图标上。**默认**: `true`。
- **`visible`**: 是否可见。**默认**: `true`。
- **`zIndex`**: **默认**: `45`。

#### `badges`

显示一组代表游戏元数据（如喜爱、通关、控制器类型）的图标。

- **`pos`**, **`size`**, **`origin`**: 位置、尺寸、原点。
- **`slots`**: 要显示的徽章类型列表，用逗号或空格分隔。例如 `favorite, completed, controller`。
- **`direction`**: 排列方向。`row` (行) 或 `column` (列)。**默认**: `row`。
- **`lines`**: 行数。**默认**: `3`。
- **`itemsPerLine`**: 每行/列的项目数。**默认**: `4`。
- **`itemMargin`**: 项目间距。**默认**: `0.01 0.01`。
- **`badgeIconColor`**: 图标颜色。**默认**: `FFFFFFFF`。
- **`controllerIconColor`**: 控制器图标颜色。**默认**: `FFFFFFFF`。
- **`folderLinkIconColor`**: 文件夹链接图标颜色。**默认**: `FFFFFFFF`。
- **`customBadgeIcon`**: 自定义徽章图标路径。
- **`customControllerIcon`**: 自定义控制器图标路径。
- **`visible`**: 是否可见。**默认**: `true`。
- **`zIndex`**: **默认**: `35`。

### 特殊元素 (Special Elements)

#### `gameselector`

在 `system` 视图中选择游戏，以显示其媒体和元数据。

- **`selection`**: 选择标准。`random`, `lastplayed`, `mostplayed`。**默认**: `random`。
- **`gameCount`**: 选择的游戏数量。**默认**: `1`。
- **`allowDuplicates`**: 是否允许重复。**默认**: `false`。

#### `helpsystem`

显示上下文相关的帮助按钮提示（如 A-选择, B-返回）。始终显示在最顶层。

- **`pos`**: 位置。**默认**: `0.012 0.9515`。
- **`origin`**: 坐标原点。**默认**: `0 0`。
- **`rotation`**: 旋转角度。**默认**: `0`。
- **`rotationOrigin`**: 旋转中心。**默认**: `0.5 0.5`。
- **`textColor`**: 文本颜色。**默认**: `777777FF`。
- **`iconColor`**: 图标颜色。**默认**: `777777FF`。
- **`fontPath`**: 字体路径。
- **`fontSize`**: 字体大小，同时决定了图标大小。**默认**: `0.035`。
- **`scope`**: 显示范围。`shared`, `view`, `menu`, `none`。**默认**: `shared`。
- **`entries`**: 要显示的条目列表。
- **`entryLayout`**: 条目布局。`iconFirst` (图标在前), `textFirst` (文本在前)。**默认**: `iconFirst`。
- **`entryRelativeScale`**: 图标和文本的相对大小。**默认**: `1`。
- **`entrySpacing`**: 条目之间的间距。**默认**: `0.00833`。
- **`iconTextSpacing`**: 图标和文本之间的间距。**默认**: `0.00416`。
- **`letterCase`**: 字母大小写。`uppercase`, `lowercase`, `capitalize`。**默认**: `uppercase`。
- **`backgroundColor` / `backgroundColorEnd`**: 背景颜色/渐变。
- **`backgroundGradientType`**: 背景渐变方向。
- **`backgroundHorizontalPadding`**: 背景水平内边距。
- **`backgroundVerticalPadding`**: 背景垂直内边距。
- **`backgroundCornerRadius`**: 背景圆角半径。
- **`opacity`**: 不透明度。**默认**: `1`。
- **`customButtonIcon`**: 自定义按钮图标路径。

#### `sound`

为导航事件定义音效。必须在 `<view name="all">` 中定义。

- **`name`**: 音效名称，如 `systembrowse`, `select`, `back`, `launch`。
- **`path`**: 音效文件路径 (.wav)。

#### `clock`

显示当前时间。始终显示在最顶层。

- **`pos`**: 位置。**默认**: `0.018 0.016`。
- **`size`**, **`origin`**: 尺寸、原点。
- **`fontPath`**, **`fontSize`**, **`color`**, **`horizontalAlignment`** 等属性与 `text` 元素类似。
- **`format`**: 时间格式。**默认**: `%H:%M`。
- **`scope`**: 显示范围。`shared`, `view`, `menu`, `none`。**默认**: `shared`。

#### `systemstatus`

显示系统状态图标（蓝牙、Wi-Fi、电池）。始终显示在最顶层。

- **`pos`**: 位置。**默认**: `0.982 0.016`。
- **`height`**: 整体高度。**默认**: `0.035`。
- **`origin`**: 坐标原点。**默认**: `1 0`。
- **`color`**: 图标和文本颜色。**默认**: `FFFFFFFF`。
- **`fontPath`**: 电池百分比的字体路径。
- **`entries`**: 要显示的图标列表。`bluetooth`, `wifi`, `cellular`, `battery`, `all`。**默认**: `all`。
- **`entrySpacing`**: 条目间距。**默认**: `0.005`。
- **`scope`**: 显示范围。`shared`, `view`, `menu`, `none`。**默认**: `shared`。
- **`customIcon`**: 自定义图标路径。