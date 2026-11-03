const api = require('../../utils/api');
const moderation = require('../../utils/moderation');
const i18n = require('../../utils/i18n');

const MAX_PHOTOS = 4;

Page({
    data: {
        playgroundId: null,
        playgroundName: '',
        rating: 0,
        ratingList: [1, 2, 3, 4, 5],
        ratingText: '',
        content: '',
        photos: [], // [{ tempPath }]
        agreed: false,
        rightsConfirmed: false,
        submitting: false,
        submitTip: '',
        error: '',
        authState: 'checking', // checking | signed-out | signed-in
    },

    onLoad(options) {
        this.setData({ playgroundId: options.playgroundId });
        this.loadPlaygroundName();
    },

    onShow() {
        this.applyI18n();
        this.restore();
    },

    applyI18n() {
        const t = i18n.pageStrings('review');
        t.photoLabel = i18n.fill(t.photoLabel, { n: this.data.photos.length });
        this.setData({ t, lang: i18n.getLang() });
        if (this.data.playgroundName) {
            wx.setNavigationBarTitle({ title: this.data.playgroundName });
        }
    },

    // 照片标签里的当前张数变化后刷新
    refreshPhotoLabel() {
        this.setData({
            't.photoLabel': i18n.fill(i18n.pageStrings('review').photoLabel, { n: this.data.photos.length }),
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

    async loadPlaygroundName() {
        const res = await api.fetchPlayground(this.data.playgroundId);
        if (!res.error && res.data) {
            this.setData({ playgroundName: res.data.name });
            wx.setNavigationBarTitle({ title: res.data.name });
        }
    },

    onRate(event) {
        const rating = event.currentTarget.dataset.value;
        const texts = this.data.t.rateTexts;
        this.setData({ rating, ratingText: texts[rating] || '', error: '' });
    },

    onContentInput(event) {
        this.setData({ content: event.detail.value, error: '' });
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
        wx.previewImage({
            current: src,
            urls: this.data.photos.map((p) => p.tempPath),
        });
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
        const t = this.data.t || i18n.pageStrings('review');
        if (!this.data.rating) {
            this.setData({ error: t.errNeedRating });
            return;
        }
        if (!this.data.content.trim() && this.data.photos.length === 0) {
            this.setData({ error: t.errNeedContent });
            return;
        }
        const textCheck = moderation.checkText(this.data.content, { maxLength: 500 });
        if (!textCheck.ok) {
            this.setData({ error: textCheck.reason });
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
                    'reviews',
                    this.data.photos.map((p) => p.tempPath),
                    (i, total) => {
                        this.setData({ submitTip: i18n.fill(t.uploadPhoto, { i: i + 1, n: total }) });
                    },
                );
                photoPaths.push(...up.paths);
                failedPhotos = up.failed;
                if (!photoPaths.length && !this.data.content.trim()) {
                    throw new Error(t.errUpload);
                }
            }

            this.setData({ submitTip: t.submitting });
            const ownerName = session.user.name
                || (session.user.email ? session.user.email.split('@')[0] : null);
            const saved = await api.createReview({
                playground_id: Number(this.data.playgroundId),
                rating: this.data.rating,
                content: this.data.content.trim() || null,
                photo_paths: photoPaths,
                owner_name: ownerName,
            });
            if (saved.error) {
                throw new Error(saved.error.message || t.submitFail);
            }

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
            setTimeout(() => wx.navigateBack(), failedPhotos > 0 ? 1600 : 600);
        } catch (err) {
            this.setData({
                submitting: false,
                submitTip: '',
                error: (err && err.message) || t.submitFail,
            });
        }
    },
});
