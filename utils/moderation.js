// 内容安全（客户端第一道过滤）
// 说明：客户端过滤只能挡明显违规，无法替代服务端检测。
// 上线前应在服务端接入微信内容安全接口（msgSecCheck / imgSecCheck）或人工审核：
// 1) 文本走 msgSecCheck；2) 图片走 imgSecCheck 或 mediaCheckAsync；
// 3) 审核不通过的内容置 status='hidden'，用户端提供申诉/举报入口。
// 目前策略：客户端关键词与格式过滤 + 举报（3 次自动下架，见数据库触发器 bump_report_count）。

const RULES = [
    {
        // 手机号（不用后行断言，兼容旧版 iOS JavaScriptCore）
        pattern: /(^|[^\d])1[3-9]\d{9}($|[^\d])/,
        reason: '内容里似乎包含手机号，为了保护隐私请不要在公开内容中留联系方式',
    },
    {
        // 座机
        pattern: /(^|[^\d])0\d{2,3}-?\d{7,8}($|[^\d])/,
        reason: '内容里似乎包含电话号码，请不要在公开内容中留联系方式',
    },
    {
        // 邮箱
        pattern: /[\w.+-]+@[\w-]+\.[\w.]+/,
        reason: '内容里包含邮箱地址，请不要在公开内容中留联系方式',
    },
    {
        // 网址 / 短链
        pattern: /(https?:\/\/|www\.|t\.cn\/|dwz\.|url\.cn)/i,
        reason: '内容里包含外部链接，暂不允许发布',
    },
    {
        // 引流话术
        pattern: /(加我微信|加微信|加V|加vx|vx[:：]|微信号|私聊我|私我|扫码进群|进群|代购|刷单|返利|优惠券群|兼职日结)/,
        reason: '内容疑似广告或引流信息，请只分享游乐场本身的体验',
    },
    {
        // 违禁交易
        pattern: /(出售|代开|办证|发票|枪|毒品|冰毒|赌博|博彩|棋牌室代理)/,
        reason: '内容涉嫌违法信息，无法发布',
    },
    {
        // 辱骂/人身攻击（示例词表，正式上线应使用服务端词库）
        pattern: /(傻逼|傻B|脑残|去死|滚出去|贱人|狗东西)/i,
        reason: '请文明表达，不要包含辱骂或人身攻击',
    },
];

const MAX_REPEAT_RUN = 12;

function normalize(text) {
    return (text || '').replace(/\s+/g, ' ').trim();
}

// 返回 { ok: true } 或 { ok: false, reason }
function checkText(text, options) {
    const opts = options || {};
    const value = normalize(text);
    if (!value) {
        return { ok: true };
    }
    if (value.length > (opts.maxLength || 500)) {
        return { ok: false, reason: '内容太长了，精简一下再发吧' };
    }

    for (let i = 0; i < RULES.length; i++) {
        if (RULES[i].pattern.test(value)) {
            return { ok: false, reason: RULES[i].reason };
        }
    }

    // 刷屏：同一字符连续重复
    const repeat = new RegExp('(.)\\1{' + MAX_REPEAT_RUN + ',}');
    if (repeat.test(value)) {
        return { ok: false, reason: '内容里有大段重复字符，看起来像刷屏' };
    }

    // 有效字符太少（标点/表情刷屏）
    const effective = value.replace(/[\s\p{P}\p{S}]/gu, '');
    if (value.length >= 8 && effective.length < 2) {
        return { ok: false, reason: '内容有效信息太少，多写几句吧' };
    }

    return { ok: true };
}

// 名称类：更严格，且不允许纯符号/纯数字
function checkName(text) {
    const value = normalize(text);
    if (!value) {
        return { ok: false, reason: '请填写名称' };
    }
    if (value.length > 30) {
        return { ok: false, reason: '名称太长了，30 字以内' };
    }
    const base = checkText(value, { maxLength: 30 });
    if (!base.ok) {
        return base;
    }
    if (!/[\u4e00-\u9fa5a-zA-Z]/.test(value)) {
        return { ok: false, reason: '名称需要包含文字' };
    }
    return { ok: true };
}

module.exports = {
    checkText,
    checkName,
};
