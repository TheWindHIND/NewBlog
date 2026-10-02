# NewBlog 项目长期备忘

## 仓库与站点
- GitHub: https://github.com/TheWindHIND/NewBlog（public，main 分支）
- 站点: https://thewindhind.github.io/NewBlog/
- 部署：GitHub Actions（.github/workflows/pages.yml），push 到 main 自动发布
- 用户偏好从零手写设计静态博客，不急着上框架（Hugo/Astro 等）待定

## 环境坑（务必记住）
- 本 bash 中 git 需用系统版：`"/c/Program Files/Git/cmd/git.exe" -c http.schannelCheckRevoke=false push`
  （PATH 默认的 PortableGit 不认该配置，代理环境下 TLS 会失败）
- GitHub API 用 curl 时加 `--ssl-revoke-best-effort`
- GitHub 令牌存在 Windows 凭据管理器，push 自动认证；如失效需用户重新生成并 `git credential approve`
