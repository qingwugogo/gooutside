// 云服务客户端：整个应用唯一实例，auth / database / storage 共用。
const { createMiniProgramWorkBuddyCloud } = require('@tencent-ai/workbuddy-cloud-sdk/miniprogram');
const { createDiagnosticWx } = require('./workbuddy-cloud-diagnostics');

const cloud = createMiniProgramWorkBuddyCloud({
    endpoint: 'https://mp-api.app.workbuddy.host',
    publishableKey: 'wbpk_n76H8RKEgiGWzYS0yRyx2x_qN2u4pJtj3PVGUWpW0BpTIcneiXMqto1',
    wx: createDiagnosticWx(wx),
});

module.exports = { cloud };
