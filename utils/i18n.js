// 中英双语支持：语言选择持久化，页面在 onShow 时应用当前语言。
// 用法：
//   const i18n = require('.../i18n');
//   this.setData({ t: i18n.pageStrings('index'), lang: i18n.getLang() });
//   JS 动态文案：i18n.pageStrings('review').toastPosted

const LANG_KEY = 'app_lang';

function getLang() {
    try {
        const lang = wx.getStorageSync(LANG_KEY);
        return lang === 'en' ? 'en' : 'zh';
    } catch (e) {
        return 'zh';
    }
}

function setLang(lang) {
    try {
        wx.setStorageSync(LANG_KEY, lang === 'en' ? 'en' : 'zh');
    } catch (e) { /* ignore */ }
    applyTabBar();
}

function isEn() {
    return getLang() === 'en';
}

// ===== 设施标签：数据库统一存中文，展示层按语言翻译 =====
const TAG_EN = {
    '滑梯': 'Slides',
    '秋千': 'Swings',
    '沙池': 'Sandpit',
    '攀爬架': 'Climbing frame',
    '跷跷板': 'Seesaw',
    '摇摇乐': 'Spring rider',
    '有遮阳': 'Shaded',
    '有卫生间': 'Restroom',
    '有停车位': 'Parking',
    '适合幼儿': 'Toddlers',
    '适合大童': 'Big kids',
    '塑胶地面': 'Rubber floor',
};

function tagLabel(tag) {
    if (!tag) return '';
    return isEn() ? (TAG_EN[tag] || tag) : tag;
}

// ===== 词典（zh / en） =====
const DICT = {
    tab: {
        zh: { find: '找游乐场', share: '分享', mine: '我的' },
        en: { find: 'Explore', share: 'Share', mine: 'Me' },
    },

    index: {
        zh: {
            navTitle: '找游乐场',
            panelTitle: '附近免费游乐场',
            loadingNearby: '正在加载附近游乐场…',
            loadFailed: '加载失败',
            retry: '重试',
            noLocTitle: '还没有拿到你的位置',
            locDenied: '需要位置权限才能查找附近的游乐场，请在设置中开启',
            locFailed: '定位失败，请重试',
            openSetting: '去开启定位',
            emptyTitle: '这个范围内还没有游乐场',
            emptyDesc: '换个更大的范围试试，或者把你知道的免费游乐场分享给大家。',
            emptyBtn: '去分享一个',
            endLine: '— 就这些啦 —',
            limit300: '只显示最近的 300 个',
            radiusAll: '全部',
            shareTitle: '有空带娃去玩吧 · 找找附近的遛娃好去处',
        },
        en: {
            navTitle: 'Playgrounds',
            panelTitle: 'Free playgrounds nearby',
            loadingNearby: 'Loading nearby playgrounds…',
            loadFailed: 'Failed to load',
            retry: 'Retry',
            noLocTitle: 'Location not available yet',
            locDenied: 'Location permission is needed to find nearby playgrounds. Please enable it in Settings.',
            locFailed: 'Failed to locate, please try again',
            openSetting: 'Enable location',
            emptyTitle: 'No playgrounds in this range',
            emptyDesc: 'Try a wider range, or share a free playground you know with everyone.',
            emptyBtn: 'Share one',
            endLine: '— that is all —',
            limit300: 'Showing the nearest 300 only',
            radiusAll: 'All',
            shareTitle: 'Free Playgrounds · find a spot to take your kids',
        },
    },

    detail: {
        zh: {
            navTitle: '游乐场详情',
            free: '免费',
            noReviews: '暂无评价',
            navigate: '导航 ›',
            photosTitle: '现场照片',
            photosCount: '{n} 张',
            photoLock: '登录后才能查看现场照片',
            goLogin: '去登录',
            reviewsTitle: '大家的评价',
            reviewEmpty: '还没有评价，来写第一条吧～',
            writeReview: '写评价',
            navigateBtn: '导航',
            shareBtn: '分享',
            noLocation: '这条分享没有位置信息',
            loading: '正在加载…',
            loadFailed: '加载失败',
            notFound: '没有找到这个游乐场，可能已被删除',
            retry: '重试',
            reportPg: '举报该内容',
            deletePg: '删除这条分享',
            reportRv: '举报这条评价',
            deleteRv: '删除这条评价',
            reportNeedLogin: '举报前请先在「我的」里登录',
            reportSent: '已收到举报，我们会尽快核实',
            reportDup: '你已经举报过了',
            reportFail: '举报失败，请稍后重试',
            delPgTitle: '删除这条分享',
            delPgContent: '删除后无法恢复，场地照片也会一并删除。',
            delRvTitle: '删除这条评价',
            delRvContent: '删除后无法恢复，评价里的照片也会一并删除。',
            delConfirm: '删除',
            delFail: '删除失败，请稍后重试',
            delDone: '已删除',
            shareTitle: '有空带娃去玩吧',
        },
        en: {
            navTitle: 'Playground',
            free: 'Free',
            noReviews: 'No reviews yet',
            navigate: 'Directions ›',
            photosTitle: 'Photos',
            photosCount: '{n} photos',
            photoLock: 'Sign in to view photos',
            goLogin: 'Sign in',
            reviewsTitle: 'Reviews',
            reviewEmpty: 'No reviews yet — be the first!',
            writeReview: 'Review',
            navigateBtn: 'Go',
            shareBtn: 'Share',
            noLocation: 'This place has no location info',
            loading: 'Loading…',
            loadFailed: 'Failed to load',
            notFound: 'Playground not found — it may have been removed',
            retry: 'Retry',
            reportPg: 'Report this place',
            deletePg: 'Delete this place',
            reportRv: 'Report this review',
            deleteRv: 'Delete this review',
            reportNeedLogin: 'Please sign in first to report',
            reportSent: 'Report received, thank you',
            reportDup: 'You already reported this',
            reportFail: 'Report failed, try again later',
            delPgTitle: 'Delete this place',
            delPgContent: 'This cannot be undone. Photos will be removed too.',
            delRvTitle: 'Delete this review',
            delRvContent: 'This cannot be undone. Photos will be removed too.',
            delConfirm: 'Delete',
            delFail: 'Delete failed, try again later',
            delDone: 'Deleted',
            shareTitle: 'Free Playgrounds',
        },
    },

    review: {
        zh: {
            navTitle: '写评价',
            checking: '正在检查登录状态…',
            targetLabel: '评价对象',
            targetLoading: '加载中…',
            rateLabel: '总体打分',
            rateTexts: ['', '不太行', '一般', '还不错', '很好', '超棒'],
            contentLabel: '说说体验（选填）',
            contentHint: '设施新不新、干不干净、人多不多、孩子玩得开不开心…',
            photoLabel: '现场照片（选填，最多 {n}/4 张）',
            consent1a: '我已阅读并同意',
            terms: '《用户协议》',
            and: '和',
            privacy: '《隐私政策》',
            consent2a: '我确认照片由我拍摄或已获授权，照片中人物（含未成年人）已取得其',
            guardianConsent: '监护人同意',
            submit: '发布评价',
            uploading: '准备上传…',
            uploadPhoto: '上传照片 {i}/{n}…',
            submitting: '正在提交…',
            errNeedRating: '先给这个游乐场打个分吧',
            errNeedContent: '写几句感受，或至少传一张现场照片',
            errNeedAgree: '请先阅读并同意《用户协议》和《隐私政策》',
            errNeedRights: '请确认你有权发布这些照片，并已取得照片中人物监护人同意',
            errUpload: '照片上传失败，请检查网络后重试，或直接写几句文字',
            toastPosted: '评价成功',
            toastPartial: '已发布，{n} 张照片上传失败已跳过',
            submitFail: '提交失败，请重试',
        },
        en: {
            navTitle: 'Write a Review',
            checking: 'Checking sign-in status…',
            targetLabel: 'Place',
            targetLoading: 'Loading…',
            rateLabel: 'Overall rating',
            rateTexts: ['', 'Poor', 'OK', 'Good', 'Great', 'Awesome'],
            contentLabel: 'Your experience (optional)',
            contentHint: 'Is it clean? crowded? Did your kids have fun…',
            photoLabel: 'Photos (optional, up to {n}/4)',
            consent1a: 'I have read and agree to the',
            terms: 'Terms of Service',
            and: 'and',
            privacy: 'Privacy Policy',
            consent2a: 'I confirm the photos are taken/authorized by me, and guardian consent has been obtained for anyone shown (including minors):',
            guardianConsent: 'guardian consent',
            submit: 'Post Review',
            uploading: 'Preparing upload…',
            uploadPhoto: 'Uploading photo {i}/{n}…',
            submitting: 'Submitting…',
            errNeedRating: 'Please rate this playground first',
            errNeedContent: 'Write a few words or add at least one photo',
            errNeedAgree: 'Please agree to the Terms and Privacy Policy first',
            errNeedRights: 'Please confirm you have the right to post these photos with guardian consent',
            errUpload: 'Photo upload failed. Check your network, or just write a few words',
            toastPosted: 'Review posted',
            toastPartial: 'Posted. {n} photo(s) failed to upload and were skipped',
            submitFail: 'Submit failed, please retry',
        },
    },

    add: {
        zh: {
            navTitle: '分享游乐场',
            checking: '正在检查登录状态…',
            nameLabel: '游乐场名称',
            nameHint: '例如：幸福公园儿童游乐区',
            locLabel: '位置',
            pickOnMap: '📍 在地图上选择位置',
            pickedDefault: '已选择的位置',
            repick: '重选',
            tagLabel: '设施标签（选填）',
            descLabel: '介绍（选填）',
            descHint: '适合几岁的孩子、怎么去、有什么好玩的…',
            photoLabel: '场景图（选填，最多 {n}/6 张）',
            consent1a: '我已阅读并同意',
            terms: '《用户协议》',
            and: '和',
            privacy: '《隐私政策》',
            consent2a: '我确认照片由我拍摄或已获授权，照片中人物（含未成年人）已取得其',
            guardianConsent: '监护人同意',
            submit: '发布到地图',
            uploading: '准备上传…',
            uploadPhoto: '上传照片 {i}/{n}…',
            posting: '正在发布…',
            errNeedName: '请填写游乐场名称',
            errNeedLoc: '请在地图上选择游乐场的位置',
            errNeedAgree: '请先阅读并同意《用户协议》和《隐私政策》',
            errNeedRights: '请确认你有权发布这些照片，并已取得照片中人物监护人同意',
            toastPosted: '分享成功',
            toastPartial: '已发布，{n} 张照片上传失败已跳过',
            submitFail: '发布失败，请重试',
        },
        en: {
            navTitle: 'Share a Playground',
            checking: 'Checking sign-in status…',
            nameLabel: 'Name',
            nameHint: 'e.g. Riverside Park Playground',
            locLabel: 'Location',
            pickOnMap: '📍 Pick on map',
            pickedDefault: 'Selected location',
            repick: 'Change',
            tagLabel: 'Facilities (optional)',
            descLabel: 'Description (optional)',
            descHint: 'Good for what ages, how to get there, what to play…',
            photoLabel: 'Photos (optional, up to {n}/6)',
            consent1a: 'I have read and agree to the',
            terms: 'Terms of Service',
            and: 'and',
            privacy: 'Privacy Policy',
            consent2a: 'I confirm the photos are taken/authorized by me, and guardian consent has been obtained for anyone shown (including minors):',
            guardianConsent: 'guardian consent',
            submit: 'Publish to Map',
            uploading: 'Preparing upload…',
            uploadPhoto: 'Uploading photo {i}/{n}…',
            posting: 'Publishing…',
            errNeedName: 'Please enter a name',
            errNeedLoc: 'Please pick a location on the map',
            errNeedAgree: 'Please agree to the Terms and Privacy Policy first',
            errNeedRights: 'Please confirm you have the right to post these photos with guardian consent',
            toastPosted: 'Published',
            toastPartial: 'Published. {n} photo(s) failed to upload and were skipped',
            submitFail: 'Publish failed, please retry',
        },
    },

    mine: {
        zh: {
            navTitle: '我的',
            checking: '正在检查登录状态…',
            loginSlogan: '登录后可以分享游乐场、写评价',
            signOut: '退出',
            signOutTitle: '退出登录',
            signOutContent: '确定要退出当前账号吗？',
            program: '免费游乐场共享计划',
            myPg: '我分享的游乐场',
            cntGe: '个',
            myRv: '我的评价',
            cntTiao: '条',
            emptyPg: '还没有分享过，把你知道的好地方告诉大家吧。',
            goShare: '去分享',
            emptyRv: '还没有写过评价。',
            deletedPg: '已删除的游乐场',
            legalTitle: '协议与数据',
            mTerms: '用户协议',
            mPrivacy: '隐私政策',
            mChildren: '儿童个人信息保护规则',
            mDelete: '删除我的全部数据',
            deleteNote: '删除后会同时移除你发布的游乐场、评价与照片，且无法恢复。',
            delTitle: '删除我的全部数据',
            delContent: '将删除你分享的游乐场、写过的评价及全部照片，无法恢复。确定继续？',
            delConfirm: '删除',
            deleting: '正在删除…',
            delFail: '删除失败，请稍后重试',
            delDone: '已删除 {n} 条内容',
            langLabel: '语言 / Language',
            loadFailed: '加载失败',
        },
        en: {
            navTitle: 'Me',
            checking: 'Checking sign-in status…',
            loginSlogan: 'Sign in to share playgrounds and write reviews',
            signOut: 'Sign out',
            signOutTitle: 'Sign out',
            signOutContent: 'Sign out of this account?',
            program: 'Free playground sharing project',
            myPg: 'Places I shared',
            cntGe: '',
            myRv: 'My reviews',
            cntTiao: '',
            emptyPg: 'Nothing shared yet — tell everyone about a good spot you know.',
            goShare: 'Share one',
            emptyRv: 'No reviews yet.',
            deletedPg: 'Removed playground',
            legalTitle: 'Legal & data',
            mTerms: 'Terms of Service',
            mPrivacy: 'Privacy Policy',
            mChildren: "Children's Privacy Rules",
            mDelete: 'Delete all my data',
            deleteNote: 'Deletes all playgrounds, reviews and photos you posted. This cannot be undone.',
            delTitle: 'Delete all my data',
            delContent: 'All your shared playgrounds, reviews and photos will be deleted permanently. Continue?',
            delConfirm: 'Delete',
            deleting: 'Deleting…',
            delFail: 'Delete failed, try again later',
            delDone: '{n} items deleted',
            langLabel: 'Language / 语言',
            loadFailed: 'Failed to load',
        },
    },

    login: {
        zh: {
            title: '登录',
            desc: '登录后可以分享游乐场、写评价。',
            wechat: '微信一键登录',
            wechatEnv: '当前预览环境不支持微信登录，请在微信开发者工具或真机上重试',
            wechatFail: '微信登录失败，请重试',
            wechatFailAlt: '微信登录失败，请重试，也可以用下方邮箱验证码登录',
            altShow: '使用邮箱验证码登录',
            altHide: '收起邮箱登录',
            emailPh: '邮箱',
            codePh: '验证码',
            resend: '{n} 秒后重发',
            sending: '发送中',
            getCode: '获取验证码',
            emailSubmit: '邮箱登录 / 注册',
            errEmail: '请输入正确的邮箱地址',
            errSendFail: '验证码发送失败，请重试',
            codeSent: '验证码已发送，请查收邮件',
            errNeedCode: '请输入邮箱收到的验证码',
            errCodeFirst: '请先获取当前邮箱的验证码',
            errLoginFail: '登录失败，请重试',
        },
        en: {
            title: 'Sign in',
            desc: 'Sign in to share playgrounds and write reviews.',
            wechat: 'Continue with WeChat',
            wechatEnv: 'WeChat sign-in is not available in this preview. Retry in WeChat DevTools or on a phone',
            wechatFail: 'WeChat sign-in failed, please retry',
            wechatFailAlt: 'WeChat sign-in failed. You can also use the email code below',
            altShow: 'Sign in with email code',
            altHide: 'Hide email sign-in',
            emailPh: 'Email',
            codePh: 'Code',
            resend: 'Resend in {n}s',
            sending: 'Sending',
            getCode: 'Send code',
            emailSubmit: 'Sign in / Sign up',
            errEmail: 'Please enter a valid email address',
            errSendFail: 'Failed to send code, please retry',
            codeSent: 'Code sent — please check your inbox',
            errNeedCode: 'Please enter the code from your email',
            errCodeFirst: 'Please request a code for this email first',
            errLoginFail: 'Sign-in failed, please retry',
        },
    },

    legal: {
        zh: { navTitle: '协议' },
        en: { navTitle: 'Legal' },
    },
};

// 取某页面当前语言的文案对象（新对象，页面可直接 setData）
function pageStrings(page) {
    const lang = getLang();
    return Object.assign({}, DICT[page][lang]);
}

// JS 侧模板替换：'上传照片 {i}/{n}…'
function fill(template, params) {
    return template.replace(/\{(\w+)\}/g, (m, key) =>
        params && params[key] !== undefined ? String(params[key]) : m
    );
}

// tabBar 跟随语言
function applyTabBar() {
    const t = DICT.tab[getLang()];
    const items = [
        { index: 0, text: t.find },
        { index: 1, text: t.share },
        { index: 2, text: t.mine },
    ];
    items.forEach((item) => {
        wx.setTabBarItem(item, () => {}, () => {});
    });
}

module.exports = {
    getLang,
    setLang,
    isEn,
    tagLabel,
    pageStrings,
    fill,
    applyTabBar,
    DICT,
};
