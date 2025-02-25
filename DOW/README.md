# Instagram Downloader API

這是一個用於下載Instagram照片和影片的API服務。

## 功能

- 下載Instagram帖子中的照片和影片
- 支持單張照片、多張照片集合和影片
- 提供RESTful API接口

## API使用方法

### 下載媒體

**請求:**

POST /download
Content-Type: application/json
{
"url": "https://www.instagram.com/p/example-post-id/"
}

**響應:**

```json
{
  "success": true,
  "mediaUrls": [
    "https://scontent.cdninstagram.com/example-image.jpg",
    "https://scontent.cdninstagram.com/example-video.mp4"
  ]
}
```

## 部署

此API使用Render.com部署。