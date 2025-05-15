import React, { useState, useEffect } from 'react';
import './style.css';

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  
  return (
    <div className="modal" style={{ display: isOpen ? 'flex' : 'none' }}>
      <div className="modal-content">
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
};

const App = () => {
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [isDonateModalOpen, setIsDonateModalOpen] = useState(false);
  const [isVideoPausePrevented, setIsVideoPausePrevented] = useState(false);
  const [answers, setAnswers] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
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

  const handleAutoAnswerAndSubmit = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        function: injectAndExecute
      });
    });
  };

  const handlePreventVideoPause = () => {
    const newState = !isVideoPausePrevented;
    setIsVideoPausePrevented(newState);
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: "preventVideoPause",
        enable: newState
      });
    });
  };

  return (
    <div className="container">
      <h1>穷学宝典自动答题</h1>
      <div className="subtitle">从此不再为记不住错题而苦恼</div>
      
      <div className="button-group">
        <button onClick={handleAutoAnswerAndSubmit}>
          自动答题并提交
        </button>
        <button 
          id="preventVideoPause"
          className={isVideoPausePrevented ? 'active' : ''}
          onClick={handlePreventVideoPause}
        >
          防止视频暂停
          <span className={`status-indicator ${isVideoPausePrevented ? 'active' : ''}`} />
        </button>
      </div>

      <div className="footer">
        <span>© 2024 by pumpkiiinnnn@gmail.com</span>
        <a href="#" className="footer-link" onClick={() => setIsGuideModalOpen(true)}>
          使用说明
        </a>
        <a href="#" className="footer-link" onClick={() => setIsDonateModalOpen(true)}>
          打赏一下
        </a>
        <a 
          href="https://github.com/pumpkiiinnn/fxbd-copilot" 
          className="footer-link" 
          title="GitHub仓库"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
          </svg>
        </a>
      </div>

      <Modal 
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
        title="使用说明"
      >
        <h4 className="section-title">功能介绍</h4>
        <ul>
          <li><strong>自动答题并提交</strong> - 自动为试题选择答案并提交，系统会记录正确答案用于下次答题</li>
          <li><strong>防止视频暂停</strong> - 开启后可以防止视频自动暂停，保持播放状态</li>
        </ul>
        
        <h4 className="section-title">使用方法</h4>
        <ol>
          <li>进入富学宝典考试页面</li>
          <li>点击"自动答题并提交"按钮，插件将自动完成答题和提交</li>
          <li>前几次答题成绩不合格是正常的，需要多点击"自动答题并提交"几次，直到通过为止</li>
          <li>看视频课程时，可点击"防止视频暂停"按钮，避免系统检测暂停视频</li>
        </ol>
        
        <h4 className="section-title">注意事项</h4>
        <p>本插件仅供学习交流使用，请勿用于商业用途。使用本插件产生的任何后果由用户自行承担。</p>
      </Modal>

      <Modal
        isOpen={isDonateModalOpen}
        onClose={() => setIsDonateModalOpen(false)}
        title="支持开发者"
      >
        <div style={{ textAlign: 'center' }}>
          <p>如果这个插件对你有帮助，欢迎打赏支持开发者持续更新维护～～</p>
          <img src="/assets/donate-qrcode.png" alt="打赏二维码" className="donate-qrcode" />
          <img src="/assets/donate-qrcode2.png" alt="打赏二维码" className="donate-qrcode" />
          <p style={{ color: 'var(--light-text)', fontSize: '0.8rem' }}>扫描上方二维码进行打赏</p>
        </div>
      </Modal>
    </div>
  );
};

export default App;