import React, { useState } from 'react';
import './PlantAnalysis.css';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Leaf, Droplet, Sun, Thermometer, Camera, Send, Info } from 'lucide-react';

// Gemini API 키를 환경변수에서 가져옵니다
const API_KEY = process.env.REACT_APP_GEMINI_API_KEY;

const PlantAnalysisComponent = () => {
  const [image, setImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);

  // 이미지 파일을 base64로 변환하는 헬퍼 함수
  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = reader.result.split(',')[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  // Gemini API 호출 함수
  const analyzeImageWithGemini = async (file) => {
    try {
      // API 키가 없으면 에러를 던집니다
      if (!API_KEY) {
        throw new Error("Gemini API key is missing. Please check your .env file.");
      }

      // Gemini API 클라이언트 초기화
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      // 이미지 파일을 base64로 변환
      const fileBase64 = await convertToBase64(file);
      
      // Gemini API에 요청을 보냅니다
      const result = await model.generateContent([
        "Analyze this plant image and provide information about:",
        "1. What plant is this?",
        "2. Is it healthy or showing signs of stress?",
        "3. What issues can you identify?",
        "4. What recommendations would you give for its care?",
        "5. Estimate environmental conditions based on appearance.",
        "Format the response as a JSON object with these fields: plantIdentified, healthStatus, issues (array), recommendations (array), metrics (object with soilMoisture, temperature, sunlight, estimatedWaterNeeds)",
        { inlineData: { data: fileBase64, mimeType: "image/jpeg" } },
      ]);

      const responseText = result.response.text();
      
      // JSON 형식으로 응답을 파싱합니다
      // 응답이 JSON 형식이 아닐 경우를 대비해 에러 처리를 합니다
      try {
        // JSON 문자열을 찾습니다 (응답에 다른 텍스트가 포함되어 있을 수 있음)
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        } else {
          // JSON 형식이 아니라면 임의로 구조화된 형태로 변환합니다
          return {
            plantIdentified: "Unknown",
            healthStatus: "Analysis incomplete",
            issues: ["Could not properly analyze the image"],
            recommendations: ["Try uploading a clearer image"],
            metrics: {
              soilMoisture: "Unknown",
              temperature: "Unknown",
              sunlight: "Unknown",
              estimatedWaterNeeds: "Unknown"
            },
            rawResponse: responseText // 디버깅을 위해 원본 응답 포함
          };
        }
      } catch (jsonError) {
        console.error("Error parsing JSON response:", jsonError);
        throw new Error("Failed to parse analysis results");
      }
    } catch (error) {
      console.error("Error analyzing image with Gemini:", error);
      throw error;
    }
  };

  // 이미지 분석 함수
  const analyzeImage = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // API 키가 설정되어 있는지 확인
      if (!API_KEY) {
        // API 키가 없으면 모의 데이터를 사용
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const mockResponse = {
          plantIdentified: 'Tomato (Solanum lycopersicum)',
          healthStatus: 'Moderate stress detected',
          issues: [
            'Early signs of water stress',
            'Potential phosphorus deficiency'
          ],
          recommendations: [
            'Increase watering frequency by 15%',
            'Consider adding phosphorus-rich fertilizer',
            'Monitor for signs of improvement over the next 3-5 days'
          ],
          metrics: {
            soilMoisture: '42%',
            temperature: '27°C',
            sunlight: 'Adequate',
            estimatedWaterNeeds: '750ml per day'
          }
        };
        
        setAnalysis(mockResponse);
      } else {
        // Gemini API를 사용한 실제 분석
        const result = await analyzeImageWithGemini(imageFile);
        setAnalysis(result);
      }
    } catch (err) {
      console.error('Error analyzing image:', err);
      setError(`Failed to analyze image: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const imageUrl = URL.createObjectURL(selectedFile);
      setImage(imageUrl);
      setImageFile(selectedFile);
      setAnalysis(null); // 이전 분석 결과 초기화
    }
  };

  return (
    <div className="plant-analysis-container">
      <div className="header">
        <h1>FarmSmart Plant Analysis</h1>
        <p>Upload a photo of your plant for AI-powered analysis using Gemini</p>
      </div>

      <div className="content">
        {/* 이미지 업로드 섹션 */}
        <div className="upload-section">
          <div className="image-container">
            {image ? (
              <img src={image} alt="Plant for analysis" />
            ) : (
              <div className="placeholder">
                <Leaf size={48} />
                <p>No image selected</p>
              </div>
            )}
          </div>
          
          <div className="button-container">
            <label htmlFor="upload-image" className="button upload-button">
              <Camera size={20} />
              <span>Upload Plant Image</span>
            </label>
            <input 
              id="upload-image" 
              type="file" 
              accept="image/*" 
              style={{ display: 'none' }} 
              onChange={handleImageChange} 
            />
            
            <button 
              onClick={analyzeImage} 
              disabled={!image || loading} 
              className="button analyze-button"
            >
              {loading ? (
                <>
                  <div className="spinner-small"></div>
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <Send size={20} />
                  <span>Analyze with Gemini</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 분석 결과 섹션 */}
        <div className="results-section">
          <div className="results-title">
            <Info size={20} />
            Analysis Results
          </div>
          
          {error && (
            <div className="error">
              {error}
            </div>
          )}
          
          {!analysis && !loading && !error && (
            <div className="empty-state">
              Upload an image and click "Analyze" to get plant insights
            </div>
          )}
          
          {loading && (
            <div className="loading">
              <div className="spinner"></div>
              <p>Gemini AI is analyzing your plant...</p>
            </div>
          )}
          
          {analysis && (
            <div>
              <div className="plant-info">
                <div className="plant-name">{analysis.plantIdentified}</div>
                <div className={`health-status ${analysis.healthStatus.includes('stress') ? 'stressed' : 'healthy'}`}>
                  {analysis.healthStatus}
                </div>
              </div>
              
              <div>
                <div className="section-title">Issues Detected:</div>
                <ul className="list">
                  {analysis.issues.map((issue, i) => (
                    <li key={i}>{issue}</li>
                  ))}
                </ul>
              </div>
              
              <div>
                <div className="section-title">Recommendations:</div>
                <ul className="list">
                  {analysis.recommendations.map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>
              
              <div className="metrics">
                <div className="section-title">Environmental Metrics:</div>
                <div className="metrics-grid">
                  <div className="metric">
                    <div className="metric-icon" style={{ color: '#2196f3' }}>
                      <Droplet size={18} />
                    </div>
                    <span className="metric-label">Soil Moisture:</span>
                    <span className="metric-value">{analysis.metrics.soilMoisture}</span>
                  </div>
                  <div className="metric">
                    <div className="metric-icon" style={{ color: '#f44336' }}>
                      <Thermometer size={18} />
                    </div>
                    <span className="metric-label">Temperature:</span>
                    <span className="metric-value">{analysis.metrics.temperature}</span>
                  </div>
                  <div className="metric">
                    <div className="metric-icon" style={{ color: '#ffc107' }}>
                      <Sun size={18} />
                    </div>
                    <span className="metric-label">Sunlight:</span>
                    <span className="metric-value">{analysis.metrics.sunlight}</span>
                  </div>
                  <div className="metric">
                    <div className="metric-icon" style={{ color: '#2196f3' }}>
                      <Droplet size={18} />
                    </div>
                    <span className="metric-label">Water Needs:</span>
                    <span className="metric-value">{analysis.metrics.estimatedWaterNeeds}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="footer">
        <p>This demo shows how the FarmSmart solution could leverage Google's Gemini API for plant analysis.</p>
        <p>In a production environment, this would connect to real sensors and the Gemini API.</p>
      </div>
    </div>
  );
};

export default PlantAnalysisComponent;