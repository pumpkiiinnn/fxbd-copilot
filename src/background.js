chrome.runtime.onInstalled.addListener(() => {
  console.log('自动答题插件已安装');
  
  // 初始化存储
  chrome.storage.local.get('preventingVideoPause', (data) => {
    if (data.preventingVideoPause === undefined) {
      chrome.storage.local.set({ 'preventingVideoPause': false });
    }
  });
  
  // 设置定期检查所有标签页的视频状态
  setPeriodicVideoCheck();
});

// 定期检查所有标签页的视频状态
function setPeriodicVideoCheck() {
  setInterval(() => {
    chrome.storage.local.get('preventingVideoPause', (data) => {
      if (data.preventingVideoPause) {
        alert('防止视频暂停功能已开启');
        // 如果功能已启用，向所有标签页发送消息
        chrome.tabs.query({}, (tabs) => {
          for (const tab of tabs) {
            try {
              // 尝试向所有标签页发送检查视频状态的消息
              chrome.tabs.sendMessage(tab.id, {
                action: "checkVideoStatus"
              }).catch(() => {
                // 忽略错误
              });
            } catch (error) {
              // 忽略错误，继续处理其他标签页
            }
          }
        });
      }
    });
  }, 5000); // 每5秒检查一次
}

chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.create({ url: 'popup.html' });
});

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "toggleVideoPrevent") {
    const enable = message.enable;
    
    // 存储当前状态
    chrome.storage.local.set({ 'preventingVideoPause': enable }, () => {
      console.log(`防止视频暂停功能已${enable ? '开启' : '关闭'}`);
    });
    
    // 向所有匹配的标签页发送消息
    chrome.tabs.query({}, (tabs) => {
      for (const tab of tabs) {
        try {
          // 尝试向所有标签页发送消息
          chrome.tabs.sendMessage(tab.id, {
            action: "preventVideoPause",
            enable: enable
          }).catch(error => {
            // 忽略无法接收消息的标签页错误
            console.log(`标签页 ${tab.id} 未能接收消息，这可能是正常的`);
          });
        } catch (error) {
          // 忽略错误，继续处理其他标签页
        }
      }
    });
    
    sendResponse({ success: true });
    return true; // 表示将异步发送响应
  }
});
