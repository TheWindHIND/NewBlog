---
title: 给博客加上荒/芒双主题
description: 主题切换按钮做成芙宁娜的双色瞳，配合 View Transition 做水幕过渡的实现笔记。
date: 2026-10-03
tags:
  - 技术笔记
  - 前端
series: 猫窝建设日志
seriesIndex: 2
---

主题系统的核心是 CSS 变量：把颜色全部抽成 token，切主题只是换一组变量值。

## 防闪烁

在 `<head>` 里放一段内联脚本，页面渲染前就确定主题：

```js
const saved = localStorage.getItem('catnest.theme');
const theme = saved ?? (new Date().getHours() >= 18 ? 'ousia' : 'pneuma');
document.documentElement.dataset.theme = theme;
```

## 水幕过渡

`document.startViewTransition()` 是浏览器原生 API，切换瞬间给新旧截图加动画：

```css
::view-transition-new(root) {
  animation: water-wipe-in 0.7s ease both;
}
```

不支持的浏览器自动降级为普通过渡，`prefers-reduced-motion` 用户则直接切换——三层兜底。
