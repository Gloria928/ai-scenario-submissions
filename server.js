/**
 * AI场景编程教材 - 作业提交代理服务器
 * 专为 Gloria928 定制
 * 学生规模：60人，每周一次Python作业
 */

const express = require('express');
const axios = require('axios');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件配置
app.use(cors({
  origin: [
    'https://gitee.com',
    'https://*.gitee.com',
    'http://localhost:8080',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// 课堂规模优化：60人，每周一次作业
const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 10, // 每个IP最多10次提交（足够课堂使用）
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
  owner: 'Gloria928',
  repo: 'ai-scenario-submissions',
  token: process.env.GITHUB_TOKEN
};

// 验证配置
if (!GITHUB_CONFIG.token) {
  console.error('❌ 错误：请设置GITHUB_TOKEN环境变量');
  console.log('💡 创建Token步骤：');
  console.log('1. 访问 https://github.com/settings/tokens');
  console.log('2. 点击 "Generate new token (classic)"');
  console.log('3. 权限选择：repo, workflow, issues');
  console.log('4. 复制Token并设置为环境变量');
  process.exit(1);
}

// 简单内存缓存（适合60人规模）
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

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
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    submissions: submissionStatus.size
  });
});

// 获取系统信息
app.get('/api/info', (req, res) => {
  res.json({
    success: true,
    data: {
      system: 'AI场景编程作业提交系统',
      version: '1.0.0',
      teacher: 'Gloria928',
      config: {
        maxStudents: 60,
        frequency: '每周一次',
        mainLanguage: 'Python',
        supportedLanguages: ['python', 'javascript', 'java', '其他'],
        rateLimit: '10次/15分钟'
      },
      endpoints: {
        submit: 'POST /api/submit',
        status: 'GET /api/status/:id',
        stats: 'GET /api/stats',
        health: 'GET /health',
        info: 'GET /api/info'
      }
    }
  });
});

// 提交作业
app.post('/api/submit', submitLimiter, async (req, res) => {
  try {
    const { studentName, studentId, assignment, language = 'python', code, comments } = req.body;
    
    // 输入验证
    const errors = [];
    if (!studentName) errors.push('姓名不能为空');
    if (!assignment) errors.push('作业题目不能为空');
    if (!code) errors.push('代码不能为空');
    
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: '输入验证失败',
        details: errors
      });
    }
    
    // 代码长度验证（适合教学场景）
    if (code.length > 5000) {
      return res.status(400).json({
        success: false,
        error: '代码过长',
        message: '为了教学效果，请将代码控制在5000字符以内。',
        maxLength: 5000,
        currentLength: code.length
      });
    }
    
    if (code.length < 10) {
      return res.status(400).json({
        success: false,
        error: '代码过短',
        message: '请提交完整的代码。',
        minLength: 10,
        currentLength: code.length
      });
    }
    
    // 生成提交ID
    const submissionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const submittedAt = new Date().toISOString();
    
    // 设置初始状态
    submissionStatus.set(submissionId, {
      status: 'pending',
      studentName,
      studentId,
      assignment,
      language: language.toLowerCase(),
      submittedAt,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    console.log(`📤 收到作业提交：${submissionId} - ${studentName} - ${assignment}`);
    
    // 异步处理GitHub提交
    setTimeout(async () => {
      try {
        submissionStatus.set(submissionId, { 
          ...submissionStatus.get(submissionId), 
          status: 'processing',
          processingAt: new Date().toISOString()
        });
        
        // 创建GitHub Issue
        const issueTitle = `[作业] ${assignment} - ${studentName}${studentId ? ` (${studentId})` : ''}`;
        
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

## 备注说明
${comments || '无'}

## 系统信息
- **提交时间**：${new Date(submittedAt).toLocaleString('zh-CN')}
- **状态**：待评分
- **处理队列**：Python自动评分系统

---
*由AI场景编程教材作业系统自动创建*`;
        
        const issueData = {
          title: issueTitle,
          body: issueBody,
          labels: [
            'assignment-submission',
            `lang-${language.toLowerCase()}`,
            'pending-grading',
            `assignment-${assignment.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
            language.toLowerCase() === 'python' ? 'python-grading' : 'basic-grading'
          ]
        };
        
        const response = await axios.post(
          `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/issues`,
          issueData,
          {
            headers: {
              'Authorization': `token ${GITHUB_CONFIG.token}`,
              'Accept': 'application/vnd.github.v3+json',
              'User-Agent': 'Gloria928-AI-Textbook-System'
            },
            timeout: 30000
          }
        );
        
        submissionStatus.set(submissionId, {
          ...submissionStatus.get(submissionId),
          status: 'submitted',
          issueNumber: response.data.number,
          issueUrl: response.data.html_url,
          githubId: response.data.id,
          submittedToGithubAt: new Date().toISOString()
        });
        
        console.log(`✅ 作业提交成功：${submissionId} -> Issue #${response.data.number}`);
        
      } catch (error) {
        console.error(`❌ GitHub提交失败：${submissionId}`, error.response?.data || error.message);
        submissionStatus.set(submissionId, {
          ...submissionStatus.get(submissionId),
          status: 'failed',
          error: error.response?.data?.message || error.message,
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
          '3. 请保存好提交ID以便查询',
          '4. 评分完成后会显示详细报告'
        ],
        nextSteps: {
          checkStatus: `/api/status/${submissionId}`,
          waitTime: '1-3分钟',
          saveId: '请保存此ID：' + submissionId
        },
        timestamp: submittedAt
      }
    });
    
  } catch (error) {
    console.error('提交处理错误:', error);
    
    res.status(500).json({
      success: false,
      error: '提交处理失败',
      message: '系统暂时无法处理你的提交，请稍后重试。如果问题持续，请联系教师。',
      support: '请联系Gloria928老师获取帮助'
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
        message: '未找到该提交记录，请检查提交ID是否正确。',
        tips: [
          '1. 检查提交ID是否正确',
          '2. 提交记录保留24小时',
          '3. 如需帮助请联系教师'
        ]
      });
    }
    
    const status = submissionStatus.get(submissionId);
    const now = new Date();
    const submittedTime = new Date(status.submittedAt);
    const elapsedMinutes = Math.floor((now - submittedTime) / (1000 * 60));
    
    // 基础状态信息
    const response = {
      success: true,
      data: {
        submissionId,
        studentName: status.studentName,
        assignment: status.assignment,
        language: status.language,
        status: status.status,
        submittedAt: status.submittedAt,
        elapsedMinutes,
        timestamps: {
          submitted: status.submittedAt,
          processing: status.processingAt,
          submittedToGithub: status.submittedToGithubAt,
          graded: status.gradedAt,
          failed: status.failedAt
        }
      }
    };
    
    // 如果已提交到GitHub，获取详细信息
    if (status.issueNumber) {
      const cacheKey = `issue_${status.issueNumber}`;
      const cached = cache.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        response.data.githubIssue = cached.data;
      } else {
        try {
          const [issueResponse, commentsResponse] = await Promise.all([
            axios.get(
              `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/issues/${status.issueNumber}`,
              {
                headers: {
                  'Authorization': `token ${GITHUB_CONFIG.token}`,
                  'Accept': 'application/vnd.github.v3+json'
                },
                timeout: 10000
              }
            ),
            axios.get(
              `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/issues/${status.issueNumber}/comments`,
              {
                headers: {
                  'Authorization': `token ${GITHUB_CONFIG.token}`,
                  'Accept': 'application/vnd.github.v3+json'
                },
                timeout: 10000
              }
            )
          ]);
          
          const issueData = {
            number: issueResponse.data.number,
            title: issueResponse.data.title,
            state: issueResponse.data.state,
            createdAt: issueResponse.data.created_at,
            updatedAt: issueResponse.data.updated_at,
            labels: issueResponse.data.labels.map(label => label.name),
            url: issueResponse.data.html_url,
            comments: commentsResponse.data.map(comment => ({
              id: comment.id,
              user: comment.user.login,
              body: comment.body,
              createdAt: comment.created_at,
              isGrading: comment.body.includes('📊') || comment.body.includes('评分')
            }))
          };
          
          cache.set(cacheKey, {
            data: issueData,
            timestamp: Date.now()
          });
          
          response.data.githubIssue = issueData;
          
          // 检查评分结果
          const gradingComment = commentsResponse.data.find(comment => 
            comment.body.includes('📊') || 
            comment.body.includes('Python作业评分报告') ||
            comment.body.includes('总分：')
          );
          
          if (gradingComment) {
            status.status = 'graded';
            status.gradedAt = gradingComment.created_at;
            status.gradingComment = gradingComment.body;
            
            // 提取分数
            const scoreMatch = gradingComment.body.match(/总分[：:]?\s*([0-9.]+)\/100/);
            if (scoreMatch) {
              status.score = parseFloat(scoreMatch[1]);
              response.data.score = status.score;
              
              // 给出评级
              if (status.score >= 90) response.data.grade = '优秀 🏆';
              else if (status.score >= 80) response.data.grade = '良好 👍';
              else if (status.score >= 70) response.data.grade = '中等 ✅';
              else if (status.score >= 60) response.data.grade = '及格 📊';
              else response.data.grade = '待改进 📝';
            }
            
            response.data.status = 'graded';
          }
          
        } catch (error) {
          console.warn(`获取GitHub Issue详情失败：${status.issueNumber}`, error.message);
          response.data.githubError = '无法获取GitHub详情，但提交已成功';
        }
      }
    }
    
    // 状态消息
    const statusMessages = {
      pending: '作业已接收，等待处理',
      processing: '正在提交到评分系统',
      submitted: '已提交到GitHub，等待评分',
      graded: '评分完成',
      failed: '提交失败'
    };
    
    response.data.statusMessage = statusMessages[status.status] || '未知状态';
    
    // 预计时间
    if (status.status === 'submitted' && elapsedMinutes < 5) {
      response.data.estimatedTime = `预计${5 - elapsedMinutes}分钟内完成评分`;
    }
    
    // 清理24小时前的数据（每周一次作业，保留一天足够）
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
    for (const [id, data] of submissionStatus.entries()) {
      if (new Date(data.submittedAt).getTime() < twentyFourHoursAgo) {
        submissionStatus.delete(id);
      }
    }
    
    res.json(response);
    
  } catch (error) {
    console.error('查询状态错误:', error);
    
    res.status(500).json({
      success: false,
      error: '查询状态失败',
      message: '无法获取提交状态，请稍后重试。'
    });
  }
});

// 获取课堂统计
app.get('/api/stats', async (req, res) => {
  try {
    const cacheKey = 'classroom_stats';
    const cached = cache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      return res.json({
        success: true,
        data: cached.data,
        cached: true,
        cachedAt: new Date(cached.timestamp).toISOString()
      });
    }
    
    // 本地统计
    const submissions = Array.from(submissionStatus.values());
    const localStats = {
      totalSubmissions: submissions.length,
      byStatus: {
        pending: submissions.filter(s => s.status === 'pending').length,
        processing: submissions.filter(s => s.status === 'processing').length,
        submitted: submissions.filter(s => s.status === 'submitted').length,
        graded: submissions.filter(s => s.status === 'graded').length,
        failed: submissions.filter(s => s.status === 'failed').length
      },
      byLanguage: {},
      byAssignment: {},
      recentSubmissions: submissions
        .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
        .slice(0, 10)
        .map(s => ({
          studentName: s.studentName,
          assignment: s.assignment,
          language: s.language,
          status: s.status,
          submittedAt: s.submittedAt,
          score: s.score
        }))
    };
    
    // 按语言和作业统计
    submissions.forEach(sub => {
      localStats.byLanguage[sub.language] = (localStats.byLanguage[sub.language] || 0) + 1;
      localStats.byAssignment[sub.assignment] = (localStats.byAssignment[sub.assignment] || 0) + 1;
    });
    
    // GitHub统计
    let githubStats = {};
    try {
      const response = await axios.get(
        `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/issues`,
        {
          params: {
            state: 'all',
            labels: 'assignment-submission',
            per_page: 100,
            sort: 'created',
            direction: 'desc'
          },
          headers: {
            'Authorization': `token ${GITHUB_CONFIG.token}`,
            'Accept': 'application/vnd.github.v3+json'
          },
          timeout: 15000
        }
      );
      
      const issues = response.data;
      
      githubStats = {
        totalIssues: issues.length,
        openIssues: issues.filter(issue => issue.state === 'open').length,
        closedIssues: issues.filter(issue => issue.state === 'closed').length,
        byLabel: {},
        recentIssues: issues.slice(0, 5).map(issue => ({
          number: issue.number,
          title: issue.title,
          state: issue.state,
          createdAt: issue.created_at,
          labels: issue.labels.map(label => label.name)
        }))
      };
      
      // 按标签统计
      issues.forEach(issue => {
        issue.labels.forEach(label => {
          githubStats.byLabel[label.name] = (githubStats.byLabel[label.name] || 0) + 1;
        });
      });
      
    } catch (error) {
      console.warn('获取GitHub统计失败:', error.message);
      githubStats.error = 'GitHub数据暂时不可用';
    }
    
    const stats = {
      classroom: {
        configuredStudents: 60,
        submissionFrequency: '每周一次',
        mainLanguage: 'Python',
        currentWeek: {
          submissions: localStats.totalSubmissions,
          graded: localStats.byStatus.graded,
          pending: localStats.byStatus.pending + localStats.byStatus.processing + localStats.byStatus.submitted
        }
      },
      submissions: localStats,
      github: githubStats,
      system: {
        uptime: process.uptime(),
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB'
        },
        cacheSize: cache.size,
        activeSubmissions: submissionStatus.size,
        timestamp: new Date().toISOString()
      }
    };
    
    cache.set(cacheKey, {
      data: stats,
      timestamp: Date.now()
    });
    
    res.json({
      success: true,
      data: stats,
      cached: false,
      generatedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('获取统计错误:', error);
    
    res.status(500).json({
      success: false,
      error: '获取统计失败',
      message: '无法获取课堂统计信息。'
    });
  }
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  
  // 课堂友好的错误信息
  const errorResponse = {
    success: false,
    error: '系统暂时不可用',
    message: '作业提交系统遇到问题，请稍后重试。',
    support: '如需紧急帮助，请联系Gloria928老师。'
  };
  
  // 开发环境显示详细错误
  if (process.env.NODE_ENV === 'development') {
    errorResponse.details = err.message;
    errorResponse.stack = err.stack;
  }
  
  res.status(500).json(errorResponse);
});

// 404处理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: '接口不存在',
    message: '请求的接口不存在，请检查URL是否正确。',
    availableEndpoints: [
      'GET  /health             健康检查',
      'GET  /api/info           系统信息',
      'POST /api/submit         提交作业',
      'GET  /api/status/:id     查询提交状态',
      'GET  /api/stats          课堂统计'
    ],
    example: {
      submit: 'POST /api/submit {studentName: "张三", assignment: "作业1", code: "print(\'Hello\')"}',
      check: 'GET /api/status/sub_1234567890_abc123'
    }
  });
});

// 启动服务器
const server = app.listen(PORT, () => {
  const address = server.address();
  const host = address.address === '::' ? 'localhost' : address.address;
  
  console.log(`
  🚀 AI场景编程作业提交系统已启动
  👩‍🏫 教师：Gloria928
  👨‍🎓 学生规模：60人
  📅 提交频率：每周一次
  🐍 主要语言：Python
  
  📍 服务信息：
  - 本地地址：http://${host}:${PORT}
  - 健康检查：http://${host}:${PORT}/health
  - GitHub仓库：${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}
  
  📋 系统配置：
  - 最大代码长度：5000字符
  - 提交频率限制：10次/15分钟
  - 数据保留时间：24小时
  - 缓存时间：5分钟
  
  🔧 环境变量要求：
  - GITHUB_TOKEN      GitHub Personal Access Token
  - PORT              服务端口（默认：3000）
  - FRONTEND_URL      前端地址（CORS配置）
  
  📞 学生帮助：
  - 提交作业：POST /api/submit
  - 查询状态：GET /api/status/:id
  - 常见问题：代码长度限制、提交频率限制
  
  👩‍🏫 教师管理：
  - 系统状态：GET /health
  - 课堂统计：GET /api/stats
  - GitHub管理：https://github.com/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/issues
  
  ⚠️ 重要提醒：
  1. 确保GITHUB_TOKEN已正确设置
  2. 测试完整提交流程
  3. 将前端表单集成到Gitee页面
  4. 告知学生提交ID的重要性
  
  🎯 下一步：
  1. 部署到Vercel或服务器
  2. 配置GitHub Actions工作流
  3. 集成到Gitee教材页面
  4. 测试并开始使用！
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

process.on('SIGINT', () => {
  console.log('收到中断信号，正在关闭...');
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});

module.exports = app;