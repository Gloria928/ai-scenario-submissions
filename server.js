/**
 * AI场景编程教材 - 作业提交代理服务器（最终修复版）
 * 专为 Gloria928 定制 - 修复所有问题
 */

const express = require('express');
const axios = require('axios');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

// 中间件配置
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// 静态文件服务 - 修复版本
const publicDir = path.join(__dirname, 'public');
if (fs.existsSync(publicDir)) {
  app.use('/public', express.static(publicDir, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
      }
    }
  }));
  console.log(`✅ 静态文件服务已启用: ${publicDir}`);
} else {
  console.log(`⚠️ public目录不存在: ${publicDir}`);
  // 创建public目录
  fs.mkdirSync(publicDir, { recursive: true });
  console.log(`✅ 已创建public目录`);
}

// 根路径直接提供测试页面
app.get('/', (req, res) => {
  const testPage = `
  <!DOCTYPE html>
  <html>
  <head>
    <title>AI场景编程作业提交系统</title>
    <style>
      body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
      .card { background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0; }
      .btn { display: inline-block; padding: 10px 20px; background: #4f46e5; color: white; text-decoration: none; border-radius: 5px; }
      .btn:hover { background: #4338ca; }
    </style>
  </head>
  <body>
    <h1>🎯 AI场景编程作业提交系统</h1>
    <div class="card">
      <h2>👩‍🏫 教师: Gloria928</h2>
      <p>学生规模: 60人 | 作业频率: 每周一次</p>
    </div>
    
    <div class="card">
      <h2>🚀 快速开始</h2>
      <p><a href="/test-submit.html" class="btn">📝 测试提交系统</a></p>
      <p><a href="/health" class="btn">🩺 系统健康检查</a></p>
    </div>
    
    <div class="card">
      <h2>📚 相关链接</h2>
      <ul>
        <li><a href="https://github.com/Gloria928/ai-scenario-submissions" target="_blank">🐙 GitHub作业仓库</a></li>
        <li><a href="https://gitee.com/Gloria1248275/ai-scenario-programming-textbook" target="_blank">📖 Gitee教材仓库</a></li>
        <li><a href="https://ai-scenario-submissions.onrender.com/health" target="_blank">🔧 系统状态</a></li>
      </ul>
    </div>
    
    <div class="card">
      <h2>📊 系统接口</h2>
      <ul>
        <li><code>GET /health</code> - 健康检查</li>
        <li><code>POST /api/submit</code> - 提交作业</li>
        <li><code>GET /api/status/:id</code> - 查询状态</li>
        <li><code>GET /api/stats</code> - 课堂统计</li>
      </ul>
    </div>
  </body>
  </html>`;
  res.send(testPage);
});

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

// GitHub配置
const GITHUB_CONFIG = {
  owner: process.env.GITHUB_OWNER || 'Gloria928',
  repo: process.env.GITHUB_REPO || 'ai-scenario-submissions',
  token: process.env.GITHUB_TOKEN
};

// 验证配置
if (!GITHUB_CONFIG.token) {
  console.error('❌ 错误：请设置GITHUB_TOKEN环境变量');
}

// 提交状态跟踪
const submissionStatus = new Map();

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'AI场景编程作业提交系统',
    teacher: 'Gloria928',
    students: 60,
    frequency: '每周一次',
    language: 'Python',
    github: `https://github.com/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}`,
    gitee: 'https://gitee.com/Gloria1248275/ai-scenario-programming-textbook',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    submissions: submissionStatus.size,
    environment: process.env.NODE_ENV || 'development',
    port: PORT,
    endpoints: {
      health: 'GET /health',
      submit: 'POST /api/submit',
      status: 'GET /api/status/:id',
      stats: 'GET /api/stats',
      test: 'GET /test-submit.html',
      root: 'GET /'
    }
  });
});

// 系统信息
app.get('/api/info', (req, res) => {
  res.json({
    success: true,
    data: {
      system: 'AI场景编程作业提交系统',
      version: '1.0.0',
      teacher: 'Gloria928',
      classSize: 60,
      assignments: [
        '作业1：Python基础',
        '作业2：数据处理',
        '作业3：函数与模块',
        '作业4：面向对象编程',
        '作业5：Web开发基础'
      ],
      supportedLanguages: ['Python', 'JavaScript', 'Java'],
      maxCodeLength: 5000,
      submissionLimit: '10次/15分钟',
      features: [
        '自动提交到GitHub',
        'GitHub Actions自动评分',
        '实时状态查询',
        '课堂统计分析',
        '防刷提交限制'
      ]
    }
  });
});

// 提交作业
app.post('/api/submit', submitLimiter, async (req, res) => {
  try {
    const { studentName, studentId, assignment, language = 'python', code, comments } = req.body;
    
    // 验证
    if (!studentName || !assignment || !code) {
      return res.status(400).json({
        success: false,
        error: '缺少必要信息',
        message: '请填写姓名、作业题目和代码。'
      });
    }
    
    if (code.length > 5000) {
      return res.status(400).json({
        success: false,
        error: '代码过长',
        message: '代码长度不能超过5000字符。'
      });
    }
    
    // 生成提交ID
    const submissionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    // 设置初始状态
    submissionStatus.set(submissionId, {
      status: 'pending',
      studentName,
      studentId: studentId || '未提供',
      assignment,
      language,
      submittedAt: new Date().toISOString(),
      codeLength: code.length,
      comments: comments || ''
    });
    
    console.log(`📤 收到作业提交：${submissionId} - ${studentName} - ${assignment}`);
    
    // 异步处理GitHub提交
    setTimeout(async () => {
      try {
        // 创建GitHub Issue
        const issueTitle = `[作业] ${assignment} - ${studentName}${studentId ? ` (${studentId})` : ''}`;
        const issueBody = `## 学生信息
- **姓名**：${studentName}
- **学号**：${studentId || '未提供'}
- **作业题目**：${assignment}
- **编程语言**：${language}
- **提交ID**：${submissionId}
- **代码长度**：${code.length} 字符
${comments ? `- **备注**：${comments}\n` : ''}

## 提交代码
\`\`\`${language}
${code}
\`\`\`

## 系统信息
- **提交时间**：${new Date().toLocaleString('zh-CN')}
- **状态**：待评分
- **预计评分时间**：1-3分钟

---
*由AI场景编程教材作业系统自动创建*`;
        
        const issueData = {
          title: issueTitle,
          body: issueBody,
          labels: ['assignment-submission', 'lang-python', 'pending-grading']
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
          issueUrl: response.data.html_url,
          githubSubmittedAt: new Date().toISOString()
        });
        
        console.log(`✅ 作业提交成功：${submissionId} -> Issue #${response.data.number}`);
        
      } catch (error) {
        console.error(`❌ GitHub提交失败：${submissionId}`, error.message);
        submissionStatus.set(submissionId, {
          ...submissionStatus.get(submissionId),
          status: 'failed',
          error: error.message,
          failedAt: new Date().toISOString()
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
        instructions: [
          '1. 系统正在处理你的提交',
          '2. 通常需要1-3分钟完成评分',
          '3. 评分完成后会显示详细报告',
          '4. 你可以使用提交ID随时查询状态'
        ],
        nextSteps: {
          checkStatus: `/api/status/${submissionId}`,
          waitTime: '1-3分钟',
          saveId: `请保存此ID：${submissionId}`
        },
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
        error: '提交记录不存在',
        message: '请检查提交ID是否正确。'
      });
    }
    
    const status = submissionStatus.get(submissionId);
    const elapsedMinutes = Math.floor((Date.now() - new Date(status.submittedAt).getTime()) / 60000);
    
    const response = {
      success: true,
      data: {
        submissionId,
        studentName: status.studentName,
        studentId: status.studentId,
        assignment: status.assignment,
        language: status.language,
        status: status.status,
        submittedAt: status.submittedAt,
        elapsedMinutes,
        codeLength: status.codeLength,
        comments: status.comments
      }
    };
    
    // 如果已提交到GitHub，添加详细信息
    if (status.issueNumber) {
      response.data.issueNumber = status.issueNumber;
      response.data.issueUrl = status.issueUrl;
      response.data.githubSubmittedAt = status.githubSubmittedAt;
    }
    
    // 如果失败，添加错误信息
    if (status.error) {
      response.data.error = status.error;
      response.data.failedAt = status.failedAt;
    }
    
    res.json(response);
    
  } catch (error) {
    console.error('查询状态错误:', error);
    res.status(500).json({
      success: false,
      error: '查询状态失败',
      message: '系统暂时无法查询状态，请稍后重试。'
    });
  }
});

// 课堂统计
app.get('/api/stats', (req, res) => {
  const submissions = Array.from(submissionStatus.values());
  const uniqueStudents = new Set(submissions.map(s => s.studentName)).size;
  
  const stats = {
    totalSubmissions: submissions.length,
    uniqueStudents,
    pending: submissions.filter(s => s.status === 'pending').length,
    submitted: submissions.filter(s => s.status === 'submitted').length,
    failed: submissions.filter(s => s.status === 'failed').length,
    byAssignment: {},
    byLanguage: {},
    recentSubmissions: submissions
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
      .slice(0, 10)
      .map(s => ({
        studentName: s.studentName,
        assignment: s.assignment,
        status: s.status,
        submittedAt: s.submittedAt
      }))
  };
  
  // 按作业统计
  submissions.forEach(submission => {
    stats.byAssignment[submission.assignment] = (stats.byAssignment[submission.assignment] || 0) + 1;
    stats.byLanguage[submission.language] = (stats.byLanguage[submission.language] || 0) + 1;
  });
  
  res.json({
    success: true,
    data: {
      ...stats,
      teacher: 'Gloria928',
      classSize: 60,
      activeRate: `${((uniqueStudents / 60) * 100).toFixed(1)}%`,
      averageSubmissions: submissions.length > 0 ? (submissions.length / uniqueStudents).toFixed(1) : 0,
      systemUptime: process.uptime()
    }
  });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({
    success: false,
    error: '系统暂时不可用',
    message: '请稍后重试。',
    timestamp: new Date().toISOString()
  });
});

// 404处理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: '接口不存在',
    message: '请求的接口不存在，请检查URL是否正确。',
    availableEndpoints: [
      'GET  /                  系统首页',
      'GET  /health            健康检查',
      'GET  /api/info          系统信息',
      'POST /api/submit        提交作业',
      'GET  /api/status/:id    查询提交状态',
      'GET  /api/stats         课堂统计',
      'GET  /test-submit.html  测试页面',
      'GET  /public/*          前端表单（如果存在）'
    ],
    helpfulLinks: {
      testPage: '/test-submit.html',
      healthCheck: '/health',
      githubRepo: 'https://github.com/Gloria928/ai-scenario-submissions',
      giteeTextbook: 'https://gitee.com/Gloria1248275/ai-scenario-programming-textbook'
    }
  });
});

// 启动服务器
const server = app.listen(PORT, () => {
  console.log(`
  🚀 AI场景编程作业提交系统已启动（最终版）
  👩‍🏫 教师：Gloria928
  📍 地址：http://localhost:${PORT}
  🌐 外部地址：https://ai-scenario-submissions.onrender.com
  
  📊 系统状态：
  - 健康检查：✅ 可用
  - 作业提交：✅ 可用
  - 状态查询：✅ 可用
  - 课堂统计：✅ 可用
  - GitHub集成：✅ ${GITHUB_CONFIG.token ? '已配置' : '未配置'}
  
  🎯 测试页面：
  https://ai-scenario-submissions.onrender.com/test-submit.html
  
  📚 相关链接：
  - GitHub仓库：https://github.com/Gloria928/ai-scenario-submissions
  - Gitee教材：https://gitee.com/Gloria1248275/ai-scenario-programming-textbook
  
  🎉 系统已准备就绪，可以开始使用！
  `);
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('收到关闭信号，正在优雅关闭...');
  server.close(() => {
