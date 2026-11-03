// 业务数据层：游乐场 / 评价 / 图片上传与签名。
const { cloud } = require('./cloud');
const { mimeOfPath } = require('./util');

// 附近游乐场（按距离排序，最多 300 条）
async function fetchNearby(lat, lng) {
    return cloud.database.rpc('playgrounds_near', { p_lat: lat, p_lng: lng });
}

async function fetchPlayground(id) {
    return cloud.database.from('playground').select('*').eq('id', id).maybeSingle();
}

async function fetchReviews(playgroundId) {
    return cloud.database
        .from('review')
        .select('*')
        .eq('playground_id', playgroundId)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(100);
}

async function createReview(payload) {
    return cloud.database.from('review').insert(payload).select();
}

async function createPlayground(payload) {
    return cloud.database.from('playground').insert(payload).select();
}

// 我分享的游乐场（带评分聚合）
async function fetchMyPlaygrounds(ownerId) {
    return cloud.database
        .from('playground')
        .select('*, review(rating)')
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false })
        .limit(50);
}

// 我写过的评价（联出游乐场名称）
async function fetchMyReviews(ownerId) {
    return cloud.database
        .from('review')
        .select('*, playground(id, name)')
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false })
        .limit(50);
}

// 上传一张照片到共享目录，返回 object path
async function uploadPhoto(ownerId, kind, tempFilePath) {
    const fs = wx.getFileSystemManager();
    const buffer = fs.readFileSync(tempFilePath);
    const suffix = Date.now() + '-' + Math.floor(Math.random() * 100000);
    const match = /\.([a-zA-Z0-9]+)$/.exec(tempFilePath || '');
    const ext = match ? match[1].toLowerCase() : 'jpg';
    const path = cloud.storage.sharedPath(ownerId, `${kind}/${suffix}.${ext}`);
    const uploaded = await cloud.storage.upload(path, buffer, {
        contentType: mimeOfPath(tempFilePath),
    });
    if (uploaded.error) {
        return { data: null, error: uploaded.error };
    }
    return { data: { path }, error: null };
}

// 批量上传照片：单张失败自动重试一次，仍失败则跳过，不中断整体提交
async function uploadPhotos(ownerId, kind, tempPaths, onProgress) {
    const paths = [];
    let failed = 0;
    for (let i = 0; i < tempPaths.length; i++) {
        if (onProgress) onProgress(i, tempPaths.length);
        let res = await uploadPhoto(ownerId, kind, tempPaths[i]);
        if (res.error) {
            res = await uploadPhoto(ownerId, kind, tempPaths[i]);
        }
        if (res.error) {
            failed++;
        } else {
            paths.push(res.data.path);
        }
    }
    return { paths, failed };
}

// 为一组照片生成带签名的访问链接（需要已登录）
async function signPhotoMap(paths) {
    if (!paths || paths.length === 0) {
        return { map: {}, error: null };
    }
    const res = await cloud.storage.createSignedUrls(paths, 3600);
    if (res.error) {
        return { map: {}, error: res.error };
    }
    const map = {};
    (res.data || []).forEach((item) => {
        if (item && item.path) {
            const url = item.signedUrl || item.signedURL;
            if (url) map[item.path] = url;
        }
    });
    return { map, error: null };
}

// ===== 举报与删除（合规相关）=====

// 举报一条内容：同一用户对同一内容只能举报一次（数据库唯一索引兜底）
async function createReport(targetType, targetId, reason, detail) {
    return cloud.database.from('report').insert({
        target_type: targetType,
        target_id: Number(targetId),
        reason: reason,
        detail: detail || null,
    }).select();
}

// 删除存储里的照片，失败不阻断主流程
async function removePhotos(paths) {
    if (!paths || !paths.length) return;
    try {
        await cloud.storage.remove(paths);
    } catch (error) {
        console.warn('[api] remove photos failed', JSON.stringify({ count: paths.length }));
    }
}

async function deletePlayground(id, photoPaths) {
    const res = await cloud.database.from('playground').delete().eq('id', Number(id));
    if (!res.error) {
        await removePhotos(photoPaths || []);
    }
    return res;
}

async function deleteReview(id, photoPaths) {
    const res = await cloud.database.from('review').delete().eq('id', Number(id));
    if (!res.error) {
        await removePhotos(photoPaths || []);
    }
    return res;
}

// 删除当前用户的全部内容与图片（账号层面的“删除我的数据”）
async function deleteMyData(ownerId) {
    const [pgRes, rvRes] = await Promise.all([
        cloud.database.from('playground').select('id, photo_paths').eq('owner_id', ownerId).limit(500),
        cloud.database.from('review').select('id, photo_paths').eq('owner_id', ownerId).limit(500),
    ]);
    const photos = [];
    (pgRes.data || []).forEach((row) => photos.push(...(row.photo_paths || [])));
    (rvRes.data || []).forEach((row) => photos.push(...(row.photo_paths || [])));

    const results = await Promise.all([
        cloud.database.from('playground').delete().eq('owner_id', ownerId),
        cloud.database.from('review').delete().eq('owner_id', ownerId),
    ]);
    const failed = results.find((r) => r && r.error);
    if (failed) {
        return { error: failed.error, removedPhotos: 0 };
    }
    await removePhotos(photos);
    return {
        error: null,
        removedPhotos: photos.length,
        removedPlaygrounds: (pgRes.data || []).length,
        removedReviews: (rvRes.data || []).length,
    };
}

module.exports = {
    fetchNearby,
    fetchPlayground,
    fetchReviews,
    createReview,
    createPlayground,
    fetchMyPlaygrounds,
    fetchMyReviews,
    uploadPhoto,
    uploadPhotos,
    signPhotoMap,
    createReport,
    deletePlayground,
    deleteReview,
    deleteMyData,
};
