@echo off
setlocal
set "ROOT=%~dp0.."
cd /d "%ROOT%"
if not exist "%ROOT%\models\face" mkdir "%ROOT%\models\face"
where py >nul 2>nul
if errorlevel 1 (
  echo Python 3.10 or newer is required.
  exit /b 1
)
py -m pip install opencv-python-headless numpy
if errorlevel 1 exit /b %ERRORLEVEL%
curl.exe -L --fail --retry 3 -o "%ROOT%\models\face\face_detection_yunet_2023mar.onnx" "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx"
if errorlevel 1 exit /b %ERRORLEVEL%
curl.exe -L --fail --retry 3 -o "%ROOT%\models\face\face_recognition_sface_2021dec.onnx" "https://github.com/opencv/opencv_zoo/raw/main/models/face_recognition_sface/face_recognition_sface_2021dec.onnx"
if errorlevel 1 exit /b %ERRORLEVEL%
echo Local face recognition models are installed.
