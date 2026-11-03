const api = require('../../utils/api');
const util = require('../../utils/util');
const moderation = require('../../utils/moderation');
const i18n = require('../../utils/i18n');

const MAX_PHOTOS = 6;

Page({
    data: {
        name: '',
        location: null, // { latitude, longitude, name, address }
        description: '',
        tagOptions: util.TAG_OPTIONS.map((v) => ({ value: v, label: v, checked: false })),
        tags: [],
        photos: [],
        agreed: false,
        rightsConfirmed: false,
        submitting: false,
        submitTip: '',
        error: '',
        authState: 'checking',
    },

    onShow() {
        this.applyI18n();
        this.restore();
    },

    applyI18n() {
        const t = i18n.pageStrings('add');
        t.photoLabel = i18n.fill(t.photoLabel, { n: this.data.photos.length });
        // 设施标签：数据库统一存中文值，展示层按语言翻译
        // 选中态挂在 tagOptions[].checked 上（WXML 不支持 indexOf 等方法调用）
        const tags = this.data.tags || [];
        const tagOptions = util.TAG_OPTIONS.map((v) => ({
            value: v,
            label: i18n.tagLabel(v),
            checked: tags.indexOf(v) >= 0,
        }));
        this.setData({ t, lang: i18n.getLang(), tagOptions });
        wx.setNavigationBarTitle({ title: t.navTitle });
    },

    refreshPhotoLabel() {
        this.setData({
            't.photoLabel': i18n.fill(i18n.pageStrings('add').photoLabel, { n: this.data.photos.length }),
        });
    },

    async restore() {
        this.setData({ authState: 'checking' });
        const session = await getApp().ensureSession();
        this.setData({ authState: session ? 'signed-in' : 'signed-out' });
    },

    onSignedIn() {
        getApp().resetSession();
        this.restore();
    },

    onNameInput(event) {
        this.setData({ name: event.detail.value, error: '' });
    },

    onDescInput(event) {
        this.setData({ description: event.detail.value });
    },

    onChooseLocation() {
        wx.chooseLocation({
            success: (res) => {
                this.setData({
                    location: {
                        latitude: res.latitude,
                        longitude: res.longitude,
                        name: res.name || '',
                        address: res.address || '',
                    },
                    error: '',
                });
            },
            fail: (err) => {
                const msg = (err && err.errMsg) || '';
                if (msg.indexOf('auth') >= 0 || msg.indexOf('deny') >= 0 || msg.indexOf('permission') >= 0) {
                    this.setData({ error: i18n.isEn()
                        ? 'Location permission is needed to pick a place. Enable it in Settings.'
                        : '需要位置权限才能选择地点，请在设置中开启' });
                }
            },
        });
    },

    onClearLocation() {
        this.setData({ location: null });
    },

    onToggleTag(event) {
        const tag = event.currentTarget.dataset.tag;
        const tags = this.data.tags.slice();
        const index = tags.indexOf(tag);
        if (index >= 0) {
            tags.splice(index, 1);
        } else {
            tags.push(tag);
        }
        const tagOptions = this.data.tagOptions.map((item) => Object.assign({}, item, {
            checked: tags.indexOf(item.value) >= 0,
        }));
        this.setData({ tags, tagOptions });
    },

    onChoosePhoto() {
        const remain = MAX_PHOTOS - this.data.photos.length;
        if (remain <= 0) return;
        wx.chooseMedia({
            count: remain,
            mediaType: ['image'],
            sizeType: ['compressed'],
            sourceType: ['album', 'camera'],
            success: (res) => {
                const added = (res.tempFiles || []).map((f) => ({ tempPath: f.tempFilePath }));
                this.setData({ photos: this.data.photos.concat(added) });
                this.refreshPhotoLabel();
            },
        });
    },

    onRemovePhoto(event) {
        const index = event.currentTarget.dataset.index;
        const photos = this.data.photos.slice();
        photos.splice(index, 1);
        this.setData({ photos });
        this.refreshPhotoLabel();
    },

    onPreviewPhoto(event) {
        const src = event.currentTarget.dataset.src;
        wx.previewImage({ current: src, urls: this.data.photos.map((p) => p.tempPath) });
    },

    onToggleAgreed() {
        this.setData({ agreed: !this.data.agreed, error: '' });
    },

    onToggleRights() {
        this.setData({ rightsConfirmed: !this.data.rightsConfirmed, error: '' });
    },

    onOpenLegal(event) {
        const type = event.currentTarget.dataset.type || 'terms';
        wx.navigateTo({ url: '/pages/legal/legal?type=' + type });
    },

    async submit() {
        if (this.data.submitting) return;
        const t = this.data.t || i18n.pageStrings('add');
        const name = this.data.name.trim();
        if (!name) {
            this.setData({ error: t.errNeedName });
            return;
        }
        const nameCheck = moderation.checkName(name);
        if (!nameCheck.ok) {
            this.setData({ error: nameCheck.reason });
            return;
        }
        const descCheck = moderation.checkText(this.data.description, { maxLength: 500 });
        if (!descCheck.ok) {
            this.setData({ error: descCheck.reason });
            return;
        }
        if (!this.data.location) {
            this.setData({ error: t.errNeedLoc });
            return;
        }
        if (!this.data.agreed) {
            this.setData({ error: t.errNeedAgree });
            return;
        }
        if (!this.data.rightsConfirmed) {
            this.setData({ error: t.errNeedRights });
            return;
        }
        this.setData({ submitting: true, error: '', submitTip: t.uploading });

        try {
            const session = await getApp().ensureSession();
            if (!session) {
                this.setData({ submitting: false, submitTip: '', authState: 'signed-out' });
                return;
            }

            // 上传照片：单张失败自动重试，仍失败则跳过，不中断发布
            const photoPaths = [];
            let failedPhotos = 0;
            if (this.data.photos.length) {
                const up = await api.uploadPhotos(
                    session.user.id,
                    'playgrounds',
                    this.data.photos.map((p) => p.tempPath),
                    (i, total) => {
                        this.setData({ submitTip: i18n.fill(t.uploadPhoto, { i: i + 1, n: total }) });
                    },
                );
                photoPaths.push(...up.paths);
                failedPhotos = up.failed;
            }

            this.setData({ submitTip: t.posting });
            const ownerName = session.user.name
                || (session.user.email ? session.user.email.split('@')[0] : null);
            const saved = await api.createPlayground({
                name,
                latitude: this.data.location.latitude,
                longitude: this.data.location.longitude,
                address: this.data.location.address || this.data.location.name || null,
                description: this.data.description.trim() || null,
                tags: this.data.tags,
                photo_paths: photoPaths,
                is_free: true,
                owner_name: ownerName,
            });
            if (saved.error) {
                throw new Error(saved.error.message || t.submitFail);
            }

            getApp().globalData.playgroundsDirty = true;
            this.setData({ submitting: false, submitTip: '' });
            if (failedPhotos > 0) {
                wx.showToast({
                    title: i18n.fill(t.toastPartial, { n: failedPhotos }),
                    icon: 'none',
                    duration: 2500,
                });
            } else {
                wx.showToast({ title: t.toastPosted, icon: 'success' });
            }
            setTimeout(() => {
                wx.switchTab({ url: '/pages/index/index' });
            }, failedPhotos > 0 ? 1600 : 600);
        } catch (err) {
            this.setData({
                submitting: false,
                submitTip: '',
                error: (err && err.message) || t.submitFail,
            });
        }
    },
});
