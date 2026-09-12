# next-study-static

独立 Next.js 静态站，用于承载从 `liujianping0329/next-market` 搬迁过来的 `public/study`。

## EdgeOne 一键部署

[![Deploy with EdgeOne Makers](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://edgeone.ai/pages/new?repository-url=https%3A%2F%2Fgithub.com%2Fliujianping0329%2Fnext-study-static&project-name=next-study-static&install-command=npm%20install&build-command=npm%20run%20build&output-directory=out)

部署参数：

- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: `out`
- Node.js: `22.11.0`

根目录已包含 `edgeone.json`。

## 本地

```bash
npm install
npm run dev
```

`npm run build` 会直接使用当前仓库中的 `public/study/**`，静态导出到 `out/`，构建时不依赖原仓库。

如果以后需要重新从原仓库同步一次最新内容，可手动执行：

```bash
npm run sync:study
```

## 同步工具

`scripts/sync-study.mjs` 会递归同步原仓库 `public/study/**`。`.github/workflows/sync-study.yml` 也支持手动 `workflow_dispatch`；首次初始化时已通过该工作流完成 33 个文件的搬迁。