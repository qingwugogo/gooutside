const { cloud } = require('../../utils/cloud');
const api = require('../../utils/api');
const util = require('../../utils/util');
const i18n = require('../../utils/i18n');

Page({
    data: {
        authState: 'checking', // checking | signed-out | signed-in
        displayName: '',
        avatarText: '',
        playgrounds: [],
        pgCovers: {},
        reviews: [],
        rvCovers: {},
        loading: false,
        loadError: '',
    },

    onShow() {
        this.applyI18n();
        this.restore();
    },

    applyI18n() {
        const t = i18n.pageStrings('mine');
        this.setData({ t, lang: i18n.getLang() });
        wx.setNavigationBarTitle({ title: t.navTitle });
    },

    // 中英文切换
    onToggleLang() {
        const that = this;
        wx.showActionSheet({
            itemList: ['中文', 'English'],
            success: (res) => {
                const lang = res.tapIndex === 1 ? 'en' : 'zh';
                if (lang === i18n.getLang()) return;
                i18n.setLang(lang);
                that.applyI18n();
                wx.showToast({ title: lang === 'en' ? 'English' : '已切换为中文', icon: 'none' });
            },
        });
    },

    async restore() {
        const t = this.data.t || i18n.pageStrings('mine');
        this.setData({ authState: 'checking' });
        const session = await getApp().ensureSession();
        if (!session) {
            this.setData({ authState: 'signed-out', playgrounds: [], reviews: [] });
            return;
        }
        const user = session.user || {};
        const displayName = user.name
            || (user.email ? user.email.split('@')[0] : (i18n.isEn() ? 'Playground fan' : '游乐场爱好者'));
        this.setData({
            authState: 'signed-in',
            displayName,
            avatarText: displayName.slice(0, 1) || '?',
        });
        this.loadMine(user.id);
    },

    onSignedIn() {
        getApp().resetSession();
        this.restore();
    },

    async loadMine(uid) {
        this.setData({ loading: true, loadError: '' });
        const [pgRes, rvRes] = await Promise.all([
            api.fetchMyPlaygrounds(uid),
            api.fetchMyReviews(uid),
        ]);
        if (pgRes.error || rvRes.error) {
            this.setData({
                loading: false,
                loadError: (pgRes.error || rvRes.error).message || (this.data.t ? this.data.t.loadFailed : '加载失败'),
            });
            return;
        }

        const playgrounds = (pgRes.data || []).map((raw) => {
            const ratings = (raw.review || []).map((r) => r.rating);
            const avg = ratings.length
                ? Math.round(ratings.reduce((s, v) => s + v, 0) / ratings.length * 10) / 10
                : 0;
            return {
                id: raw.id,
                name: raw.name,
                reviewCount: ratings.length,
                stars: util.starsOf(avg),
                avg,
                coverPath: (raw.photo_paths && raw.photo_paths[0]) || '',
            };
        });

        const reviews = (rvRes.data || []).map((raw) => ({
            id: raw.id,
            rating: raw.rating,
            stars: util.starsOf(raw.rating),
            content: raw.content || '',
            dateText: util.formatDate(raw.created_at),
            playgroundId: raw.playground ? raw.playground.id : null,
            playgroundName: raw.playground ? raw.playground.name : (this.data.t ? this.data.t.deletedPg : '已删除的游乐场'),
            photoPaths: raw.photo_paths || [],
            coverPath: (raw.photo_paths && raw.photo_paths[0]) || '',
        }));

        this.setData({
            loading: false,
            playgrounds,
            reviews,
        });
        this.signCovers(playgrounds, reviews);
    },

    async signCovers(playgrounds, reviews) {
        const paths = [];
        playgrounds.forEach((p) => {
            if (p.coverPath) paths.push(p.coverPath);
        });
        reviews.forEach((r) => {
            if (r.coverPath) paths.push(r.coverPath);
        });
        if (!paths.length) return;
        const { map, error } = await api.signPhotoMap(paths);
        if (error) return;
        this.setData({ pgCovers: map, rvCovers: map });
    },

    onPlaygroundTap(event) {
        const id = event.currentTarget.dataset.id;
        wx.navigateTo({ url: '/pages/detail/detail?id=' + id });
    },

    onReviewTap(event) {
        const pid = event.currentTarget.dataset.pid;
        if (!pid) return;
        wx.navigateTo({ url: '/pages/detail/detail?id=' + pid });
    },

    async onSignOut() {
        const that = this;
        const t = this.data.t || i18n.pageStrings('mine');
        wx.showModal({
            title: t.signOutTitle,
            content: t.signOutContent,
            success: async (res) => {
                if (!res.confirm) return;
                await cloud.auth.signOut();
                getApp().resetSession();
                that.restore();
            },
        });
    },

    onGoShare() {
        wx.switchTab({ url: '/pages/add/add' });
    },

    onOpenLegal(event) {
        const type = event.currentTarget.dataset.type || 'terms';
        wx.navigateTo({ url: '/pages/legal/legal?type=' + type });
    },

    // 删除当前账号发布的全部内容与照片（个人信息删除权）
    onDeleteAllData() {
        const that = this;
        const t = this.data.t || i18n.pageStrings('mine');
        wx.showModal({
            title: t.delTitle,
            content: t.delContent,
            confirmText: t.delConfirm,
            confirmColor: '#D64541',
            success: async (res) => {
                if (!res.confirm) return;
                wx.showLoading({ title: t.deleting, mask: true });
                const session = await getApp().ensureSession();
                if (!session) {
                    wx.hideLoading();
                    return;
                }
                const result = await api.deleteMyData(session.user.id);
                wx.hideLoading();
                if (result.error) {
                    wx.showToast({ title: t.delFail, icon: 'none' });
                    return;
                }
                getApp().globalData.playgroundsDirty = true;
                const removed = (result.removedPlaygrounds || 0) + (result.removedReviews || 0);
                wx.showToast({ title: i18n.fill(t.delDone, { n: removed }), icon: 'none' });
                that.restore();
            },
        });
    },
});
