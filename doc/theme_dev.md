# ES-DE Theme Development for Renderers (Concise Guide)

This document provides a concise overview of the ES-DE theming system, focusing on the information necessary for a developer to build a theme renderer. It covers XML structure, views, elements, properties, and the rendering process.

## 1. Core Concepts

An ES-DE theme is a collection of XML files and assets (images, fonts, etc.). The renderer's job is to parse these XML files and draw the UI according to the definitions.

### 1.1. XML File Structure

The primary configuration is done via `.xml` files. All theme configuration must be within a `<theme>` tag.

```xml
<theme>
    <!-- All other definitions go here -->
</theme>
```

- **Includes:** Themes can be split into multiple files using the `<include>` tag. The path is relative to the current XML file. Included files are parsed as if their content was pasted in place.

  ```xml
  <theme>
      <include>./../shared_elements.xml</include>
      <!-- ... -->
  </theme>
  ```

### 1.2. Views

ES-DE has two main UI screens, called **views**:

-   **`system`**: The view for selecting a game system (e.g., NES, SNES).
-   **`gamelist`**: The view for browsing the list of games within a selected system.

In the XML, elements are defined within a `<view>` tag:

```xml
<theme>
    <view name="system">
        <!-- Elements for the system view -->
    </view>
    <view name="gamelist">
        <!-- Elements for the gamelist view -->
    </view>
</theme>
```

You can apply the same elements to both views by comma-separating the names: `<view name="system, gamelist">`.

### 1.3. Elements

**Elements** are the visual components on the screen (e.g., images, text). Each element is defined by its type (e.g., `<image>`, `<text>`) and a unique `name` attribute.

```xml
<view name="gamelist">
    <image name="gameScreenshot">
        <!-- Properties for this image -->
    </image>
    <text name="gameTitle">
        <!-- Properties for this text -->
    </text>
</view>
```

-   **Element Merging:** An element's properties can be defined across multiple files or locations. As long as the element `type` and `name` are the same, their properties are merged. If a property is defined multiple times, the last one parsed wins.

### 1.4. Properties

**Properties** define an element's appearance and behavior (e.g., position, size, color).

```xml
<text name="gameTitle">
    <pos>0.5 0.5</pos>
    <size>0.8 0.1</size>
    <color>FFFFFF</color>
</text>
```

## 2. Rendering and Layout

### 2.1. Coordinate System

ES-DE uses a normalized coordinate system based on the screen dimensions.

-   **`<pos>` (Position):** A pair of floats `X Y` from `0.0` to `1.0`.
    -   `(0 0)` is the top-left corner of the screen.
    -   `(1 1)` is the bottom-right corner.
-   **`<size>` (Size):** A pair of floats `W H` from `0.0` to `1.0`, representing a percentage of the screen's width and height.
    -   `<size>1 1</size>` means the element is the full size of the screen.
-   **`<origin>` (Origin Point):** A pair of floats `X Y` that defines the element's anchor point for positioning.
    -   `(0 0)` (default): The top-left corner of the element is placed at `<pos>`.
    -   `(0.5 0.5)`: The center of the element is placed at `<pos>`.
    -   `(1 1)`: The bottom-right of the element is placed at `<pos>`.

**Example:** To center an element of size 200x100 on a 1920x1080 screen:
```xml
<image name="centeredImage">
    <pos>0.5 0.5</pos>
    <origin>0.5 0.5</origin>
    <size>0.104 0.092</size> <!-- 200/1920, 100/1080 -->
</image>
```

### 2.2. Rendering Order (z-index)

The `<zIndex>` property (float) controls the stacking order of elements. Elements with lower `zIndex` values are drawn first (further back).

**Default `zIndex` values:**
- `image`: 30
- `video`: 30
- `animation`: 35
- `text`: 40
- `datetime`: 40
- `rating`: 45
- `carousel`: 50
- `grid`: 50
- `textlist`: 50

The `helpsystem` is always rendered on top.

## 3. Element Types and Rendering Properties

This section details the elements available in ES-DE themes and the key properties a renderer needs to implement.

### 3.1. Secondary Elements (Static & Metadata)

These elements form the main building blocks of a theme's appearance.

#### `<image>`
Displays a static or metadata-driven image.
-   **Sizing & Position**:
    -   `<pos>`, `<origin>`: Standard position and anchor point.
    -   `<size>`: Specific size. If one axis is 0, aspect ratio is maintained.
    -   `<maxSize>`: Scales image to fit within these dimensions, maintaining aspect ratio. Overrides `cropSize`.
    -   `<cropSize>`: Resizes and crops the image to this exact size.
    -   `<rotation>`: Angle in degrees for rotation.
    -   `<rotationOrigin>`: Anchor point for rotation (`0.5 0.5` is the center).
-   **Source**:
    -   `<path>`: Path to a static image file.
    -   `<imageType>`: Displays an image from game metadata (e.g., `cover`, `screenshot`, `fanart`).
    -   `<default>`: Fallback image path if `path` or `imageType` image is not found.
-   **Appearance**:
    -   `<tile>` (boolean): If true, tiles the image at its original size (or `<tileSize>`) instead of stretching.
    -   `<color>`, `<colorEnd>`: Hex color tint. Defines a gradient if both are used.
    -   `<gradientType>`: `horizontal` or `vertical`.
    -   `<cornerRadius>`: (float) Radius for rounded corners, as a percentage of screen width.
    -   `<saturation>`: (float, 0-1) Color saturation. `0` is grayscale.
    -   `<brightness>`: (float, -2 to 2) Brightness adjustment.
    -   `<opacity>`: (float, 0-1) Overall transparency.
    -   `<flipHorizontal>`, `<flipVertical>`: (boolean) Flips the image texture.
    -   `<interpolation>`: `nearest` or `linear`. Quality setting for scaling/rotation.
-   **Misc**:
    -   `<zIndex>`: (float) Stacking order. Default: `30`.
    -   `<visible>`: (boolean) Toggles visibility.

#### `<video>`
Displays a video, with an optional static image fallback.
-   **Sizing & Position**:
    -   Similar to `<image>`: `<pos>`, `<origin>`, `<size>`, `<maxSize>`, `<cropSize>`, `<rotation>`.
    -   Can have separate sizing for the initial image vs. the video (`<imageSize>`, `<imageMaxSize>`, etc.).
-   **Source**:
    -   `<path>`: Path to a static video file.
    -   `Game Media`: If `<path>` is not set, plays the video for the selected game.
    -   `<imageType>`: Image to show before video playback (if `<delay>` is > 0).
    -   `<default>`: Fallback video path.
    -   `<defaultImage>`: Fallback image path.
-   **Playback & Appearance**:
    -   `<delay>`: (float) Seconds to show `<imageType>` image before video plays.
    -   `<audio>`: (boolean) Toggles audio playback.
    -   `<pillarboxes>`: (boolean) Renders black bars to preserve aspect ratio for vertical videos, etc.
    -   `<scanlines>`: (boolean) Applies a scanline shader effect.
    -   `<videoCornerRadius>`, `<imageCornerRadius>`: Separate corner rounding for video and the initial image.
    -   `<color>`, `<saturation>`, `<brightness>`, `<opacity>`: Similar to `<image>`.
-   **Misc**:
    -   `<zIndex>`: Default: `30`.

#### `<text>`
Displays static or metadata-driven text.
-   **Content**:
    -   `<text>`: A literal string.
    -   `<metadata>`: Displays a metadata field (e.g., `name`, `description`, `developer`).
    -   `<systemdata>`: Displays system info (e.g., `gamecount`).
    -   `<defaultValue>`: Fallback text if metadata is empty.
-   **Font & Style**:
    -   `<fontPath>`: Path to a `.ttf` or `.otf` font.
    -   `<fontSize>`: Font size, normalized to screen height.
    -   `<color>`: Hex color of the text.
    -   `<lineSpacing>`: (float) Multiplier for space between lines.
    -   `<letterCase>`: `none`, `uppercase`, `lowercase`, `capitalize`.
-   **Layout & Alignment**:
    -   `<pos>`, `<size>`, `<origin>`: Standard layout properties. `size` of `w 0` enables auto-wrapping.
    -   `<horizontalAlignment>`: `left`, `center`, `right`.
    -   `<verticalAlignment>`: `top`, `center`, `bottom`.
-   **Container**:
    -   `<container>`: (boolean) If true, places text in a scrollable box (required for long descriptions).
    -   `<containerType>`: `vertical` or `horizontal`.
    -   `<containerScrollSpeed>`, `<containerStartDelay>`: Control scrolling behavior.
-   **Background**:
    -   `<backgroundColor>`: Hex color for a background box.
    -   `<backgroundCornerRadius>`: Rounded corners for the background.
-   **Misc**:
    -   `<zIndex>`: Default: `40`.

#### `<animation>`
Displays a GIF or Lottie (`.json`) animation.
-   `<path>`: Path to `.gif` or `.json` file.
-   `<speed>`: (float) Playback speed multiplier.
-   `<direction>`: `normal`, `reverse`, `alternate`.
-   `<iterationCount>`: (int) How many times to loop (0 for infinite).
-   Other properties are similar to `<image>`: `<pos>`, `<size>`, `<origin>`, `<rotation>`, `<color>`, `<opacity>`, etc.
-   `<zIndex>`: Default: `35`.

#### `<rating>`
Displays a graphical star rating.
-   `<pos>`, `<size>`, `<origin>`: Standard layout. Sizing maintains aspect ratio.
-   `<filledPath>`: Path to the "filled star" image.
-   `<unfilledPath>`: Path to the "empty star" image.
-   `<overlay>`: (boolean) If true, filled stars are drawn directly on top of empty ones.
-   `<color>`: Tints the rating images.
-   `<zIndex>`: Default: `45`.

#### `<badges>`
Displays a grid of icons for game metadata (favorite, completed, controller, etc.).
-   `<slots>`: Comma-separated list of which badges to display (e.g., `favorite,controller,manual`).
-   `<direction>`: `row` or `column`.
-   `<lines>`, `<itemsPerLine>`: Defines the grid dimensions.
-   `<itemMargin>`: Space between badges.
-   `<customBadgeIcon badge="...">`: Overrides the image for a specific badge.
-   `<badgeIconColor>`: Tints all badge icons.
-   `<zIndex>`: Default: `35`.

### 3.2. Primary Elements (Interactive Lists)

A view can only have one of these. They are responsible for handling user navigation (up/down/left/right).

#### `<textlist>`
A vertical list of text entries.
-   **Layout**: `<pos>`, `<size>`, `<origin>`.
-   **Text Styling**: `<fontPath>`, `<fontSize>`, `<lineSpacing>`, `<horizontalAlignment>`.
-   **Colors**:
    -   `<primaryColor>`, `<secondaryColor>`: For files and folders.
    -   `<selectedColor>`, `<selectedSecondaryColor>`: For the highlighted entry.
-   **Selector Bar**:
    -   `<selectorColor>`, `<selectorColorEnd>`: Color/gradient for the selection bar.
    -   `<selectorImagePath>`: Image to use for the selector instead of a solid color.
    -   `<selectorHeight>`, `<selectorWidth>`: Size of the selector.
    -   `<selectorVerticalOffset>`, `<selectorHorizontalOffset>`: Fine-tune selector position.
-   `<zIndex>`: Default: `50`.

#### `<carousel>`
A horizontal or vertical carousel of items (usually images).
-   **Layout**:
    -   `<type>`: `horizontal`, `vertical`, `horizontalWheel`, `verticalWheel`.
    -   `<pos>`, `<size>`, `<origin>`: Position of the entire carousel area.
    -   `<itemSize>`: Size of the items.
    -   `<maxItemCount>`: (float) Number of items to display for linear carousels.
-   **Item Appearance**:
    -   `<itemScale>`: (float) Size multiplier for the selected item.
    -   `<unfocusedItemOpacity>`: (float, 0-1) Opacity of non-selected items.
    -   `<unfocusedItemSaturation>`: (float, 0-1) Saturation of non-selected items.
    -   `<imageFit>`: `contain`, `fill`, `cover`. How to fit the image within `<itemSize>`.
    -   `<imageColor>`, `<imageSelectedColor>`: Tints for default and selected items.
-   **Special Effects**:
    -   `<reflections>`: (boolean) Adds a reflection effect below horizontal carousels.
    -   `<itemRotation>`, `<itemRotationOrigin>`: For `wheel` type carousels.
-   `<zIndex>`: Default: `50`.

#### `<grid>`
A 2D grid of items (usually images).
-   **Layout**:
    -   `<pos>`, `<size>`, `<origin>`: Position of the entire grid area.
    -   `<itemSize>`: Size of each grid item.
    -   `<itemSpacing>`: Space between items.
    -   `<fractionalRows>`: (boolean) Whether to render partial rows.
-   **Item Appearance**:
    -   `<itemScale>`: (float) Size multiplier for the selected item.
    -   `<unfocusedItemOpacity>`, `<unfocusedItemSaturation>`, `<unfocusedItemDimming>`.
    -   `<imageFit>`: `contain`, `fill`, `cover`.
-   **Selector/Background**:
    -   `<selectorImage>`: An image drawn on top of the selected item.
    -   `<backgroundImage>`: An image drawn behind each item's main image.
    -   `<selectorColor>`, `<backgroundColor>`: Can be used instead of images.
-   `<zIndex>`: Default: `50`.

### 3.3. Special Elements (Overlays)

These elements have special rendering rules and are often rendered on top of all other view elements.

#### `<helpsystem>`
Displays context-sensitive help icons and text (e.g., "A SELECT").
-   Always rendered on top of other view elements (except menus).
-   Key properties: `<fontPath>`, `<fontSize>`, `<textColor>`, `<iconColor>`, `<entrySpacing>`.

#### `<clock>`
Displays the current time and/or date.
-   Always rendered on top and is stationary during transitions.
-   Key properties: `<format>`, `<fontPath>`, `<fontSize>`, `<color>`.

#### `<systemstatus>`
Displays status icons (Wi-Fi, Bluetooth, Battery).
-   Always rendered on top and is stationary during transitions.
-   Key properties: `<entries>`, `<height>`, `<color>`, `<entrySpacing>`.

## 4. Advanced Features (for Renderer Awareness)

A renderer must be aware of these features as they dynamically alter which elements and properties are active.

### 4.1. Variables

Variables allow for dynamic values in properties. They are referenced with the `${variableName}` syntax.

-   **System Variables:** Provided by ES-DE (e.g., `${system.name}`, `${system.theme}`).
-   **Theme-defined Variables:** Defined within a `<variables>` block.

```xml
<variables>
    <themeColor>8B0000</themeColor>
</variables>
<text name="title">
    <color>${themeColor}</color>
</text>
```

### 4.2. `capabilities.xml`

This file, located in the theme's root, declares supported features like variants, color schemes, and aspect ratios. The renderer needs to know the user's selection for these to apply the correct XML blocks.

### 4.3. Variants, Color Schemes, Aspect Ratios

These features allow a single theme to have multiple looks. They work by wrapping sections of the XML in special tags. The renderer should only parse the blocks corresponding to the user's selected variant, color scheme, etc.

-   **`<variant name="variantName">`**: Defines a major layout or functional change (e.g., a list view vs. a grid view).
-   **`<colorScheme name="schemeName">`**: Typically defines a set of color variables.
-   **`<aspectRatio name="16:9">`**: Defines layout adjustments for different screen aspect ratios.

**Parsing Logic:**
1.  Read `capabilities.xml` to know available variants, schemes, etc.
2.  Get the user's current selection (e.g., variant "grid", color scheme "dark").
3.  When parsing theme XML files:
    -   Parse all content outside of any special blocks.
    -   Parse content inside `<variant name="grid">`.
    -   Parse content inside `<colorScheme name="dark">`.
    -   Ignore blocks for other variants/schemes.
