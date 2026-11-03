const { cloud } = require('./utils/cloud');
const i18n = require('./utils/i18n');

App({
    globalData: {
        appName: '有空带娃去玩吧',
        playgroundsDirty: false, // 有新分享的游乐场时置为 true，首页据此刷新
    },

    onLaunch() {
        // tabBar 文案跟随用户选择的语言
        i18n.applyTabBar();
    },

    // 会话缓存：登录或退出后必须调用 resetSession()
    ensureSession() {
        if (!this.sessionPromise) {
            this.sessionPromise = cloud.auth.getSession().then((res) => {
                return res && res.data ? res.data : null;
            }).catch(() => {
                this.sessionPromise = null;
                return null;
            });
        }
        return this.sessionPromise;
    },

    resetSession() {
        this.sessionPromise = null;
    },
});
