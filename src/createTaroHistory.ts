import Taro from '@tarojs/taro'
import queryString from 'query-string'

interface TaroHistoryOptions {
    /** app.config.js 内容, taro 3.0.0-rc.1 及以上可省略. */
    appConfig?: Taro.AppConfig
}

export interface TaroHistoryRouterInfo {
    path: string
    params: Record<string, string>
    query?: Record<string, string>
    referrerInfo?: Record<string, string>
    scene?: number
    shareTicket?: string
    prerender?: boolean
    onReady: string
    onHide: string,
    onShow: string
}

export type TaroHistoryAction = 'appLaunch' | 'navigateTo' | 'redirectTo' | 'navigateBack' | 'switchTab'

type TaroHistoryNavigateOptions = { url: string; action: 'push' | 'replace'; params?: Record<string, any> }

type TaroHistoryChangeHandler = (router: TaroHistoryRouterInfo, action: TaroHistoryAction) => any

const taroCurrentRouterChangeHandlers: ((router: TaroHistoryRouterInfo) => any)[] = []
/**
 * Taro hack
 *
 * 小程序中唯一能够获取到路由信息变化的途径是监听每个页面的 `onLoad` 和 `onShow` 生命周期, 作为第三方库这是不现实的, Taro 在这两个生命周期中统一设置 `Current.router`, 在这个字段上定义 setter 成为最简便的监听方式.
 */
const patchTaroCurrentRouter = () => {
    let taroCurrentRouterValue = Taro.Current.router
    // TODO 更可靠的方式判断是否已经打过补丁.
    if (!Object.getOwnPropertyDescriptor(Taro.Current, 'router').set) {
        Object.defineProperty(Taro.Current, 'router', {
            configurable: true,
            enumerable: true,
            get() {
                return taroCurrentRouterValue
            },
            // 每个页面 onLoad 和 onShow 事件都会设置这个值, onLoad 比 onShow 更详细.
            set(value: TaroHistoryRouterInfo) {
                taroCurrentRouterValue = value
                taroCurrentRouterChangeHandlers.forEach((fn) => fn(value))
            },
        })
    }
}

export class TaroHistory {
    constructor(private options = {} as TaroHistoryOptions) {
        patchTaroCurrentRouter()
        taroCurrentRouterChangeHandlers.push(this.handleRouterChange)
    }

    /** 当前页面路由信息 */
    location: TaroHistoryRouterInfo

    /** 路由至此的动作 */
    action: TaroHistoryAction

    /** 页面栈长度 */
    get length() {
        return Taro.getCurrentPages().length
    }

    /** 导航到页面. 类似 `navigateTo`, 自动判断 `switchTab` */
    async push<T extends object>(url: string, params?: T) {
        return await this.navigate({ url, action: 'push', params })
    }

    async replace<T extends object>(url: string, params?: T) {
        return await this.navigate({ url, action: 'replace', params })
    }

    /**
     * 在页面栈中跳转.
     *
     * 注意:
     * 1. 暂时只支持负值
     * 2. 为 0 时不会刷新当前页面
     */
    async go(delta?: number) {
        if (!delta) return
        if (delta < 0) {
            return await Taro.navigateBack({ delta })
        } else {
            throw new Error('Forward 尚未实现')
        }
    }

    /** 返回上一级页面. 等同于 `navigateBack()` */
    async goBack() {
        return await Taro.navigateBack()
    }

    /** 前进到下一个页面. **注意: 尚未实现** */
    async goForward() {
        throw new Error('Forward 尚未实现')
    }

    /** 是否可以在页面栈中跳转 */
    canGo(delta: number) {
        if (delta > 0) return false

        return Math.abs(delta) < this.latestPages.length
    }

    /**
     * 监听路由变化
     *
     * @example
     * ```
     *  const unlisten = history.listen((location, action) => {
     *      // location 是 Taro 路由参数对象.
     *      console.log(action, location.path, location.params);
     *  });
     *
     *  // 停止监听
     *  unlisten()
     * ```
     */
    listen(handler: TaroHistoryChangeHandler) {
        this.handlers.push(handler)

        return () => {
            this.handlers = this.handlers.filter((item) => item !== handler)
        }
    }

    private handlers: TaroHistoryChangeHandler[] = []
    private safeCallHandlers(router: TaroHistoryRouterInfo, action: TaroHistoryAction) {
        for (const fn of this.handlers) {
            try {
                fn(router, action)
            } catch (err) {}
        }
    }

    private ready = !!Taro.getCurrentPages().length

    private _taroAppConfig: Taro.AppConfig
    private get taroAppConfig() {
        return (
            this._taroAppConfig ||
            (this._taroAppConfig = this.options.appConfig || ((window as any).__taroAppConfig as Taro.AppConfig))
        )
    }
    private get tabBarList() {
        return this.taroAppConfig?.tabBar?.list || []
    }
    private get tabBarPagePaths() {
        return this.tabBarList.map((item) => `/${item.pagePath}`)
    }
    private isTabPagePath(pagePath: string) {
        return this.tabBarList.some((item) => item.pagePath === pagePath)
    }

    private pendingNavigateOptions: TaroHistoryNavigateOptions
    private async navigate(options: TaroHistoryNavigateOptions) {
        // 页面栈没初始化前, 路由跳转不生效, 记录在 pending 变量里, 等待第一个页面 onLoad 时运行.
        if (!this.ready) {
            this.pendingNavigateOptions = options
            return
        }

        let url = options.url
        const { action, params } = options

        if (!url.startsWith('/')) {
            url = `/${url}`
        }

        const currentPagePath = '/' + Taro.getCurrentPages()[0].route

        if (currentPagePath.startsWith(url)) return

        if (params) {
            url += (!url.includes('?') ? '?' : '&') + queryString.stringify(params, { encode: false })
        }

        // log(`${action} ${currentPagePath} -> ${url}`)

        if (this.tabBarPagePaths.some((path) => url.startsWith(path))) {
            return await Taro.switchTab({ url })
        }

        if (action === 'replace') {
            return await Taro.redirectTo({ url })
        }

        return await Taro.navigateTo({ url })
    }

    private latestPages = Taro.getCurrentPages()
    private handleRouterChange = (location: TaroHistoryRouterInfo) => {
        const latestPages = this.latestPages
        const currentPages = Taro.getCurrentPages()

        if (!this.ready && currentPages.length) {
            this.ready = true

            this.safeCallHandlers(location, 'appLaunch')

            if (this.pendingNavigateOptions) {
                this.navigate(this.pendingNavigateOptions)
                delete this.pendingNavigateOptions
            }
        }

        if (latestPages.length) {
            let action = '' as TaroHistoryAction

            const latestRoute = latestPages[latestPages.length - 1].route
            const currentRoute = currentPages[currentPages.length - 1].route

            // 页面栈增长
            if (currentPages.length > latestPages.length) {
                action = 'navigateTo'
            }
            // 页面栈等长
            else if (currentPages.length === latestPages.length) {
                if (currentRoute !== latestRoute) {
                    if (this.isTabPagePath(currentRoute)) {
                        action = 'switchTab'
                    } else {
                        action = 'redirectTo'
                    }
                }
            }
            // 页面栈缩短
            else {
                if (this.isTabPagePath(currentRoute)) {
                    // 从多页变回一页, 并且是之前打开的 Tab 页, 假定是 navigateBack(n).
                    if (currentRoute === latestPages[0].route) {
                        action = 'navigateBack'
                    } else {
                        action = 'switchTab'
                    }
                } else {
                    action = 'navigateBack'
                }
            }

            if (action) {
                this.location = location
                this.action = action

                this.safeCallHandlers(location, action)
            }
        }

        this.latestPages = currentPages
    }
}

export function createTaroHistory(options = {} as TaroHistoryOptions) {
    return new TaroHistory(options)
}
