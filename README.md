# 财务补助核销系统

前后端完整实现，数据持久化存储在 SQLite 中。

## 技术栈

- 后端：Python 3 + Flask + SQLite
- 前端：HTML5 + CSS3 + JavaScript（H5 适配）

## 项目结构

```
financial-subsidy-system/
├── backend/
│   ├── app.py              # Flask 后端服务
│   ├── requirements.txt    # Python 依赖
│   └── venv/               # Python 虚拟环境
├── frontend/
│   ├── index.html          # H5 页面
│   ├── css/
│   │   └── style.css       # 样式
│   └── js/
│       └── app.js          # 前端逻辑
└── README.md
```

## 运行方式

### 1. 启动后端

```bash
cd backend
source venv/bin/activate
python app.py
```

服务默认运行在 `http://0.0.0.0:5000`。

### 2. 访问前端

浏览器打开：

```
http://127.0.0.1:5000
```

## 功能说明

- 列表页展示全部补助记录，支持按状态筛选、分页。
- PC/平板使用完整表格展示 13 列；H5 移动端使用卡片列表。
- 新增申请时自动计算出差天数、住宿天数、各类补助金额。
- 核销时填写实际补助金额，差额绝对值小于 5 自动核销成功，否则核销失败。
- 核销成功/失败记录可查看详情与操作日志。

## 后端接口

| 方法 | 接口 | 说明 |
|---|---|---|
| GET | /api/stats | 统计数量 |
| GET | /api/subsidies | 查询列表 |
| POST | /api/subsidies | 新增申请 |
| POST | /api/subsidies/{id}/write-off | 核销操作 |
| GET | /api/subsidies/{id} | 查询详情 |
