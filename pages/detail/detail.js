const api = require('../../utils/api');
const util = require('../../utils/util');
const i18n = require('../../utils/i18n');

function mapReview(raw) {
    return {
        id: raw.id,
        ownerId: raw.owner_id,
        ownerName: raw.owner_name || '游乐场爱好者',
        rating: raw.rating,
        stars: util.starsOf(raw.rating),
        content: raw.content || '',
        photoPaths: raw.photo_paths || [],
        dateText: util.formatDate(raw.created_at),
        photoUrls: [],
    };
}

const REPORT_REASONS = {
    zh: ['含广告或联系方式', '信息不实 / 已废弃', '侵犯肖像或版权', '违法违规内容', '其他问题'],
    en: ['Ads or contact info', 'Inaccurate / closed', 'Portrait or copyright', 'Illegal content', 'Other'],
};

Page({
    data: {
        id: null,
        state: 'loading', // loading | ok | error
        errorMessage: '',
        playground: null,
        reviews: [],
        ratingAvg: 0,
        ratingCount: 0,
        stars: '',
        photoUrls: [],
        signedIn: false,
        photoCount: 0,
    },

    onLoad(options) {
        this.setData({ id: options.id });
        this.load();
    },

    onShow() {
        this.applyI18n();
        // 从评价页返回后刷新
        if (this.needReload) {
            this.needReload = false;
            this.load();
        }
    },

    applyI18n() {
        const t = i18n.pageStrings('detail');
        this.setData({ t, lang: i18n.getLang() });
        wx.setNavigationBarTitle({ title: t.navTitle });
    },

    async load() {
        const t = this.data.t || i18n.pageStrings('detail');
        this.setData({ state: 'loading', errorMessage: '' });
        const [pgRes, rvRes] = await Promise.all([
            api.fetchPlayground(this.data.id),
            api.fetchReviews(this.data.id),
        ]);
        if (pgRes.error) {
            this.setData({ state: 'error', errorMessage: pgRes.error.message || t.loadFailed });
            return;
        }
        if (!pgRes.data) {
            this.setData({ state: 'error', errorMessage: t.notFound });
            return;
        }
        const pg = pgRes.data;
        const reviews = (rvRes.error ? [] : (rvRes.data || [])).map(mapReview);
        const ratingCount = reviews.length;
        const ratingAvg = ratingCount
            ? Math.round(reviews.reduce((sum, r) => sum + r.rating, 0) / ratingCount * 10) / 10
            : 0;
        this.setData({
            state: 'ok',
            playground: {
                id: pg.id,
                ownerId: pg.owner_id,
                name: pg.name,
                latitude: pg.latitude,
                longitude: pg.longitude,
                address: pg.address || '',
                description: pg.description || '',
                tags: pg.tags || [],
                photoPaths: pg.photo_paths || [],
            },
            reviews,
            ratingAvg,
            ratingCount,
            stars: util.starsOf(ratingAvg),
            photoCount: (pg.photo_paths || []).length,
        });
        this.signPhotos(pg.photo_paths || [], reviews);
    },

    async signPhotos(photoPaths, reviews) {
        const session = await getApp().ensureSession();
        if (!session) {
            this.setData({ signedIn: false });
            return;
        }
        this.myId = session.user.id;
        this.setData({ signedIn: true });
        const allPaths = photoPaths.slice();
        reviews.forEach((r) => {
            allPaths.push(...r.photoPaths);
        });
        const { map, error } = await api.signPhotoMap(allPaths);
        if (error || !Object.keys(map).length) return;
        this.setData({
            photoUrls: photoPaths.map((p) => map[p]).filter(Boolean),
            reviews: this.data.reviews.map((r) => ({
                ...r,
                photoUrls: r.photoPaths.map((p) => map[p]).filter(Boolean),
            })),
        });
    },

    onPreviewPhoto(event) {
        const current = event.currentTarget.dataset.src;
        const urls = this.data.photoUrls;
        if (!current || !urls.length) return;
        wx.previewImage({ current, urls });
    },

    onPreviewReviewPhoto(event) {
        const { rid, src } = event.currentTarget.dataset;
        const review = this.data.reviews.find((r) => r.id === rid);
        if (!review || !review.photoUrls.length) return;
        wx.previewImage({ current: src, urls: review.photoUrls });
    },

    onWriteReview() {
        this.needReload = true;
        wx.navigateTo({ url: '/pages/review/review?playgroundId=' + this.data.id });
    },

    // 导航：拉起微信内置地点页，可选腾讯/高德/百度地图导航
    onNavigate() {
        const pg = this.data.playground;
        if (!pg || !pg.latitude || !pg.longitude) {
            wx.showToast({ title: this.data.t.noLocation, icon: 'none' });
            return;
        }
        wx.openLocation({
            latitude: Number(pg.latitude),
            longitude: Number(pg.longitude),
            name: pg.name,
            address: pg.address || '',
            scale: 16,
        });
    },

    onGoLogin() {
        wx.switchTab({ url: '/pages/mine/mine' });
    },

    onRetry() {
        this.load();
    },

    // ===== 内容举报 / 作者删除 =====
    onPlaygroundMore() {
        const pg = this.data.playground;
        if (!pg) return;
        const t = this.data.t;
        const isMine = this.myId && pg.ownerId === this.myId;
        const items = isMine ? [t.deletePg, t.reportPg] : [t.reportPg];
        wx.showActionSheet({
            itemList: items,
            success: (res) => {
                if (isMine && res.tapIndex === 0) {
                    this.deletePlayground();
                    return;
                }
                this.reportTarget('playground', pg.id);
            },
        });
    },

    onReviewMore(event) {
        const { rid, owner } = event.currentTarget.dataset;
        if (!rid) return;
        const t = this.data.t;
        const isMine = this.myId && owner === this.myId;
        const items = isMine ? [t.deleteRv, t.reportRv] : [t.reportRv];
        wx.showActionSheet({
            itemList: items,
            success: (res) => {
                if (isMine && res.tapIndex === 0) {
                    this.deleteReview(rid);
                    return;
                }
                this.reportTarget('review', rid);
            },
        });
    },

    reportTarget(targetType, targetId) {
        const t = this.data.t;
        if (!this.myId) {
            wx.showModal({
                title: t.navTitle,
                content: t.reportNeedLogin,
                showCancel: false,
            });
            return;
        }
        const reasons = REPORT_REASONS[i18n.getLang()] || REPORT_REASONS.zh;
        wx.showActionSheet({
            itemList: reasons,
            success: async (res) => {
                const reason = reasons[res.tapIndex];
                const saved = await api.createReport(targetType, targetId, reason, '');
                if (saved.error) {
                    const msg = saved.error.message || '';
                    wx.showToast({
                        title: msg.indexOf('duplicate') >= 0 ? t.reportDup : t.reportFail,
                        icon: 'none',
                    });
                    return;
                }
                wx.showToast({ title: t.reportSent, icon: 'none' });
            },
        });
    },

    deletePlayground() {
        const t = this.data.t;
        const pg = this.data.playground;
        if (!pg) return;
        wx.showModal({
            title: t.delPgTitle,
            content: t.delPgContent,
            confirmText: t.delConfirm,
            confirmColor: '#D64541',
            success: async (res) => {
                if (!res.confirm) return;
                const removed = await api.deletePlayground(pg.id, pg.photoPaths);
                if (removed.error) {
                    wx.showToast({ title: t.delFail, icon: 'none' });
                    return;
                }
                getApp().globalData.playgroundsDirty = true;
                wx.showToast({ title: t.delDone, icon: 'success' });
                setTimeout(() => wx.navigateBack(), 600);
            },
        });
    },

    deleteReview(reviewId) {
        const t = this.data.t;
        const review = this.data.reviews.find((r) => r.id === reviewId);
        if (!review) return;
        wx.showModal({
            title: t.delRvTitle,
            content: t.delRvContent,
            confirmText: t.delConfirm,
            confirmColor: '#D64541',
            success: async (res) => {
                if (!res.confirm) return;
                const removed = await api.deleteReview(reviewId, review.photoPaths);
                if (removed.error) {
                    wx.showToast({ title: t.delFail, icon: 'none' });
                    return;
                }
                wx.showToast({ title: t.delDone, icon: 'success' });
                this.load();
            },
        });
    },

    onShareAppMessage() {
        const t = this.data.t || i18n.pageStrings('detail');
        const pg = this.data.playground;
        return {
            title: pg ? pg.name + ' · ' + t.shareTitle : t.shareTitle,
            path: pg ? '/pages/detail/detail?id=' + pg.id : '/pages/index/index',
        };
    },
});
