function autoAnswer() {
  console.log('开始自动答题');
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      function: () => {
        const questions = document.querySelectorAll('.question_warp');
        console.log('Number of questions found:', questions.length);

        if (questions.length === 0) {
          console.log('No questions found on the page');
          return;
        }

        // 使用 chrome.storage.local.get 获取保存的答案
        chrome.storage.local.get('answers', (data) => {
          const savedAnswers = data.answers || {};
          console.log('Saved answers:', savedAnswers);

          questions.forEach((question, index) => {
            console.log(`Processing question ${index + 1}`);
            const questionTitle = question.querySelector('h3');
            if (!questionTitle) {
              console.log(`Question title not found for question ${index + 1}`);
              return;
            }

            const questionText = questionTitle.innerText.replace(/^\d+\.\s*/, '').trim();
            console.log('Question text:', questionText);

            const correctAnswer = savedAnswers[questionText];
            console.log('Correct answer from saved data:', correctAnswer);
            if (correctAnswer) {
                const options = question.querySelectorAll('input[type="radio"], input[type="checkbox"]');
                console.log(`Number of options for question ${index + 1}:`, options.length);
      
                options.forEach((option) => {
                  console.log('Option:', option);
                  console.log('Option.value:', option.value);
                  console.log('===Option.value===');
                  let optionText = option.value ? option.value.trim() : '';
                  console.log('Option text:', optionText);
      
                  if (optionText == '1') {
                    optionText = '正确';
                  }else if(optionText == '0'){
                    optionText = '错误';
                  }
                  
                  console.log('correctAnswer.toLowerCase().trim():', correctAnswer.toLowerCase().trim());
                  console.log('optionText.toLowerCase().trim():', optionText.toLowerCase().trim());
                  
                  const trimmedCorrectAnswer = correctAnswer.trim().toLowerCase();
                  const trimmedOptionText = optionText.trim().toLowerCase();
      
                  if (trimmedCorrectAnswer === trimmedOptionText) {
                    console.log('Ohhhhhhhh!!!');
                    option.checked = true;
                    option.click(); // 确保触发点击事件
                    console.log('Option selected:', optionText);
                  } else if (/^[a-z]+$/.test(trimmedCorrectAnswer) && trimmedCorrectAnswer.length > 1 && trimmedCorrectAnswer.includes(trimmedOptionText)) {
                    console.log('Haahaahaa!!!');
                    option.click(); // 确保触发点击事件
                    option.checked = true;
                   
                    console.log('Option selected:', optionText);
                  }
                });
              } else {
                console.log(`No saved answer for question ${index + 1}, selecting randomly`);
                const options = question.querySelectorAll('input[type="radio"], input[type="checkbox"]');
                if (options.length > 0) {
                  const randomOption = options[Math.floor(Math.random() * options.length)];
                  randomOption.checked = true;
                  randomOption.click(); // 确保触发点击事件
                  console.log('Randomly selected option:', randomOption.parentElement ? randomOption.parentElement.innerText.trim() : '');
                } else {
                  console.log(`No options found for question ${index + 1}`);
                }
              }
          });
        });
      }
    });
  });
}

document.getElementById('autoAnswer').addEventListener('click', autoAnswer);

document.getElementById('submitExam').addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      function: submitExam
    });
  });
});

document.getElementById('viewCount').addEventListener('click', () => {
  // 先尝试从远程数据库获取答案
  fetchAnswersFromRemoteDB()
    .then(remoteAnswers => {
      if (remoteAnswers && Object.keys(remoteAnswers).length > 0) {
        // 显示远程数据库中的答案
        displayAnswers(remoteAnswers, true);
      } else {
        // 如果远程获取失败或为空，从本地获取
        fetchAnswersFromLocalStorage();
      }
    })
    .catch(error => {
      console.error('从远程数据库获取答案失败:', error);
      // 回退到本地存储
      fetchAnswersFromLocalStorage();
    });
});

// 从远程数据库获取答案
function fetchAnswersFromRemoteDB() {
  const apiUrl = 'https://api.example.com/answers';
  
  return fetch(apiUrl, {
    method: 'GET',
    headers: {
      'Authorization': 'Bearer YOUR_API_KEY'
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`API响应错误: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    // 转换为与本地存储相同的格式
    const formattedAnswers = {};
    if (data && Array.isArray(data.answers)) {
      data.answers.forEach(item => {
        formattedAnswers[item.question] = item.answer;
      });
    }
    return formattedAnswers;
  })
  .catch(error => {
    console.error('获取远程答案失败:', error);
    return null;
  });
}

// 从本地存储获取答案
function fetchAnswersFromLocalStorage() {
  chrome.storage.local.get('answers', (data) => {
    const answers = data.answers || {};
    displayAnswers(answers, false);
  });
}

// 显示答案
function displayAnswers(answers, isRemote) {
  const source = isRemote ? '[远程数据库]' : '[本地存储]';
  const answerCount = Object.keys(answers).length;
  const headerText = `${source} 共找到 ${answerCount} 个记录的答案\n\n`;
  
  const answerList = Object.entries(answers)
    .map(([question, answer]) => `${question}: ${answer}`)
    .join('\n');
  
  document.getElementById('answerList').value = headerText + answerList;
}

document.getElementById('clearData').addEventListener('click', () => {
  chrome.storage.local.clear(() => {
    alert('记录已清除');
    document.getElementById('answerList').value = '';
  });
});

document.getElementById('searchBox').addEventListener('input', () => {
  const searchTerm = document.getElementById('searchBox').value.toLowerCase();
  chrome.storage.local.get('answers', (data) => {
    const answers = data.answers || {};
    const filteredAnswers = Object.entries(answers)
      .filter(([question]) => question.toLowerCase().includes(searchTerm))
      .map(([question, answer]) => `${question}: ${answer}`)
      .join('\n');
    document.getElementById('answerList').value = filteredAnswers;
  });
});

document.getElementById('autoAnswerAndSubmit').addEventListener('click', () => {
  console.log('自动答题并提交按钮被点击');
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      function: injectAndExecute
    }).then(() => {
      console.log('injectAndExecute 脚本已执行');
    }).catch((error) => {
      console.error('执行 injectAndExecute 时出错:', error);
    });
  });
});

document.getElementById('preventVideoPause').addEventListener('click', () => {
  console.log('防止视频暂停按钮被点击');
  
  // 获取当前状态并切换
  chrome.storage.local.get('preventingVideoPause', (data) => {
    const isPreventing = data.preventingVideoPause || false;
    const newState = !isPreventing;
    
    // 向后台发送消息，切换状态
    chrome.runtime.sendMessage({
      action: "toggleVideoPrevent",
      enable: newState
    }, (response) => {
      if (response && response.success) {
        console.log(`防止视频暂停功能已${newState ? '开启' : '关闭'}`);
        
        // 更新按钮状态
        chrome.storage.local.set({ 'preventingVideoPause': newState }, () => {
          const message = newState ? '已开启防止视频暂停功能' : '已关闭防止视频暂停功能';
          // alert(message);
        });
      } else {
        console.error('切换防止视频暂停功能失败');
      }
    });
  });
});

// 模态框相关函数
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'flex';
    // 设置body高度为500px
    document.body.style.height = '500px';
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'none';
    // 恢复body原始高度
    document.body.style.removeProperty('height');
  }
}

// 使用说明按钮点击事件
document.getElementById('useGuide').addEventListener('click', (e) => {
  e.preventDefault();
  openModal('guideModal');
});

// 打赏按钮点击事件
document.getElementById('donate').addEventListener('click', (e) => {
  e.preventDefault();
  openModal('donateModal');
});

// GitHub仓库链接点击事件
document.querySelector('a[href*="github.com"]').addEventListener('click', (e) => {
  e.preventDefault();
  // 获取链接地址
  const githubUrl = e.currentTarget.getAttribute('href');
  // 在新标签页中打开GitHub仓库
  chrome.tabs.create({ url: githubUrl });
});

// 关闭按钮点击事件
document.getElementById('closeGuideModal').addEventListener('click', () => {
  closeModal('guideModal');
});

document.getElementById('closeDonateModal').addEventListener('click', () => {
  closeModal('donateModal');
});

// 点击模态框外部关闭模态框
window.addEventListener('click', (e) => {
  const guideModal = document.getElementById('guideModal');
  const donateModal = document.getElementById('donateModal');
  
  if (e.target === guideModal) {
    closeModal('guideModal');
  }
  
  if (e.target === donateModal) {
    closeModal('donateModal');
  }
});

// 页面加载时检查防止视频暂停功能的状态并更新UI
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get('preventingVideoPause', (data) => {
    const isPreventing = data.preventingVideoPause || false;
    const videoPauseButton = document.getElementById('preventVideoPause');
    const statusIndicator = videoPauseButton.querySelector('.status-indicator');
    
    if (isPreventing) {
      videoPauseButton.classList.add('active');
      statusIndicator.classList.add('active');
    } else {
      videoPauseButton.classList.remove('active');
      statusIndicator.classList.remove('active');
    }
  });
});

// 监听存储变化，更新UI
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.preventingVideoPause) {
    const isPreventing = changes.preventingVideoPause.newValue;
    const videoPauseButton = document.getElementById('preventVideoPause');
    const statusIndicator = videoPauseButton.querySelector('.status-indicator');
    
    if (isPreventing) {
      videoPauseButton.classList.add('active');
      statusIndicator.classList.add('active');
    } else {
      videoPauseButton.classList.remove('active');
      statusIndicator.classList.remove('active');
    }
  }
});

function injectAndExecute() {
  // 注入所有需要的函数
  function autoAnswer() {
    console.log('开始自动答题');
    const questions = document.querySelectorAll('.question_warp');
    console.log('Number of questions found:', questions.length);

    if (questions.length === 0) {
      console.log('No questions found on the page');
      return;
    }

    chrome.storage.local.get('answers', (data) => {
      const savedAnswers = data.answers || {};
      console.log('Saved answers:', savedAnswers);

      questions.forEach((question, index) => {
        console.log(`Processing question ${index + 1}`);
        const questionTitle = question.querySelector('h3');
        if (!questionTitle) {
          console.log(`Question title not found for question ${index + 1}`);
          return;
        }

        const questionText = questionTitle.innerText.replace(/^\d+\.\s*/, '').trim(); // 去掉序号并去除空格
        console.log('Question text:', questionText);

        const correctAnswer = savedAnswers[questionText];
        console.log('Correct answer from saved data:', correctAnswer);

        if (correctAnswer) {
          const options = question.querySelectorAll('input[type="radio"], input[type="checkbox"]');
          console.log(`Number of options for question ${index + 1}:`, options.length);

          options.forEach((option) => {
            console.log('Option:', option);
            console.log('Option.value:', option.value);
            console.log('===Option.value===');
            let optionText = option.value ? option.value.trim() : '';
            console.log('Option text:', optionText);

            if (optionText == '1') {
              optionText = '正确';
            }else if(optionText == '0'){
              optionText = '错误';
            }
            
            console.log('correctAnswer.toLowerCase().trim():', correctAnswer.toLowerCase().trim());
            console.log('optionText.toLowerCase().trim():', optionText.toLowerCase().trim());
            
            const trimmedCorrectAnswer = correctAnswer.trim().toLowerCase();
            const trimmedOptionText = optionText.trim().toLowerCase();

            if (trimmedCorrectAnswer === trimmedOptionText) {
              console.log('Ohhhhhhhh!!!');
              option.checked = true;
              option.click(); // 确保触发点击事件
              console.log('Option selected:', optionText);
            } else if (/^[a-z]+$/.test(trimmedCorrectAnswer) && trimmedCorrectAnswer.length > 1 && trimmedCorrectAnswer.includes(trimmedOptionText)) {
              console.log('Haahaahaa!!!');
              option.click(); // 确保触发点击事件
              option.checked = true;
             
              console.log('Option selected:', optionText);
            }
          });
        } else {
          console.log(`No saved answer for question ${index + 1}, selecting randomly`);
          const options = question.querySelectorAll('input[type="radio"], input[type="checkbox"]');
          if (options.length > 0) {
            const randomOption = options[Math.floor(Math.random() * options.length)];
            randomOption.checked = true;
            randomOption.click(); // 确保触发点击事件
            console.log('Randomly selected option:', randomOption.parentElement ? randomOption.parentElement.innerText.trim() : '');
          } else {
            console.log(`No options found for question ${index + 1}`);
          }
        }
      });
    });
  }

  function submitExam() {
    console.log('开始提交答卷');
    const submitButton = document.querySelector('button[onclick="tijiao()"]');
    if (submitButton) {
      submitButton.click();
      console.log('点击了提交按钮');
      
      // 等待确认对话框出现
      setTimeout(() => {
        const confirmButton = document.querySelector('.layui-layer-btn0');
        if (confirmButton) {
          confirmButton.click();
          console.log('点击了确认按钮');
        } else {
          console.log('未找到确认按钮');
        }
      }, 1000); // 等待1秒，确保对话框已经出现
    } else {
      console.log('未找到提交按钮');
    }
  }

  function autoAnswerAndSubmit() {
    console.log('autoAnswerAndSubmit 函数开始执行');
    let retryCount = 0;
    const maxRetries = 5; // 最大重试次数

    function retry() {
      console.log(`开始第 ${retryCount + 1} 次尝试`);
      if (retryCount >= maxRetries) {
        console.log('达到最大重试次数，停止重试');
        return;
      }

      console.log('开始自动答题');
      autoAnswer();

      console.log('等待 2 秒后提交答卷');
      setTimeout(() => {
        console.log('开始提交答卷');
        submitExam();

        console.log('等待 7 秒检查结果'); // 增加等待时间
        setTimeout(() => {
          const resultElement = document.querySelector('.exam_result strong');
          if (resultElement) {
            const score = parseInt(resultElement.textContent);
            console.log('考试得分：', score);
            if (score >= 80) {
              console.log('考试通过！');
            } else {
              console.log('考试未通过，准备重试...');
              retryCount++;
              setTimeout(retry, 2000);
            }
          } else {
            console.log('未找到考试结果，可能提交失败，准备重试...');
            retryCount++;
            setTimeout(retry, 2000);
          }
        }, 7000); // 增加等待时间到7秒
      }, 2000);
    }

    retry();
  }

  // 执行自动答题并提交
  autoAnswerAndSubmit();
}
