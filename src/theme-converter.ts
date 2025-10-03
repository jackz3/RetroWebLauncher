import * as fs from 'fs';
import * as path from 'path';
import * as xml2js from 'xml2js';

interface ThemeElement {
  name: string;
  type: string;
  properties: Record<string, any>;
  children?: ThemeElement[];
}

interface ThemeView {
  name: string;
  elements: ThemeElement[];
}

interface ThemeVariables {
  [key: string]: string | {
    [schemeName: string]: {
      [key: string]: string;
    };
  };
}

interface ThemeCapabilities {
  variants: string[];
  colorSchemes: string[];
  aspectRatios: string[];
}

interface ThemeVariant {
  name: string;
  views: ThemeView[];
}

interface ThemeAspectRatio {
  name: string;
  views: ThemeView[];
  variables?: Record<string, any>;
}

interface ThemeData {
  name: string;
  variables: ThemeVariables;
  capabilities: ThemeCapabilities;
  views: ThemeView[];
  variant: ThemeVariant[];
  aspectRatio: ThemeAspectRatio[];
  assets: {
    images: string[];
    fonts: string[];
  };
}

class ThemeConverter {
  private parser: xml2js.Parser;
  private builder: xml2js.Builder;

  constructor() {
    this.parser = new xml2js.Parser({
      explicitArray: false,
      mergeAttrs: true,
      normalize: true,
      normalizeTags: false
    });
    this.builder = new xml2js.Builder();
  }

  /**
   * 解析XML文件
   */
  private async parseXmlFile(filePath: string): Promise<any> {
    try {
      const xmlContent = fs.readFileSync(filePath, 'utf-8');
      const result = await this.parser.parseStringPromise(xmlContent);
      return result;
    } catch (error) {
      console.error(`Error parsing XML file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * 处理include标签，递归解析引用的XML文件
   */
  private async processIncludes(xmlData: any, basePath: string): Promise<any> {
    if (!xmlData.theme) return xmlData;

    // 先解析变量，以便在include中使用
    const variables = this.parseVariables(xmlData);

    const includes = Array.isArray(xmlData.theme.include) 
      ? xmlData.theme.include 
      : xmlData.theme.include ? [xmlData.theme.include] : [];

    for (const include of includes) {
      // 替换include路径中的变量
      let includePath = include;
      Object.keys(variables).forEach(key => {
        includePath = includePath.replace(`\${${key}}`, variables[key]);
      });

      const fullIncludePath = path.resolve(basePath, includePath);
      
      // 检查文件是否存在
      if (!fs.existsSync(fullIncludePath)) {
        console.warn(`Include file not found: ${fullIncludePath}`);
        continue;
      }

      const includedData = await this.parseXmlFile(fullIncludePath);
      if (includedData) {
        // 合并包含的内容
        if (includedData.theme) {
          if (!xmlData.theme.view) xmlData.theme.view = [];
          if (!xmlData.theme.variables) xmlData.theme.variables = {};
          
          if (includedData.theme.view) {
            const views = Array.isArray(includedData.theme.view) 
              ? includedData.theme.view 
              : [includedData.theme.view];
            xmlData.theme.view.push(...views);
          }
          
          if (includedData.theme.variables) {
            // 合并变量
            Object.assign(xmlData.theme.variables, includedData.theme.variables);
          }
          
          // 处理colorScheme中的变量
          if (includedData.theme.colorScheme) {
            if (!xmlData.theme.colorScheme) xmlData.theme.colorScheme = [];
            const colorSchemes = Array.isArray(includedData.theme.colorScheme) 
              ? includedData.theme.colorScheme 
              : [includedData.theme.colorScheme];
            xmlData.theme.colorScheme.push(...colorSchemes);
          }
        }
      }
    }

    return xmlData;
  }

  /**
   * 解析变量
   */
  private parseVariables(xmlData: any): ThemeVariables {
    const variables: ThemeVariables = {};
    
    if (xmlData.theme && xmlData.theme.variables) {
      const vars = xmlData.theme.variables;
      Object.keys(vars).forEach(key => {
        if (key !== '$' && key !== '_') {
          variables[key] = vars[key];
        }
      });
    }

    // 处理colorScheme中的变量
    if (xmlData.theme && xmlData.theme.colorScheme) {
      const colorSchemes = Array.isArray(xmlData.theme.colorScheme) 
        ? xmlData.theme.colorScheme 
        : [xmlData.theme.colorScheme];
      
      // 创建colorSchemes对象
      variables.colorSchemes = {};
      
      colorSchemes.forEach((scheme: any) => {
        if (scheme.variables && scheme.name) {
          const schemeName = scheme.name.split(',')[0].trim(); // 取第一个名称
          (variables.colorSchemes as any)[schemeName] = {};
          
          Object.keys(scheme.variables).forEach(key => {
            if (key !== '$' && key !== '_') {
              (variables.colorSchemes as any)[schemeName][key] = scheme.variables[key];
              // 使用第一个找到的变量值作为默认值
              if (!variables[key]) {
                variables[key] = scheme.variables[key];
              }
            }
          });
        }
      });
    }

    return variables;
  }

  /**
   * 从指定元素中解析视图
   */
  private parseViewsFromElement(element: any): ThemeView[] {
    const views: ThemeView[] = [];
    
    // console.log('parseViewsFromElement called with element:', JSON.stringify(element, null, 2));
    // console.log('Element has view property:', !!element.view);
    // console.log('Element keys:', Object.keys(element));

    if (element.view) {
      const viewArray = Array.isArray(element.view) 
        ? element.view 
        : [element.view];

      viewArray.forEach((view: any) => {
        const viewNames = view.name.split(',').map((n: string) => n.trim());
        
        viewNames.forEach((viewName: string) => {
          const themeView: ThemeView = {
            name: viewName,
            elements: []
          };

          // 解析元素
          Object.keys(view).forEach(key => {
            if (key !== 'name' && key !== '$' && key !== '_') {
              const element = view[key];
              if (Array.isArray(element)) {
                element.forEach((el: any) => {
                  if (el.name) {
                    themeView.elements.push({
                      name: el.name,
                      type: key,
                      properties: this.parseElementProperties(el)
                    });
                  }
                });
              } else if (element && element.name) {
                themeView.elements.push({
                  name: element.name,
                  type: key,
                  properties: this.parseElementProperties(element)
                });
              }
            }
          });

          views.push(themeView);
        });
      });
    }

    return views;
  }

  private parseVariantAndAspectRatio(xmlData: any): [ThemeVariant[], ThemeAspectRatio[]] {
    const variants: ThemeVariant[] = [];
    let aspectRatios: ThemeAspectRatio[] = [];
  
    if (xmlData.theme) {
      // Parse top-level aspectRatio tags
      if (xmlData.theme.aspectRatio) {
        const ratios = Array.isArray(xmlData.theme.aspectRatio)
          ? xmlData.theme.aspectRatio
          : [xmlData.theme.aspectRatio];
        
        aspectRatios = ratios.map((r: any) => {
          console.log('Processing aspectRatio element:', JSON.stringify(r, null, 2)); // Add this debug log
          const variables: Record<string, any> = {};
          if (r.variables) {
            Object.keys(r.variables).forEach(key => {
              if (key !== '$' && key !== '_') {
                variables[key] = r.variables[key];
              }
            });
          }
          return {
            name: r.name,
            views: this.parseViewsFromElement(r),
            variables: variables,
          };
        });
      }
  
      // Parse variant tags
      if (xmlData.theme.variant) {
        const variantArray = Array.isArray(xmlData.theme.variant)
          ? xmlData.theme.variant
          : [xmlData.theme.variant];
  
        variantArray.forEach((v: any) => {
          const variantNames = v.name.split(',').map((n: string) => n.trim());
          
          let views: ThemeView[] = [];
          if (v.aspectRatio) {
            // If aspectRatio exists, take the first one
            const firstAspectRatio = Array.isArray(v.aspectRatio) ? v.aspectRatio[0] : v.aspectRatio;
            views = this.parseViewsFromElement(firstAspectRatio);
          } else {
            // Otherwise, parse views directly from the variant
            views = this.parseViewsFromElement(v);
          }
          
          variantNames.forEach((name: string) => {
            variants.push({
              name: name,
              views: views
            });
          });
        });
      }
    }
  
    return [variants, aspectRatios];
  }

  /**
   * 解析能力配置
   */
  private parseCapabilities(xmlData: any): ThemeCapabilities {
    const capabilities: ThemeCapabilities = {
      variants: [],
      colorSchemes: [],
      aspectRatios: []
    };
    // 处理themeCapabilities标签（ES-DE标准格式）
    if (xmlData.themeCapabilities) {
      // 解析aspectRatio
      if (xmlData.themeCapabilities.aspectRatio) {
        const ratios = Array.isArray(xmlData.themeCapabilities.aspectRatio) 
          ? xmlData.themeCapabilities.aspectRatio 
          : [xmlData.themeCapabilities.aspectRatio];
        capabilities.aspectRatios = ratios;
      }

      // 解析colorScheme
      if (xmlData.themeCapabilities.colorScheme) {
        const schemes = Array.isArray(xmlData.themeCapabilities.colorScheme) 
          ? xmlData.themeCapabilities.colorScheme 
          : [xmlData.themeCapabilities.colorScheme];
        capabilities.colorSchemes = schemes.map((s: any) => s.name);
      }

      // 解析variant
      if (xmlData.themeCapabilities.variant) {
        const variants = Array.isArray(xmlData.themeCapabilities.variant) 
          ? xmlData.themeCapabilities.variant 
          : [xmlData.themeCapabilities.variant];
        capabilities.variants = variants.map((v: any) => v.name);
      }
    }

    return capabilities;
  }

  /**
   * 解析元素属性
   */
  private parseElementProperties(element: any): Record<string, any> {
    const properties: Record<string, any> = {};
    
    Object.keys(element).forEach(key => {
      if (key !== 'name' && key !== '$' && key !== '_') {
        const value = element[key];
        if (typeof value === 'string') {
          properties[key] = value;
        } else if (typeof value === 'object' && value !== null) {
          // 处理复杂属性，如pos、size等
          properties[key] = value;
        }
      }
    });

    return properties;
  }

  /**
   * 解析视图和元素
   */
  private parseViews(xmlData: any): ThemeView[] {
    const views: ThemeView[] = [];

    if (xmlData.theme && xmlData.theme.view) {
      const viewArray = Array.isArray(xmlData.theme.view) 
        ? xmlData.theme.view 
        : [xmlData.theme.view];

      viewArray.forEach((view: any) => {
        const viewNames = view.name.split(',').map((n: string) => n.trim());
        
        viewNames.forEach((viewName: string) => {
          const themeView: ThemeView = {
            name: viewName,
            elements: []
          };

          // 解析元素
          Object.keys(view).forEach(key => {
            if (key !== 'name' && key !== '$' && key !== '_') {
              const element = view[key];
              if (Array.isArray(element)) {
                element.forEach((el: any) => {
                  if (el.name) {
                    themeView.elements.push({
                      name: el.name,
                      type: key,
                      properties: this.parseElementProperties(el)
                    });
                  }
                });
              } else if (element && element.name) {
                themeView.elements.push({
                  name: element.name,
                  type: key,
                  properties: this.parseElementProperties(element)
                });
              }
            }
          });

          views.push(themeView);
        });
      });
    }

    return views;
  }

  /**
   * 收集资源文件
   */
  private collectAssets(themePath: string, views: ThemeView[], variables: ThemeVariables): { images: string[], fonts: string[] } {
    const images: string[] = [];
    const fonts: string[] = [];

    const processAssetPath = (assetPath: string, assetType: 'image' | 'font') => {
      // If assetPath contains variable placeholders, expand for all colorSchemes
      const variableRegex = /\$\{([^\}]+)\}/g;
      const matches = assetPath.match(variableRegex);

      if (
        matches &&
        variables.colorSchemes &&
        typeof variables.colorSchemes === 'object' &&
        !Array.isArray(variables.colorSchemes)
      ) {
        // Only expand for colorSchemes if the variable is present in colorSchemes
        Object.keys(variables.colorSchemes).forEach(schemeName => {
          const schemeObj = (variables.colorSchemes as { [schemeName: string]: { [key: string]: string } })[schemeName];
          let resolvedPath = assetPath;
          matches.forEach(match => {
            const varName = match.replace('${', '').replace('}', '');
            if (schemeObj && schemeObj[varName]) {
              resolvedPath = resolvedPath.replace(match, schemeObj[varName]);
            }
          });
          const fullAssetPath = path.resolve(themePath, resolvedPath);
          if (fs.existsSync(fullAssetPath)) {
            if (assetType === 'image') {
              images.push(resolvedPath);
            } else {
              fonts.push(resolvedPath);
            }
          }
        });
      } else {
        let resolvedPath = assetPath;
        Object.keys(variables).forEach(key => {
          if (typeof variables[key] === 'string') {
            resolvedPath = resolvedPath.replace(`\${${key}}`, variables[key] as string);
          }
        });
        const fullAssetPath = path.resolve(themePath, resolvedPath);
        if (fs.existsSync(fullAssetPath)) {
          if (assetType === 'image') {
            images.push(resolvedPath);
          } else {
            fonts.push(resolvedPath);
          }
        }
      }
    };

    views.forEach(view => {
      view.elements.forEach(element => {
        // Image paths
        if (element.properties.path && element.type === 'image') {
          processAssetPath(element.properties.path, 'image');
        }

        // Font paths
        if (element.properties.fontpath) {
          processAssetPath(element.properties.fontpath, 'font');
        }
        if (element.properties.fontPath) { // camelCase version
          processAssetPath(element.properties.fontPath, 'font');
        }

        // Custom icons for systemstatus
        if (element.type === 'systemstatus' && element.properties.customIcon) {
          const icons = Array.isArray(element.properties.customIcon) ? element.properties.customIcon : [element.properties.customIcon];
          icons.forEach((icon: any) => icon._ && processAssetPath(icon._, 'image'));
        }
        
        // Custom icons and button icons for helpsystem
        if (element.type === 'helpsystem') {
            if (element.properties.customIcon) {
                const icons = Array.isArray(element.properties.customIcon) ? element.properties.customIcon : [element.properties.customIcon];
                icons.forEach((icon: any) => icon._ && processAssetPath(icon._, 'image'));
            }
            if (element.properties.customButtonIcon) {
                const icons = Array.isArray(element.properties.customButtonIcon) ? element.properties.customButtonIcon : [element.properties.customButtonIcon];
                icons.forEach((icon: any) => icon._ && processAssetPath(icon._, 'image'));
            }
        }
      });
    });

    return { 
      images: Array.from(new Set(images)), 
      fonts: Array.from(new Set(fonts)) 
    };
  }

  /**
   * 复制资源文件
   */
  private copyAssets(themePath: string, themeName: string, assets: { images: string[], fonts: string[] }): void {
    const outputDir = path.join('public', 'themes', themeName);
    
    // 创建输出目录
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // 复制图片
    assets.images.forEach(imagePath => {
      const sourcePath = path.resolve(themePath, imagePath);
      const targetPath = path.join(outputDir, imagePath);
      const targetDir = path.dirname(targetPath);
      
      if (fs.existsSync(sourcePath)) {
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }
        fs.copyFileSync(sourcePath, targetPath);
      }
    });

    // 复制字体
    assets.fonts.forEach(fontPath => {
      const sourcePath = path.resolve(themePath, fontPath);
      const targetPath = path.join(outputDir, fontPath);
      const targetDir = path.dirname(targetPath);
      
      if (fs.existsSync(sourcePath)) {
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }
        fs.copyFileSync(sourcePath, targetPath);
      }
    });
  }

  /**
   * 转换单个主题
   */
  async convertTheme(themePath: string): Promise<ThemeData | null> {
    try {
      const themeName = path.basename(themePath);
      console.log(`Converting theme: ${themeName}`);

      // 解析theme.xml
      const themeXmlPath = path.join(themePath, 'theme.xml');
      if (!fs.existsSync(themeXmlPath)) {
        console.error(`Theme XML not found: ${themeXmlPath}`);
        return null;
      }

      let themeData = await this.parseXmlFile(themeXmlPath);
      if (!themeData) return null;

      // 处理includes
      themeData = await this.processIncludes(themeData, themePath);

      // 解析capabilities.xml
      const capabilitiesPath = path.join(themePath, 'capabilities.xml');
      let capabilitiesData = null;
      if (fs.existsSync(capabilitiesPath)) {
        capabilitiesData = await this.parseXmlFile(capabilitiesPath);
      }

      // 构建主题数据
      const [variant, aspectRatio] = this.parseVariantAndAspectRatio(themeData);
      const views = this.parseViews(themeData);

      // Gather all views from top-level, aspectRatio, and variant
      let allViews: ThemeView[] = [...views];
      aspectRatio.forEach(r => {
        if (r.views && Array.isArray(r.views)) {
          allViews.push(...r.views);
        }
      });
      variant.forEach(v => {
        if (v.views && Array.isArray(v.views)) {
          allViews.push(...v.views);
        }
      });

      const theme: ThemeData = {
        name: themeName,
        variables: this.parseVariables(themeData),
        capabilities: this.parseCapabilities(capabilitiesData || {}),
        views: views,
        variant: variant,
        aspectRatio: aspectRatio,
        assets: { images: [], fonts: [] }
      };

      // 收集资源
      theme.assets = this.collectAssets(themePath, allViews, theme.variables);

      // 复制资源文件
      this.copyAssets(themePath, themeName, theme.assets);

      return theme;
    } catch (error) {
      console.error(`Error converting theme ${themePath}:`, error);
      return null;
    }
  }

  /**
   * 转换所有主题
   */
  async convertAllThemes(): Promise<void> {
    const themesDir = 'es-de_themes';
    const outputDir = 'public/themes';

    if (!fs.existsSync(themesDir)) {
      console.log('No themes directory found');
      return;
    }

    // 确保输出目录存在
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const themeDirs = fs.readdirSync(themesDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    console.log(`Found ${themeDirs.length} themes to convert`);

    for (const themeDir of themeDirs) {
      const themePath = path.join(themesDir, themeDir);
      const theme = await this.convertTheme(themePath);
      
      if (theme) {
        const outputPath = path.join(outputDir, `${themeDir}.json`);
        fs.writeFileSync(outputPath, JSON.stringify(theme, null, 2));
        console.log(`Converted ${themeDir} -> ${outputPath}`);
      }
    }

    console.log('Theme conversion completed!');
  }
}

// 如果直接运行此文件
if (require.main === module) {
  const converter = new ThemeConverter();
  converter.convertAllThemes().catch(console.error);
}

export default ThemeConverter;
