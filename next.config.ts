import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // next dev 默认只信任 localhost 发起的请求，局域网 IP 访问会被当成跨域请求
  // 拦掉 dev 专用的资源/接口，导致页面能打开但 JS 没法正常接管（表单提交表现
  // 得像是"没反应"，其实是退化成了原生表单的整页刷新）。这里把局域网访问用
  // 到的地址加进白名单。只影响 `next dev`，生产环境 `next start` 不受影响。
  allowedDevOrigins: ["192.168.68.56"],
};

export default nextConfig;
