# Nuts 打印/扫码代理

在需要连接热敏小票打印机、扫码枪的电脑上运行的本地常驻服务。浏览器（哪怕是
HTTPS 页面）出于安全限制拿不到 USB 打印机的直接控制权，所以由这个本地服务
代为完成"枚举打印机 -> 记住选择 -> 收到打印请求后通过 Windows 打印后台发送
原始 ESC/POS 指令"这几件事，网页只需要请求 `http://127.0.0.1:9527` 即可。

扫码枪不需要这个代理：绝大多数 USB 扫码枪是"键盘模拟"设备，插上后当键盘用，
网页里做了全局按键监听自动识别扫码输入，不需要额外安装任何东西。

## 前置条件

- 这台电脑装了 Node.js（建议 18 及以上），能在命令行里跑 `node -v`
- 热敏打印机已经按平常的方式装好 Windows 驱动、可以在"设备和打印机"里看到

## 安装步骤

```powershell
cd print-agent
npm install
```

先手动跑一次确认没问题：

```powershell
npm start
```

看到 `Nuts 打印/扫码代理已启动：http://127.0.0.1:9527` 就说明成功了，浏览器
打开 http://127.0.0.1:9527/health 应该能看到 `{"ok":true,...}`。

Ctrl+C 停掉，然后注册开机自启动（以后开机/登录会自动在后台运行，不用每次手动开）：

```powershell
powershell -ExecutionPolicy Bypass -File install-startup.ps1
```

如果想取消开机自启动：

```powershell
powershell -ExecutionPolicy Bypass -File uninstall-startup.ps1
```

## 接口说明

- `GET /health` — 存活检查，返回当前选定的打印机
- `GET /printers` — 返回这台电脑上安装的打印机列表
- `POST /printer/select` — body `{ "name": "打印机名称" }`，记住这次选择
- `POST /print` — body：
  ```json
  {
    "lines": [
      { "text": "Nuts小吃店", "align": "center", "bold": true, "size": "double" },
      { "text": "薯条 x1          ¥3000积分" },
      { "text": "--------------------------------" }
    ],
    "feed": 3,
    "cut": true
  }
  ```
  `align` 支持 `left`/`center`/`right`，`size` 支持 `normal`/`double`。

后台管理页面的"设备管理"里选好打印机之后，其它任何页面都可以直接调用
`src/lib/printAgent.ts` 里的 `printReceipt()` 随时打印，不需要重新选择。

## 端口冲突

默认端口 9527，写在 `config.json` 里（首次启动自动生成），改了之后要在后台
管理系统的设备管理页面里同步改成一样的端口。

## 常见问题

- **打印出来是乱码**：多半是打印机驱动没装对，或者不是标准 ESC/POS 指令集
  的打印机；也可能是打印机内置字库不是 GBK（比较少见，多数国产热敏纸打印
  机默认都是 GBK）。
- **网页提示"无法连接本地打印服务"**：确认这台电脑上代理有没有在跑（看
  `npm start` 有没有报错，或者浏览器直接访问
  http://127.0.0.1:9527/health 看有没有反应）。
