/**
 * AI场景编程教材 - 作业提交代理服务器（Render优化版）
 * 专为 Gloria928 定制 - Render.com部署版本
 */

const express = require('express');
const axios = require('axios');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

// 中间件配置 - Render.com优化
app.use(cors({
  origin: '*', // Render.com需要宽松的CORS设置
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// 课堂规模优化：60人，每周一次作业
const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 10, // 每个IP最多10次提交
  message: { 
    success: false,
    error: '提交过于频繁',
    message: '请15分钟后再试，或联系教师获取帮助。'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false
});

// GitHub配置 - 从环境变量读取
const GITHUB_CONFIG = {
  owner: process.env.GITHUB_OWNER || 'Gloria928',
  repo: process.env.GITHUB_REPO || 'ai-scenario-submissions',
  token: process.env.GITHUB_TOKEN
};

// 验证配置
if (!GITHUB_CONFIG.token) {
  console.error('❌ 错误：请设置GITHUB_TOKEN环境变量');
  console.log('💡 在Render.com控制面板添加环境变量：');
  console.log('1. 点击Environment');
  console.log('2. 添加GITHUB_TOKEN变量');
  console.log('3. 值为你的GitHub Personal Access Token');
}

// 简单内存缓存
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

// 提交状态跟踪
const submissionStatus = new Map();

// 健康检查 - Render.com监控需要
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'AI场景编程作业提交系统',
    teacher: 'Gloria928',
    students: 60,
    frequency: '每周一次',
    language: 'Python',
    github: `https://github.com/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}`,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    submissions: submissionStatus.size,
    environment: process.env.NODE_ENV || 'development',
    port: PORT
  });
});

// 根路径重定向到健康检查
app.get('/', (req, res) => {
  res.redirect('/health');
});

// 静态文件服务
app.use('/public', express.static('public'));

// 提交作业 - 简化版本
app.post('/api/submit', submitLimiter, async (req, res) => {
  try {
    const { studentName, studentId, assignment, language = 'python', code } = req.body;
    
    // 基础验证
    if (!studentName || !assignment || !code) {
      return res.status(400).json({
        success: false,
        error: '缺少必要信息',
        message: '请填写姓名、作业题目和代码。'
      });
    }
    
    // 生成提交ID
    const submissionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    // 设置初始状态
    submissionStatus.set(submissionId, {
      status: 'pending',
      studentName,
      assignment,
      submittedAt: new Date().toISOString()
    });
    
    console.log(`📤 收到作业提交：${submissionId} - ${studentName} - ${assignment}`);
    
    // 异步处理GitHub提交
    setTimeout(async () => {
      try {
        // 创建GitHub Issue
        const issueTitle = `[作业] ${assignment} - ${studentName}`;
        const issueBody = `## 学生信息
- **姓名**：${studentName}
- **学号**：${studentId || '未提供'}
- **作业题目**：${assignment}
- **编程语言**：${language}
- **提交ID**：${submissionId}

## 提交代码
\`\`\`${language}
${code}
\`\`\`

## 系统信息
- **提交时间**：${new Date().toLocaleString('zh-CN')}
- **状态**：待评分

---
*由AI场景编程教材作业系统自动创建*`;
        
        const issueData = {
          title: issueTitle,
          body: issueBody,
          labels: ['assignment-submission', 'pending-grading']
        };
        
        const response = await axios.post(
          `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/issues`,
          issueData,
          {
            headers: {
              'Authorization': `token ${GITHUB_CONFIG.token}`,
              'Accept': 'application/vnd.github.v3+json'
            },
            timeout: 30000
          }
        );
        
        submissionStatus.set(submissionId, {
          ...submissionStatus.get(submissionId),
          status: 'submitted',
          issueNumber: response.data.number,
          issueUrl: response.data.html_url
        });
        
        console.log(`✅ 作业提交成功：${submissionId} -> Issue #${response.data.number}`);
        
      } catch (error) {
        console.error(`❌ GitHub提交失败：${submissionId}`, error.message);
        submissionStatus.set(submissionId, {
          ...submissionStatus.get(submissionId),
          status: 'failed',
          error: error.message
        });
      }
    }, 100);
    
    // 立即返回响应
    res.json({
      success: true,
      message: '作业提交成功',
      data: {
        submissionId,
        status: 'pending',
        message: '你的作业已成功接收，正在提交到评分系统。',
        instructions: '请保存好提交ID以便查询评分结果。',
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('提交处理错误:', error);
    res.status(500).json({
      success: false,
      error: '提交处理失败',
      message: '系统暂时无法处理你的提交，请稍后重试。'
    });
  }
});

// 查询提交状态
app.get('/api/status/:submissionId', async (req, res) => {
  try {
    const { submissionId } = req.params;
    
    if (!submissionStatus.has(submissionId)) {
      return res.status(404).json({
        success: false,
        error: '提交记录不存在'
      });
    }
    
    const status = submissionStatus.get(submissionId);
    const response = {
      success: true,
      data: {
        submissionId,
        studentName: status.studentName,
        assignment: status.assignment,
        status: status.status,
        submittedAt: status.submittedAt
      }
    };
    
    // 如果已提交到GitHub，添加详细信息
    if (status.issueNumber) {
      response.data.issueNumber = status.issueNumber;
      response.data.issueUrl = status.issueUrl;
    }
    
    res.json(response);
    
  } catch (error) {
    console.error('查询状态错误:', error);
    res.status(500).json({
      success: false,
      error: '查询状态失败'
    });
  }
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({
    success: false,
    error: '系统暂时不可用',
    message: '请稍后重试。'
  });
});

// 404处理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: '接口不存在',
    message: '请求的接口不存在。',
    availableEndpoints: [
      'GET  /health             健康检查',
      'POST /api/submit         提交作业',
      'GET  /api/status/:id     查询提交状态',
      'GET  /public/*           静态文件'
    ]
  });
});

// 启动服务器
const server = app.listen(PORT, () => {
  console.log(`
  🚀 AI场景编程作业提交系统已启动（Render优化版）
  👩‍🏫 教师：Gloria928
  📍 地址：http://localhost:${PORT}
  🌐 健康检查：/health
  📤 提交作业：/api/submit
  🔍 查询状态：/api/status/:id
  
  ⚠️ 环境变量检查：
  - GITHUB_TOKEN: ${GITHUB_CONFIG.token ? '✅ 已设置' : '❌ 未设置'}
  - GITHUB_OWNER: ${GITHUB_CONFIG.owner}
  - GITHUB_REPO: ${GITHUB_CONFIG.repo}
  - PORT: ${PORT}
  - NODE_ENV: ${process.env.NODE_ENV || 'development'}
  
  🎯 下一步：
  1. 访问 /health 检查服务状态
  2. 访问 /public/submission-form.html 使用前端表单
  3. 测试作业提交功能
  `);
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('收到关闭信号，正在优雅关闭...');
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});

module.exports = app;