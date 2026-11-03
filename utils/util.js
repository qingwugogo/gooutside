// 通用工具：距离格式化、时间格式化、星级展示、图片类型。

const DISTANCE_OPTIONS = [
    { key: '500', label: '500m', value: 500 },
    { key: '1000', label: '1km', value: 1000 },
    { key: '2000', label: '2km', value: 2000 },
    { key: '5000', label: '5km', value: 5000 },
    { key: '10000', label: '10km', value: 10000 },
    { key: '20000', label: '20km', value: 20000 },
    { key: 'all', label: '全部', value: 0 },
];

const TAG_OPTIONS = [
    '滑梯', '秋千', '沙池', '攀爬架', '跷跷板', '摇摇乐',
    '有遮阳', '有卫生间', '有停车位', '适合幼儿', '适合大童', '塑胶地面',
];

function formatDistance(meters) {
    if (meters === null || meters === undefined || isNaN(meters)) {
        return '';
    }
    if (meters < 1000) {
        return Math.round(meters) + 'm';
    }
    if (meters < 10000) {
        return (meters / 1000).toFixed(1) + 'km';
    }
    return Math.round(meters / 1000) + 'km';
}

function pad(n) {
    return n < 10 ? '0' + n : '' + n;
}

function formatDate(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '';
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

// avg: 数据库返回的评分（可能为字符串）
function starsOf(avg) {
    const value = Math.round(Number(avg) || 0);
    const clamped = Math.max(0, Math.min(5, value));
    return '★★★★★'.slice(0, clamped) + '☆☆☆☆☆'.slice(0, 5 - clamped);
}

const EXT_MIME = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    heic: 'image/heic',
};

function mimeOfPath(path) {
    const match = /\.([a-zA-Z0-9]+)$/.exec(path || '');
    const ext = match ? match[1].toLowerCase() : 'jpg';
    return EXT_MIME[ext] || 'image/jpeg';
}

module.exports = {
    DISTANCE_OPTIONS,
    TAG_OPTIONS,
    formatDistance,
    formatDate,
    starsOf,
    mimeOfPath,
};
