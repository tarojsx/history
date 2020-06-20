<div align="center">
    <h1>
        <br/>
        <br/>
        ⏮️
        <br />
        Taro3 History API
        <br />
        <br />
        <br />
        <br />
    </h1>
    <strong>Taro3 <a href="https://github.com/ReactTraining/history">history</a> 风格路由接口.</strong>
    <br />
    <br />
    <sub>
    当前代码提交频繁, 一些特性时有变化.
    </sub>
    <br />
    <br />
    <a href="https://github.com/tarojsx/history/blob/master/LICENSE">
        <img src="https://badgen.net/github/license/tarojsx/history" alt="License" />
    </a>
    <a href="https://www.npmjs.com/package/@tarojsx/history">
        <img src="https://badgen.net/npm/v/@tarojsx/history" alt="npm version" />
    </a>
    <a href="https://www.npmjs.com/org/tarojsx">
        <img src="https://badgen.net/npm/dt/@tarojsx/history" alt="npm downloads" />
    </a>
    <a href="https://github.com/tarojsx/history/blob/master/package.json">
        <img src="https://badgen.net/github/dependents-pkg/tarojsx/history" alt="dependents" />
    </a>
    <a href="http://makeapullrequest.com">
        <img src="https://badgen.net/badge/PRs/welcome/green" alt="PRs welcome" />
    </a>
    <br />
    <sup>
        Built with :purple_heart: by
        <a href="https://github.com/cncolder">@Colder</a> and
        <a href="https://github.com/tarojsx/history/graphs/contributors">
            Contributors
        </a>
        <br />
        :star2: :eyes: :zap: :boom:
    </sup>
    <br />
    <br />
    <br />
    <br />
    <pre>npm i <a href="https://www.npmjs.com/@tarojsx/history">@tarojsx/history</a></pre>
    <br />
    <br />
    <br />
    <br />
    <br />
</div>

## 介绍

一个建立在 Taro3 之上的轻量级路由包装 API, 语法上类似人们熟知的 `react-router` 中的 [history](https://github.com/ReactTraining/history) 模块.

简化页面跳转, 不必思考什么时候该用 `navigateTo` 什么时候该用 `switchTab`, 自动序列化 `query` 参数.

提供监听路由变化的能力, 即使是点击页面上的"返回"按钮或使用 `<navigator />` 组件.

## 需求

taro 3.0.0-rc.1 +

## 用法

```js
import history from '@tarojsx/history'

// 监听路由
const unlisten = history.listen((location, action) => {
    // location 是 Taro 路由参数对象.
    console.log('路由变化:', action, location.path, location.params);
});

/**********
 以下操作在不使用 history 时同样会触发路由变化事件.
 例如:
    Taro.navigateTo
    wx.navigateTo
    <navigator>
    页面返回按钮
 **********/

// 初始页面为 /pages/index

history.push('/pages/list')
// 路由变化: navigateTo '/pages/list'

history.push('/pages/item', { id: 1 })
// 路由变化: navigateTo '/pages/item' { id: 1 }

console.log(`页面栈长度 ${history.length}, 当前页面 ${history.location.path}, 最后动作 ${history.action}.`)
// 页面栈长度 3, 当前页面 /pages/item, 最后动作 navigateTo.

history.goBack()
// 路由变化: navigateBack '/pages/list'

history.replace('/pages/about')
// 路由变化: redirectTo '/pages/about'

history.push('/pages/tabpage')
// 路由变化: switchTab '/pages/tabpage'

// 停止监听
unlisten()
```

## 原理

小程序中唯一能够获取到路由信息变化的途径是监听页面的 `onLoad` 和 `onShow` 生命周期, 作为第三方库这是不现实的, Taro 在这两个生命周期中统一设置 `Current.router`, 在这个字段上定义 setter 成为最简便的监听方式.

每当 setter 被调用时, 代表页面发生跳转, 通过比对 `getCurrentPages()` 前后变化, 推导出刚刚发生的动作.

| 变化前      | 变化后      | 动作         |
| ----------- | ----------- | ------------ |
| page1       | page1,page2 | navigateTo   |
| page1,page2 | page1,page3 | redirectTo   |
| page1,page2 | page1       | navigateBack |
| tab1,page1  | tab2        | switchTab    |

特殊情况:
1. 从 tab1,page1 到 tab1, 假定为 navigateBack.
2. reLaunch 暂时无法判断.
3. 循环页面可能发生意想不到的效果, page1,page2,page1

## TODO

- [x] [taro rc1 #6412](https://github.com/NervJS/taro/pull/6412)
- [ ] `goForward()`
- [x] `action: 'appLaunch'`
- [ ] `action: 'reLaunch'`

## 支持

欢迎各种形式的支持. 至少可以给颗星 :star:

## License

[MIT](LICENSE)
