document.addEventListener('DOMContentLoaded', () => {
    // ブラウザ情報のログ出力
    console.log('ブラウザ情報:', {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        vendor: navigator.vendor
    });
    
    // DOM要素の取得
    const originalVideo = document.getElementById('original');
    const delayedVideo = document.getElementById('delayed');
    const delaySlider = document.getElementById('delay-slider');
    const delayValue = document.getElementById('delay-value');
    const startBtn = document.getElementById('start-btn');
    const stopBtn = document.getElementById('stop-btn');
    const statusElement = document.getElementById('status');
    const cameraSelect = document.getElementById('camera-select');
    const refreshCamerasBtn = document.getElementById('refresh-cameras-btn');

    // キャンバスとコンテキストの作成
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // 変数の初期化
    let mediaStream = null;
    let frameBuffer = [];
    let animationId = null;
    let lastDrawTime = 0;
    let delaySeconds = 1.0; // デフォルト遅延時間
    let cameraDevices = []; // カメラデバイスのリスト
    let isStreamStarted = false; // ストリームが開始されているかのフラグ

    // ステータスメッセージの更新
    function updateStatus(message) {
        statusElement.textContent = message;
    }

    // 遅延スライダーの更新
    delaySlider.addEventListener('input', () => {
        delaySeconds = delaySlider.value / 10;
        delayValue.textContent = `${delaySeconds.toFixed(1)}秒`;
    });
    
    // 初期値の設定
    delayValue.textContent = `${delaySeconds.toFixed(1)}秒`;

    // 使用可能なカメラデバイスを取得
    async function getAvailableCameras() {
        try {
            updateStatus('カメラデバイスを検索中...');
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            
            // カメラ選択肢をクリア
            cameraSelect.innerHTML = '';
            cameraDevices = videoDevices;
            
            if (videoDevices.length > 0) {
                videoDevices.forEach((device, index) => {
                    const option = document.createElement('option');
                    option.value = device.deviceId;
                    option.text = device.label || `カメラ ${index + 1}`;
                    cameraSelect.appendChild(option);
                });
                
                cameraSelect.disabled = false;
                updateStatus(`${videoDevices.length}台のカメラが見つかりました。カメラを選択して「開始」をクリックしてください。`);
            } else {
                const option = document.createElement('option');
                option.value = '';
                option.text = 'カメラが見つかりません';
                cameraSelect.appendChild(option);
                
                cameraSelect.disabled = true;
                updateStatus('カメラデバイスが見つかりません。カメラの接続を確認してください。');
            }
        } catch (error) {
            console.error('カメラデバイスの取得に失敗しました:', error);
            updateStatus('カメラデバイスの取得に失敗しました。ブラウザの権限設定を確認してください。');
        }
    }

    // カメラ選択を更新
    refreshCamerasBtn.addEventListener('click', async () => {
        if (isStreamStarted) {
            // ストリームが開始されている場合は一旦停止
            stopStreaming();
        }
        
        await getAvailableCameras();
    });

    // カメラへのアクセスとストリームの開始
    startBtn.addEventListener('click', async () => {
        if (isStreamStarted) {
            stopStreaming();
            return;
        }
        
        try {
            updateStatus('カメラへのアクセスを要求中...');
            
            // 選択されたカメラデバイスの取得
            const constraints = {
                video: cameraSelect.value ? 
                    { deviceId: { exact: cameraSelect.value } } : 
                    true,
                audio: false
            };
            
            // カメラへのアクセス
            mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
            
            // 使用可能なカメラのラベルを取得するために権限を取得した場合、
            // 選択肢を更新する
            if (!cameraDevices.some(device => device.label)) {
                await getAvailableCameras();
                
                // 現在のデバイスIDを選択
                const trackSettings = mediaStream.getVideoTracks()[0].getSettings();
                if (trackSettings.deviceId) {
                    cameraSelect.value = trackSettings.deviceId;
                }
            }
            
            updateStatus('カメラにアクセスしました。映像のロード中...');
            
            // オリジナルビデオにカメラ映像を設定
            originalVideo.srcObject = mediaStream;
            
            // ビデオがロードされたときの処理
            originalVideo.onloadedmetadata = () => {
                console.log('ビデオメタデータがロードされました');
                updateStatus('映像のロードが完了しました。');
                
                // キャンバスサイズの設定
                canvas.width = originalVideo.videoWidth || 640;
                canvas.height = originalVideo.videoHeight || 480;
                
                // 遅延ビデオの設定
                delayedVideo.width = canvas.width;
                delayedVideo.height = canvas.height;
                
                // フレームバッファをクリア
                frameBuffer = [];
                
                // 描画ループの開始
                startDrawing();
                
                // ボタンの状態更新
                startBtn.disabled = false;
                stopBtn.disabled = false;
                startBtn.textContent = '停止';
                isStreamStarted = true;
            };
            
            // ビデオの再生開始
            originalVideo.play().catch(e => {
                console.error('ビデオの再生開始に失敗しました:', e);
                updateStatus('ビデオの再生開始に失敗しました。再読み込みして再試行してください。');
            });
            
        } catch (error) {
            console.error('カメラへのアクセスに失敗しました:', error);
            updateStatus('カメラへのアクセスに失敗しました。カメラの権限を確認してください。');
            alert('カメラへのアクセスに失敗しました。カメラの権限を確認してください。');
        }
    });

    // ストリームの停止
    stopBtn.addEventListener('click', () => {
        stopStreaming();
    });

    // 描画ループの開始
    function startDrawing() {
        console.log('描画ループを開始します');
        updateStatus(`${delaySeconds.toFixed(1)}秒の遅延で映像を表示しています。`);
        lastDrawTime = performance.now();
        animationId = requestAnimationFrame(drawDelayedFrame);
    }

    // 遅延フレームの描画
    function drawDelayedFrame(timestamp) {
        // 次のフレームを要求
        animationId = requestAnimationFrame(drawDelayedFrame);
        
        // 前回の描画から16ms（約60FPS）以上経過していることを確認
        if (timestamp - lastDrawTime < 16) return;
        
        lastDrawTime = timestamp;
        
        // ビデオが再生可能な状態か確認
        if (originalVideo.readyState >= 2) {
            try {
                // 現在のフレームをキャプチャ
                ctx.drawImage(originalVideo, 0, 0, canvas.width, canvas.height);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                
                // フレームをタイムスタンプと共にバッファに保存
                frameBuffer.push({
                    imageData: imageData,
                    timestamp: timestamp
                });
                
                // バッファが大きくなりすぎないようにする（メモリ節約）
                while (frameBuffer.length > 300) {
                    frameBuffer.shift();
                }
                
                // 遅延時間（ミリ秒）
                const delayMs = delaySeconds * 1000;
                
                // 表示すべきフレームを探す
                const targetTimestamp = timestamp - delayMs;
                let frameToShow = null;
                
                // バッファをクリーンアップしながら適切なフレームを探す
                for (let i = 0; i < frameBuffer.length; i++) {
                    if (frameBuffer[i].timestamp >= targetTimestamp) {
                        frameToShow = frameBuffer[i];
                        break;
                    }
                    
                    if (i === frameBuffer.length - 1) {
                        frameToShow = frameBuffer[i];
                    }
                }
                
                // 適切なフレームがあれば表示
                if (frameToShow) {
                    ctx.putImageData(frameToShow.imageData, 0, 0);
                    
                    // キャンバスからビデオストリームに変換
                    if (!delayedVideo.srcObject) {
                        delayedVideo.srcObject = canvas.captureStream();
                    }
                }
            } catch (error) {
                console.error('フレーム描画中にエラーが発生しました:', error);
                updateStatus('映像の描画中にエラーが発生しました。再読み込みして再試行してください。');
            }
        }
    }

    // ストリーミングの停止
    function stopStreaming() {
        if (mediaStream) {
            mediaStream.getTracks().forEach(track => track.stop());
            mediaStream = null;
        }
        
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        
        originalVideo.srcObject = null;
        delayedVideo.srcObject = null;
        frameBuffer = [];
        
        startBtn.disabled = false;
        stopBtn.disabled = true;
        startBtn.textContent = '開始';
        isStreamStarted = false;
        
        updateStatus('映像の表示を停止しました。「開始」ボタンを押すと再開します。');
    }

    // 遅延時間を設定する関数
    function setDelay(seconds) {
        // 値の範囲を0.0～5.0秒に制限
        seconds = Math.max(0, Math.min(5, seconds));
        delaySeconds = seconds;
        delaySlider.value = seconds * 10;
        delayValue.textContent = `${seconds.toFixed(1)}秒`;
        
        console.log(`遅延時間を${seconds.toFixed(1)}秒に設定しました`);
        
        if (isStreamStarted) {
            updateStatus(`${seconds.toFixed(1)}秒の遅延で映像を表示しています。`);
        }
    }

    // キーボードショートカットの処理
    document.addEventListener('keydown', (event) => {
        console.log('キーが押されました:', event.key, 'Shiftキー:', event.shiftKey);
        
        // 入力フィールドでのキー入力は無視
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'SELECT' || event.target.tagName === 'TEXTAREA') {
            return;
        }
        
        // スペースキーで開始/停止を切り替え
        if (event.key === ' ' || event.key === 'Spacebar') {
            event.preventDefault();
            startBtn.click();
            return;
        }
        
        // 数字キーで遅延時間を設定
        const numericKey = event.key.match(/^[0-9]$/);
        if (numericKey) {
            event.preventDefault();
            const digit = parseInt(event.key, 10);
            let delayTime;
            
            if (event.shiftKey) {
                // Shift + 数字キーの場合は1.0〜9.0秒（0の場合は0.0秒）
                delayTime = digit === 0 ? 0.0 : digit * 1.0;
                console.log('Shiftキー + 数字:', digit, '→ 遅延時間:', delayTime);
            } else {
                // 数字キーのみの場合は0.1〜0.9秒（0の場合は0.0秒）
                delayTime = digit === 0 ? 0.0 : digit * 0.1;
                console.log('数字キーのみ:', digit, '→ 遅延時間:', delayTime);
            }
            
            setDelay(delayTime);
        }
    });

    // 遅延スライダーの変更時にステータスを更新
    delaySlider.addEventListener('change', () => {
        if (animationId) {
            updateStatus(`${delaySeconds.toFixed(1)}秒の遅延で映像を表示しています。`);
        }
    });
    
    // 初期化時にカメラデバイスを取得
    getAvailableCameras();
}); 