const { DOCS, ORDER } = require('./legal-content');
const i18n = require('../../utils/i18n');

Page({
    data: {
        tabs: [],
        activeKey: 'terms',
        title: '',
        sections: [],
    },

    onLoad(options) {
        const key = options && DOCS[options.type] ? options.type : 'terms';
        this.apply(key);
    },

    onShow() {
        // 语言可能已切换，按当前语言重建
        this.apply(this.data.activeKey);
    },

    apply(key) {
        const lang = i18n.getLang();
        const doc = DOCS[key][lang];
        const tabs = ORDER.map((k) => ({ key: k, label: DOCS[k][lang].title }));
        this.setData({
            tabs,
            activeKey: key,
            title: doc.title,
            footText: lang === 'en'
                ? 'This is the current version; updates will be published on this page.'
                : '以上为当前版本，如有更新将在本页公示。',
            sections: doc.sections.map((section, index) => ({
                key: index,
                type: section.type,
                text: section.text,
            })),
        });
        wx.setNavigationBarTitle({ title: doc.title });
    },

    onTabTap(event) {
        const key = event.currentTarget.dataset.key;
        if (key === this.data.activeKey) return;
        this.apply(key);
        wx.pageScrollTo({ scrollTop: 0, duration: 0 });
    },
});
