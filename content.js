// content.js - 穷学宝典自动答题插件的内容脚本

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "preventVideoPause") {
    handleVideoControl(request.enable);
    sendResponse({ success: true });
  }
});

// 存储原始的视频方法
let originalPauseMethods = new Map();
let videoPlaybackInterval = null;

// 处理视频控制
function handleVideoControl(enable) {
  if (enable) {
    enableVideoPlayback();
  } else {
    disableVideoPlayback();
  }
}

// 启用视频持续播放
function enableVideoPlayback() {
  // console.log("启用视频持续播放功能");
  
  // 立即处理当前页面上的所有视频
  processVideos();
  
  // 设置定期检查视频的间隔
  videoPlaybackInterval = setInterval(processVideos, 3000);
  
  // 监听DOM变化，处理新添加的视频
  setupMutationObserver();
  
  // 防止页面卸载
  window.addEventListener("beforeunload", preventUnload);
}

// 禁用视频持续播放
function disableVideoPlayback() {
  // console.log("禁用视频持续播放功能");
  
  // 清除定期检查视频的间隔
  if (videoPlaybackInterval) {
    clearInterval(videoPlaybackInterval);
    videoPlaybackInterval = null;
  }
  
  // 恢复所有视频的原始方法
  restoreOriginalMethods();
  
  // 移除页面卸载监听
  window.removeEventListener("beforeunload", preventUnload);
  
  // 移除DOM变化监听
  if (window._videoObserver) {
    window._videoObserver.disconnect();
    delete window._videoObserver;
  }
}

// 处理视频元素
function processVideos() {
  const videos = document.getElementsByTagName("video");
  if (videos.length > 0) {
    // console.log(`找到 ${videos.length} 个视频元素`);
    
    for (let video of videos) {
      // 保存原始方法
      if (!originalPauseMethods.has(video)) {
        originalPauseMethods.set(video, {
          pause: video.pause,
          paused: video.paused
        });
        
        // 重写pause方法
        video.pause = function() {
          console.log("视频暂停被阻止");
          return false;
        };
      }
      
      // 如果视频暂停了，强制播放
      if (video.paused) {
        try {
          video.play().catch(e => {
            console.warn("视频播放失败:", e);
          });
        } catch (e) {
          console.warn("尝试播放视频时出错:", e);
        }
      }
      
      // 其他设置
      video.muted = true; // 静音播放
    }
    
    // 处理视频设置
    processVideoSettings();
    
    // 隐藏账号信息
    hideUserInfo();
  }
}

// 处理视频设置（清晰度和倍速）
function processVideoSettings() {
  // 设置清晰度为高清
  const qualitySelects = document.getElementsByTagName("select");
  if (qualitySelects.length > 0) {
    const select = qualitySelects[0];
    select.autocomplete = "off";
    for (let i = 0; i < select.options.length; i++) {
      if (select.options[i].value === "hd") {
        select.options[i].selected = true;
        break;
      }
    }
  }
  
  // 设置倍速
  if (qualitySelects.length > 1) {
    const speedSelect = qualitySelects[1];
    speedSelect.autocomplete = "off";
    
    // 使用用户的默认设置或者使用1.0倍速
    const rate = 1.0;
    
    // 设置倍速
    for (let i = 0; i < speedSelect.options.length; i++) {
      if (speedSelect.options[i].value === "volvo") { // 1.0倍速
        speedSelect.options[i].selected = true;
        break;
      }
    }
    
    // 应用到视频
    const videos = document.getElementsByTagName("video");
    for (let video of videos) {
      video.playbackRate = rate;
    }
  }
}

// 隐藏账号信息
function hideUserInfo() {
  if (document.getElementsByClassName("vjs-userName").length > 0) {
    const userNameElements = document.getElementsByClassName("vjs-userName");
    for (let element of userNameElements) {
      element.style.display = "none";
      element.style.visibility = "hidden";
      element.innerText = "";
    }
  }
}

// 恢复原始方法
function restoreOriginalMethods() {
  for (const [video, methods] of originalPauseMethods.entries()) {
    if (video) {
      video.pause = methods.pause;
    }
  }
  originalPauseMethods.clear();
}

// 设置DOM变化监听
function setupMutationObserver() {
  if (!window._videoObserver) {
    window._videoObserver = new MutationObserver((mutations) => {
      let needsProcess = false;
      
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          for (const node of mutation.addedNodes) {
            // 检查是否添加了视频元素
            if (node.nodeName === "VIDEO") {
              needsProcess = true;
              break;
            }
            
            // 检查添加的节点内部是否包含视频元素
            if (node.getElementsByTagName) {
              const videos = node.getElementsByTagName("video");
              if (videos.length > 0) {
                needsProcess = true;
                break;
              }
            }
          }
          
          if (needsProcess) {
            break;
          }
        }
      }
      
      if (needsProcess) {
        processVideos();
      }
    });
    
    window._videoObserver.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }
}

// 防止页面卸载
function preventUnload(e) {
  // 显示确认对话框
  e.preventDefault();
  e.returnValue = "视频正在播放中，确定要离开吗？";
  return e.returnValue;
}

// 记录答案的自执行函数 - 移到文件最后，确保所有函数已定义
(function() {
  // 检查当前域名是否为 iedu.foxconn.com
  if (window.location.hostname !== 'iedu.foxconn.com') {
    console.log('Not on iedu.foxconn.com, script will not run.');
    return;
  }

  // 原有的答案记录功能
  const questions = document.querySelectorAll('.question_warp');
  const newAnswers = {};
  const answersArray = [];

  function recordAnswers() {
    questions.forEach((question) => {
      const questionText = question.querySelector('h3').innerText.replace(/^\d+\.\s*/, '').trim();
      const correctAnswer = question.querySelector('.answer strong').innerText.trim();
      newAnswers[questionText] = correctAnswer;
      
      // 为数据库准备的数据结构
      answersArray.push({
        question: questionText,
        answer: correctAnswer,
        timestamp: new Date().toISOString(),
        source: document.location.href
      });
    });

    // 先尝试远程数据库存储
    saveToRemoteDatabase(answersArray)
      .then(success => {
        console.log('远程数据库存储状态:', success ? '成功' : '失败');
        
        // 无论远程存储成功与否，都保存到本地作为备份
        saveToLocalStorage(newAnswers);
      })
      .catch(error => {
        console.error('远程数据库存储错误:', error);
        // 远程存储失败，使用本地存储
        saveToLocalStorage(newAnswers);
      });
  }

  // 保存到远程数据库
  function saveToRemoteDatabase(answersArray) {
    // 远程API地址 - 实际使用时需替换为您的API地址
    const apiUrl = 'https://api.example.com/answers';
    
    return fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_API_KEY' // 实际使用时需替换为您的API密钥
      },
      body: JSON.stringify({
        answers: answersArray
      })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`API响应错误: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      console.log('答案已保存到远程数据库', data);
      return true;
    })
    .catch(error => {
      console.error('保存到远程数据库失败:', error);
      return false;
    });
  }

  // 保存到本地存储
  function saveToLocalStorage(newAnswers) {
    chrome.storage.local.get('answers', (data) => {
      const savedAnswers = data.answers || {};
      const updatedAnswers = { ...savedAnswers, ...newAnswers };

      chrome.storage.local.set({ answers: updatedAnswers }, () => {
        console.log('答案已更新到本地存储:', updatedAnswers);
      });
    });
  }

  if (document.querySelector('.exam_result')) {
    recordAnswers();
  }

  // 检查存储，看是否应该自动启用防止视频暂停
  chrome.storage.local.get('preventingVideoPause', (data) => {
    if (data.preventingVideoPause) {
      // console.log("自执行函数中自动启用视频持续播放功能");
      
      // 在页面加载完成后执行
      if (document.readyState === 'complete') {
        enableVideoPlayback();
      } else {
        window.addEventListener('load', enableVideoPlayback);
      }
    }
  });
})();
