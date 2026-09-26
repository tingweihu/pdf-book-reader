[English](README.md) | [繁體中文](README.zh-TW.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md)

# PDF Book Reader

[在线演示](https://pdf-book-reader-tau.vercel.app) · [GitHub 仓库](https://github.com/tingweihu/pdf-book-reader)

PDF Book Reader 是一款面向精心排版文档的开源 PDF 阅读器。只放入 PDF 即可使用；需要目录、品牌信息、主题色或版式指定时，再添加可选的 `book.json`。

## 为什么做这个项目

书籍和刊物的 PDF 经常混用竖版单页与已经排好左右内容的横版整页。**一个 PDF 页面就是一个文档页面。**桌面端完整保留横版页面；在窄屏上，检测或指定的组合跨页可按*同一页面*的左、右两段依次阅读。阅读器不会把两个无关的 PDF 页面拼在一起。

## 功能与适用场景

- CSS 3D 书封首页、翻页与键盘导航、缩略图、适配视图与缩放／拖动、全屏、页面过渡、专注模式以及减少动态效果。
- 使用 localStorage 保存基于页码的进度并继续阅读，在 25／50／75／100% 显示轻提示。跟随系统／浅色／深色模式只影响阅读器界面，不修改 PDF 图像。
- 可通过 `book.json` 添加目录、随章节变色的翻页按钮及背景、出版方与页脚链接、主题色、Logo 和下载链接。
- 适用于书籍、杂志、年报、白皮书、产品目录、作品集、品牌手册、编辑类出版物、学习资料和经过排版设计的 PDF 报告。

## 在线演示

查看 [Three Moments 在线演示](https://pdf-book-reader-tau.vercel.app)。演示中的仓库链接指向[公开源码](https://github.com/tingweihu/pdf-book-reader)。

## 随附的演示刊物

`Three Moments` 是专为本仓库制作的虚构演示内容，不代表真实的出版物、公司、客户、机构或商业产品。其品牌视觉、饮食内容、图片与出版物设计均仅供演示。

`public/EXAMPLE_*` 是可替换的演示素材：`EXAMPLE_BOOK.pdf`、`EXAMPLE_BOOK.json`、兼作演示 favicon 的 `EXAMPLE_MARK.png`，以及 `EXAMPLE_CHAPTER_01.png`、`EXAMPLE_CHAPTER_02.png`、`EXAMPLE_CHAPTER_03.png`；`public/favicon.svg` 是阅读器的中性默认图标。

## 快速开始

克隆或下载项目后：

1. 运行 `npm install`。
2. 将自己的 PDF 放到 `public/book.pdf`。
3. 运行 `npm run dev`，打开 Vite 输出的网址。

无需改动阅读器代码。`book.pdf` 优先于 `EXAMPLE_BOOK.pdf`；自己的 PDF 即使没有配置也能阅读。演示配置通过 PDF 指纹绑定演示文件，遇到其他 PDF 会静默忽略。需要自定义出版物信息时，再添加 `public/book.json`。

## 零配置模式

自己的出版物只需要 `public/book.pdf`；如果没有这个文件，则会打开随附的 `EXAMPLE_BOOK.pdf`。阅读器运行时测量页数和页面尺寸。首页、翻页、缩略图、缩放／拖动、全屏、专注模式、外观模式及本地进度仍可使用。没有匹配的元数据时，标题和主题采用中性默认值；目录与配置的链接不会显示。

## 可选的 `book.json`

将 `book.json` 放在 `public/`，与 PDF 同级。它可设置标题／副标题、封面、Logo、目录章节与条目、主题色、下载链接和 `layoutOverrides`。页码从 1 开始。例如：

```json
{
  "title": "Field Notes",
  "chapters": [{"id": "intro", "title": "Introduction", "startPage": 1, "color": "#345C7D"}],
  "theme": {"accent": "#345C7D"},
  "layoutOverrides": [
    {"page": 2, "mode": "single"},
    {"startPage": 3, "endPage": 4, "mode": "spread"}
  ],
  "downloads": [{"label": "PDF", "href": "/book.pdf"}]
}
```

竖版页面默认按单页显示；足够宽的横版页面会被视为跨页候选。如果横版页面在窄屏上也应保持完整，请用 `layoutOverrides` 指定 `single`；如果它是组合跨页，指定 `spread`，窄屏便会显示同一页的左、右两段。桌面端始终一次显示一个完整的 PDF 页面。可选的 `pdfFingerprint` 能将元数据绑定到特定 PDF。

可选的 `cover` 指定首页图片或 PDF 页面；`branding.logo` 与 `branding.favicon`、`chapters[].background`、`publisher`（名称／Logo／网站）、`socialLinks`（网站／Facebook／Instagram／LinkedIn／X）、`legal`（隐私／条款）和 `project.repositoryUrl` 只显示实际填写的内容。链接会经过安全校验。配置优先级是 `book.json` → `publication.json`（兼容用途）→ `EXAMPLE_BOOK.json` → 中性默认值；较高优先级文件格式错误时会提示，不会悄悄切换到后者。

## 项目结构

```text
public/   自己的 book.pdf／book.json 与可替换的 EXAMPLE_* 演示素材
src/      通用阅读器与 PDF 渲染代码
tests/    自动化测试及无关演示内容的 PDF 测试文件
scripts/  PDF 页面尺寸检查
docs/     架构、发布和本地评审说明
```

## 命令

| 命令 | 用途 |
| --- | --- |
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 检查类型并构建生产文件 |
| `npm run preview` | 在本地预览生产构建 |
| `npm run typecheck` | 检查 TypeScript 和 JSDoc 类型 |
| `npm test` | 运行自动化测试 |
| `npm run inspect:pdf` | 输出 book.pdf 的页面尺寸和模式；没有时检查演示 PDF |

## 当前限制

自动跨页判断基于启发式规则；判断有误时请使用 `layoutOverrides`。阅读进度只保存在当前浏览器中，存储被禁用时无法恢复进度。本项目不提供云同步或 PDF 上传界面。详见[架构说明](docs/architecture.md)和[本地评审清单](docs/LOCAL_REVIEW.md)。

## 许可

源代码采用 [MIT](LICENSE)；随附演示出版物素材采用 [CC BY 4.0](ASSET_PROVENANCE.md)。第三方依赖仍遵循各自的许可证。
