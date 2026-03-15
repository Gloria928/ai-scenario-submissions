# AI场景编程教材 - 作业提交系统

## 📚 项目概述

这是一个为AI场景编程数字教材设计的作业提交和自动评分系统，专为Gloria928老师的教学需求定制。

## 🎯 功能特点

### 学生功能
- 📝 **在线提交**：在Gitee教材页面直接提交Python作业
- ⚡ **自动评分**：GitHub Actions自动分析代码质量
- 📊 **即时反馈**：详细的评分报告和改进建议
- 🔄 **状态查询**：实时查看提交和评分状态

### 教师功能
- 👩‍🏫 **集中管理**：在GitHub查看所有学生提交
- 📈 **自动评分**：减少手动批改工作量
- 📋 **数据统计**：作业提交情况和成绩统计
- 🔒 **安全可靠**：代码隔离，防止学生互相影响

## 🏗️ 系统架构

```
学生（Gitee页面） → 后端代理服务 → GitHub仓库 → GitHub Actions评分 → 后端代理服务 → 学生（Gitee页面）
```

## 📁 文件结构

```
ai-scenario-submissions/
├── server.js                 # 后端代理服务器
├── package.json             # Node.js依赖配置
├── .env.example             # 环境变量示例
├── .github/workflows/       # GitHub Actions工作流
│   └── grade-python.yml     # Python作业评分工作流
├── public/                  # 静态文件
│   └── submission-form.html # 前端提交表单
└── docs/                    # 文档
    ├── deployment-guide.md  # 部署指南
    └── teacher-guide.md     # 教师使用指南
```

## 🚀 快速开始

### 1. 部署后端服务
```bash
# 克隆仓库
git clone https://github.com/Gloria928/ai-scenario-submissions.git

# 安装依赖
cd ai-scenario-submissions
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入你的配置

# 启动服务
npm start
```

### 2. 配置GitHub
1. 创建GitHub Personal Access Token（repo、workflow、issues权限）
2. 在仓库Settings中配置Secrets

### 3. 集成到Gitee
1. 将 `public/submission-form.html` 嵌入你的教材页面
2. 修改表单中的API地址为你的后端服务地址

## 🔧 技术栈

- **后端**：Node.js + Express
- **前端**：HTML5 + CSS3 + JavaScript
- **自动化**：GitHub Actions
- **代码分析**：Pylint、Black、Radon、Bandit、Pytest
- **部署**：Vercel（推荐）或自有服务器

## 📊 评分维度

### Python作业评分标准
1. **正确性**（40%）：测试通过率
2. **代码质量**（30%）：Pylint评分、代码规范
3. **代码规范**（20%）：圈复杂度、注释比例
4. **创新性**（10%）：代码设计和实现创新

## 🛡️ 安全特性

- 🔐 **Token保护**：GitHub Token通过环境变量配置
- 🛡️ **输入验证**：代码长度限制、语言验证
- ⏱️ **速率限制**：防止滥用提交系统
- 🧹 **数据清理**：自动清理旧数据

## 📞 支持与帮助

### 遇到问题
1. 查看部署指南：`docs/deployment-guide.md`
2. 查看教师指南：`docs/teacher-guide.md`
3. 在GitHub Issues中提问

### 联系开发者
- GitHub: [Gloria928](https://github.com/Gloria928)
- 助手: 顾三（通过QQ联系）

## 📄 许可证

MIT License - 详见 LICENSE 文件

---

**祝教学顺利！** 🎉

如果有任何问题或建议，欢迎在GitHub Issues中提出。