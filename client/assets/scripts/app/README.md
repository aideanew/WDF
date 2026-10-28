启动、依赖装配（GameApp）、场景路由、生命周期。`BootController.start()` 首行调用 `GameApp.start()` 注册生命周期钩子（W1-1，FIX-1：原"Boot 场景挂一个组件调用"的组件不存在，改为由 BootController 直调）。
