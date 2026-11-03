// 邮箱验证码登录组件：发送与验证是两个动作；验证只使用当前邮箱对应的已发送结果；成功后触发 signedin 事件。
// 依赖 utils/cloud.js 导出的 { cloud }（createMiniProgramWorkBuddyCloud 创建的唯一实例）。

const { cloud } = require('../../utils/cloud');
const i18n = require('../../utils/i18n');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const COUNTDOWN_SECONDS = 60;

Component({
    data: {
        showEmail: false,
        wxLoggingIn: false,
        email: '',
        code: '',
        sending: false,
        submitting: false,
        countdown: 0,
        tip: '',
        error: '',
    },

    lifetimes: {
        attached() {
            this.alive = true;
            this.applyI18n();
        },
        detached() {
            this.alive = false;
            this.stopCountdown();
        },
    },

    pageLifetimes: {
        // 所在页面显示时刷新文案（语言可能已切换）
        show() {
            this.applyI18n();
        },
    },

    methods: {
        applyI18n() {
            this.setData({ t: i18n.pageStrings('login') });
        },

        // 微信一键登录：wx.login 拿 code，交给云端换取会话（openid 等由云端处理）
        onWechatLogin() {
            if (this.data.wxLoggingIn) {
                return;
            }
            if (typeof wx.login !== 'function') {
                // WorkBuddy H5 预览卡等非微信运行时没有 wx.login
                this.setData({ error: this.data.t.wechatEnv });
                return;
            }
            this.setData({ wxLoggingIn: true, error: '', tip: '' });
            wx.login({
                success: ({ code }) => {
                    if (this.alive === false) {
                        return;
                    }
                    let appid = '';
                    try {
                        appid = wx.getAccountInfoSync().miniProgram.appId;
                    } catch (error) {
                        appid = '';
                    }
                    cloud.auth.signInWithWechat(code, appid).then((res) => {
                        if (this.alive === false) {
                            return;
                        }
                        this.setData({ wxLoggingIn: false });
                        if (res.error) {
                            this.setData({
                                error: (res.error.message || '') ? (res.error.message + '，' + this.data.t.wechatFail) : this.data.t.wechatFailAlt,
                            });
                            return;
                        }
                        this.triggerEvent('signedin');
                    }).catch(() => {
                        if (this.alive === false) {
                            return;
                        }
                        this.setData({
                            wxLoggingIn: false,
                            error: this.data.t.wechatFailAlt,
                        });
                    });
                },
                fail: (error) => {
                    if (this.alive === false) {
                        return;
                    }
                    console.error('[login-panel] wx.login failed', JSON.stringify({
                        stage: 'wx.login',
                        message: error && error.errMsg ? error.errMsg : 'unknown',
                    }));
                    this.setData({ wxLoggingIn: false, error: this.data.t.wechatFail });
                },
            });
        },

        toggleEmail() {
            this.setData({ showEmail: !this.data.showEmail, error: '', tip: '' });
        },

        onEmailInput(event) {
            this.setData({ email: event.detail.value, error: '' });
        },

        onCodeInput(event) {
            this.setData({ code: event.detail.value, error: '' });
        },

        async sendCode() {
            if (this.data.sending || this.data.countdown > 0) {
                return;
            }
            const email = (this.data.email || '').trim();
            if (!EMAIL_RE.test(email)) {
                this.setData({ error: this.data.t.errEmail });
                return;
            }
            this.setData({ sending: true, error: '', tip: '' });
            let sent;
            try {
                sent = await cloud.auth.sendOtp({ email: email });
            } catch (error) {
                sent = { data: null, error: { message: '' } };
            }
            if (this.alive === false) {
                return;
            }
            this.setData({ sending: false });
            if (sent.error) {
                this.setData({ error: sent.error.message || this.data.t.errSendFail });
                return;
            }
            this.challenge = {
                email: email,
                verificationId: sent.data.verificationId,
                isExistingUser: sent.data.isExistingUser,
            };
            this.setData({ tip: this.data.t.codeSent, countdown: COUNTDOWN_SECONDS });
            this.startCountdown();
        },

        async submit() {
            if (this.data.submitting) {
                return;
            }
            const email = (this.data.email || '').trim();
            const code = (this.data.code || '').trim();
            if (!EMAIL_RE.test(email)) {
                this.setData({ error: this.data.t.errEmail });
                return;
            }
            if (code === '') {
                this.setData({ error: this.data.t.errNeedCode });
                return;
            }
            const pending = this.challenge;
            if (!pending || pending.email !== email) {
                this.setData({ error: this.data.t.errCodeFirst });
                return;
            }
            this.setData({ submitting: true, error: '', tip: '' });
            let completed;
            try {
                completed = await cloud.auth.verifyOtp({
                    email: pending.email,
                    verificationId: pending.verificationId,
                    isExistingUser: pending.isExistingUser,
                    token: code,
                });
            } catch (error) {
                completed = { data: null, error: { message: '' } };
            }
            if (this.alive === false) {
                return;
            }
            this.setData({ submitting: false });
            if (completed.error) {
                this.setData({ error: completed.error.message || this.data.t.errLoginFail });
                return;
            }
            this.challenge = null;
            this.setData({ code: '', tip: '' });
            this.triggerEvent('signedin');
        },

        startCountdown() {
            this.stopCountdown();
            this.countdownTimer = setInterval(() => {
                const next = this.data.countdown - 1;
                if (next <= 0) {
                    this.stopCountdown();
                    this.setData({ countdown: 0, sendLabel: '' });
                    return;
                }
                this.setData({
                    countdown: next,
                    sendLabel: i18n.fill(this.data.t.resend, { n: next }),
                });
            }, 1000);
        },

        stopCountdown() {
            if (this.countdownTimer) {
                clearInterval(this.countdownTimer);
                this.countdownTimer = null;
            }
        },
    },
});
