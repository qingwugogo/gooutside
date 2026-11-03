const api = require('../../utils/api');
const util = require('../../utils/util');
const i18n = require('../../utils/i18n');

function normalizeItem(raw) {
    return {
        id: raw.id,
        name: raw.name,
        latitude: raw.latitude,
        longitude: raw.longitude,
        address: raw.address || '',
        description: raw.description || '',
        tags: raw.tags || [],
        photoPaths: raw.photo_paths || [],
        ratingAvg: Number(raw.rating_avg) || 0,
        ratingCount: raw.rating_count || 0,
        distanceM: raw.distance_m,
        distanceText: util.formatDistance(raw.distance_m),
        stars: util.starsOf(raw.rating_avg),
        coverPath: (raw.photo_paths && raw.photo_paths[0]) || '',
        ownerId: raw.owner_id,
    };
}

Page({
    data: {
        latitude: 39.9042,
        longitude: 116.4074,
        scale: 13,
        markers: [],
        list: [],
        totalCount: 0,
        radiusKey: '2000',
        radiusOptions: util.DISTANCE_OPTIONS,
        locationState: 'loading', // loading | ok | error
        listState: 'loading', // loading | ok | empty | error
        errorMessage: '',
        activeId: null,
        scrollTopId: '',
        covers: {},
    },

    onLoad() {
        this.allItems = [];
        this.locate();
    },

    onShow() {
        this.applyI18n();
        // 从详情/分享页返回时按需刷新（新分享的游乐场可能出现）
        if (getApp().globalData.playgroundsDirty) {
            getApp().globalData.playgroundsDirty = false;
            if (this.data.locationState === 'ok') {
                this.loadNearby();
            }
        }
    },

    // 应用当前语言：文案 + 导航标题 + 距离筛选标签
    applyI18n() {
        const t = i18n.pageStrings('index');
        const radiusOptions = util.DISTANCE_OPTIONS.map((o) => ({
            ...o,
            label: o.key === 'all' ? t.radiusAll : o.label,
        }));
        this.setData({ t, lang: i18n.getLang(), radiusOptions });
        wx.setNavigationBarTitle({ title: t.navTitle });
    },

    locate() {
        this.setData({ locationState: 'loading', listState: 'loading', errorMessage: '' });
        wx.getLocation({
            type: 'gcj02',
            success: (res) => {
                this.setData({
                    locationState: 'ok',
                    latitude: res.latitude,
                    longitude: res.longitude,
                });
                this.loadNearby();
            },
            fail: (err) => {
                const msg = (err && err.errMsg) || '';
                const t = this.data.t || i18n.pageStrings('index');
                let hint = t.locFailed;
                if (msg.indexOf('auth') >= 0 || msg.indexOf('deny') >= 0 || msg.indexOf('permission') >= 0) {
                    hint = t.locDenied;
                }
                this.setData({ locationState: 'error', listState: 'empty', errorMessage: hint });
            },
        });
    },

    onOpenSetting() {
        wx.openSetting({
            success: () => {
                this.locate();
            },
        });
    },

    async loadNearby() {
        this.setData({ listState: 'loading', errorMessage: '' });
        const res = await api.fetchNearby(this.data.latitude, this.data.longitude);
        if (res.error) {
            this.setData({ listState: 'error', errorMessage: res.error.message || (this.data.t ? this.data.t.loadFailed : '加载失败') });
            return;
        }
        this.allItems = (res.data || []).map(normalizeItem);
        this.applyFilter();
        this.loadCovers();
    },

    applyFilter() {
        const option = util.DISTANCE_OPTIONS.find((o) => o.key === this.data.radiusKey) || util.DISTANCE_OPTIONS[2];
        let items = this.allItems;
        if (option.value > 0) {
            items = items.filter((item) => item.distanceM !== null && item.distanceM <= option.value);
        }
        const activeId = this.data.activeId;
        const markers = items.map((item) => {
            const isActive = item.id === activeId;
            return {
                id: item.id,
                latitude: item.latitude,
                longitude: item.longitude,
                iconPath: isActive ? '/images/marker-active.png' : '/images/marker.png',
                width: isActive ? 36 : 30,
                height: isActive ? 44 : 37,
                callout: {
                    content: item.name,
                    display: isActive ? 'ALWAYS' : 'BYCLICK',
                    bgColor: '#ffffff',
                    color: '#22262B',
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: '#DCE2DC',
                    padding: 6,
                    fontSize: 12,
                },
            };
        });
        this.setData({
            list: items,
            markers,
            totalCount: items.length,
            listState: items.length ? 'ok' : 'empty',
        });
    },

    // 已登录时为封面图生成签名链接
    async loadCovers() {
        const paths = [];
        this.allItems.forEach((item) => {
            if (item.coverPath) paths.push(item.coverPath);
        });
        if (!paths.length) return;
        const { map, error } = await api.signPhotoMap(paths);
        if (error || !Object.keys(map).length) return;
        this.setData({ covers: map });
    },

    onChooseRadius(event) {
        const key = event.currentTarget.dataset.key;
        if (key === this.data.radiusKey) return;
        this.setData({ radiusKey: key });
        this.applyFilter();
    },

    onMarkerTap(event) {
        const markerId = event.detail && event.detail.markerId;
        if (markerId === undefined || markerId === null) return;
        this.setActive(markerId);
    },

    setActive(id) {
        if (this.data.activeId === id) {
            this.setData({ activeId: null, scrollTopId: '' });
        } else {
            this.setData({ activeId: id, scrollTopId: 'item-' + id });
        }
        this.applyFilterKeepActive();
    },

    // activeId 变化后重建 markers，但不改动列表状态
    applyFilterKeepActive() {
        const data = this.data;
        const markers = data.markers.map((marker) => {
            const isActive = marker.id === data.activeId;
            return {
                ...marker,
                iconPath: isActive ? '/images/marker-active.png' : '/images/marker.png',
                width: isActive ? 36 : 30,
                height: isActive ? 44 : 37,
                callout: {
                    ...marker.callout,
                    display: isActive ? 'ALWAYS' : 'BYCLICK',
                },
            };
        });
        this.setData({ markers });
    },

    onCardTap(event) {
        const id = event.currentTarget.dataset.id;
        getApp().globalData.playgroundsDirty = true;
        wx.navigateTo({ url: '/pages/detail/detail?id=' + id });
    },

    onRelocate() {
        this.locate();
    },

    onGoShare() {
        wx.switchTab({ url: '/pages/add/add' });
    },

    onRetry() {
        if (this.data.locationState === 'error') {
            this.locate();
        } else {
            this.loadNearby();
        }
    },

    onShareAppMessage() {
        const t = this.data.t || i18n.pageStrings('index');
        return {
            title: t.shareTitle,
            path: '/pages/index/index',
        };
    },
});
