const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const PORT = process.env.PORT || 3000;

// 啟用CORS
app.use(cors());
app.use(express.json());

// Instagram下載API端點
app.post('/download', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url || !url.includes('instagram.com')) {
      return res.status(400).json({ success: false, error: '無效的Instagram URL' });
    }
    
    // 獲取Instagram頁面內容
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    const html = response.data;
    const $ = cheerio.load(html);
    
    // 尋找共享數據腳本
    let sharedData = null;
    $('script').each((i, script) => {
      const content = $(script).html();
      if (content && content.includes('window._sharedData')) {
        const match = content.match(/window\._sharedData\s*=\s*({.+?});/);
        if (match && match[1]) {
          try {
            sharedData = JSON.parse(match[1]);
          } catch (e) {
            console.error('解析共享數據時出錯:', e);
          }
        }
      }
    });
    
    // 尋找額外數據腳本
    let additionalData = null;
    $('script[type="text/javascript"]').each((i, script) => {
      const content = $(script).html();
      if (content && content.includes('window.__additionalDataLoaded')) {
        const match = content.match(/window\.__additionalDataLoaded\s*\(\s*['"][^'"]+['"]\s*,\s*({.+?})\s*\);/);
        if (match && match[1]) {
          try {
            additionalData = JSON.parse(match[1]);
          } catch (e) {
            console.error('解析額外數據時出錯:', e);
          }
        }
      }
    });
    
    // 從數據中提取媒體URL
    const mediaUrls = extractMediaUrls(sharedData, additionalData);
    
    if (mediaUrls.length === 0) {
      return res.status(404).json({ success: false, error: '未找到媒體URL' });
    }
    
    return res.json({ success: true, mediaUrls });
  } catch (error) {
    console.error('處理下載請求時出錯:', error);
    return res.status(500).json({ success: false, error: '伺服器處理請求時出錯' });
  }
});

/**
 * 從Instagram數據中提取媒體URL
 * @param {Object} sharedData 共享數據
 * @param {Object} additionalData 額外數據
 * @returns {Array} 媒體URL數組
 */
function extractMediaUrls(sharedData, additionalData) {
  const mediaUrls = [];
  
  // 從共享數據中提取
  if (sharedData && sharedData.entry_data) {
    // 處理帖子頁面
    if (sharedData.entry_data.PostPage && sharedData.entry_data.PostPage.length > 0) {
      const post = sharedData.entry_data.PostPage[0].graphql.shortcode_media;
      extractMediaFromPost(post, mediaUrls);
    }
    
    // 處理個人資料頁面
    if (sharedData.entry_data.ProfilePage && sharedData.entry_data.ProfilePage.length > 0) {
      const edges = sharedData.entry_data.ProfilePage[0].graphql.user.edge_owner_to_timeline_media.edges;
      edges.forEach(edge => {
        extractMediaFromPost(edge.node, mediaUrls);
      });
    }
  }
  
  // 從額外數據中提取
  if (additionalData && additionalData.graphql) {
    extractMediaFromPost(additionalData.graphql.shortcode_media, mediaUrls);
  }
  
  return mediaUrls;
}

/**
 * 從帖子數據中提取媒體URL
 * @param {Object} post 帖子數據
 * @param {Array} mediaUrls 媒體URL數組
 */
function extractMediaFromPost(post, mediaUrls) {
  if (!post) return;
  
  // 檢查是否是影片
  if (post.is_video && post.video_url) {
    mediaUrls.push(post.video_url);
  } 
  // 檢查是否有圖片URL
  else if (post.display_url) {
    mediaUrls.push(post.display_url);
  }
  
  // 檢查是否是多媒體帖子
  if (post.edge_sidecar_to_children && post.edge_sidecar_to_children.edges) {
    post.edge_sidecar_to_children.edges.forEach(edge => {
      if (edge.node.is_video && edge.node.video_url) {
        mediaUrls.push(edge.node.video_url);
      } else if (edge.node.display_url) {
        mediaUrls.push(edge.node.display_url);
      }
    });
  }
}

// 添加一個簡單的健康檢查端點
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Instagram Downloader API is running' });
});

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`伺服器運行在端口 ${PORT}`);
});