# 贡献指南

感谢你对本项目的关注！欢迎提交 Issue、Pull Request 或改进建议。

## 如何贡献

1. **Fork** 本仓库
2. 创建特性分支：`git checkout -b feature/my-feature`
3. 提交修改：`git commit -m "feat: add my feature"`
4. 推送分支：`git push origin feature/my-feature`
5. 发起 **Pull Request**

## 开发与测试

修改本仓库的技能或配置后，可以用 `CLAUDE_CONFIG_DIR` 环境变量把 Claude Code 的配置目录直接指向仓库，进行真实测试而不影响 `~/.claude` 下的日常配置：

```sh
# 在任意项目目录用本仓库的配置启动一次性测试会话
CLAUDE_CONFIG_DIR=/path/to/claude-code-settings claude

# 非交互式冒烟测试：验证技能是否正确加载
CLAUDE_CONFIG_DIR=/path/to/claude-code-settings \
  claude -p "List every skill you can currently invoke" --max-turns 2

# 也可以固定成别名
alias claude-test='CLAUDE_CONFIG_DIR=/path/to/claude-code-settings claude'
```

**验证要点：**

- 技能列表应包含仓库 `skills/` 下的技能；`grill-me` 和 `handoff` 因设置了 `disable-model-invocation: true` 不会出现在自动触发列表中，需用 `/grill-me`、`/handoff` 手动调用验证
- 修改 SKILL.md 描述后，可用自然语言请求（而非 `/skill-name`）测试自动触发是否符合预期
- 技能结构校验：`cd skills/skill-creator && python3 -m scripts.quick_validate ../<skill-name>`

**注意：** 测试会话会把运行时状态写回仓库目录（`.claude.json`、`projects/`、settings.json 的字段重排等）。运行时产物已在 `.gitignore` 中忽略，但测试后建议 `git diff` 确认 settings.json 没有混入不想入库的个人设置。
