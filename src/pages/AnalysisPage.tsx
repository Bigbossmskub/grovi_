import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import L from "leaflet";
import { useField } from "../contexts/FieldContext";
import axios from "../config/axios";

interface TimeSeriesData {
  date: string;
  value: number;
}

const AnalysisPage: React.FC = () => {
  const { fieldId } = useParams<{ fieldId: string }>();
  const navigate = useNavigate();
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const { getField, currentField } = useField();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"trend">("trend");
  const [selectedVI, setSelectedVI] = useState("NDVI");
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [chartUrl, setChartUrl] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisType, setAnalysisType] = useState<
    "monthly_range" | "full_year" | "ten_year_avg"
  >("monthly_range");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [startMonth, setStartMonth] = useState(1);
  const [endMonth, setEndMonth] = useState(3);

  const viTypes = [
    { code: "NDVI", name: "NDVI" },
    { code: "EVI", name: "EVI" },
    { code: "SAVI", name: "SAVI" },
    { code: "GNDVI", name: "GNDVI" },
    { code: "NDRE", name: "NDRE" },
    { code: "LSWI", name: "LSWI" },
  ];

  useEffect(() => {
    if (!fieldId) {
      navigate("/map");
      return;
    }
    loadField();
  }, [fieldId]);

  useEffect(() => {
    if (currentField && mapContainerRef.current && !mapRef.current) {
      initializeMap();
    }
  }, [currentField]);

  const loadField = async () => {
    if (!fieldId) return;

    try {
      setIsLoading(true);
      await getField(fieldId);
    } catch (error: any) {
      console.error("Failed to load field:", error);
      alert("ไม่สามารถโหลดข้อมูลแปลงได้: " + error.message);
      navigate("/map");
    } finally {
      setIsLoading(false);
    }
  };

  const initializeMap = () => {
    if (!mapContainerRef.current || !currentField || mapRef.current) return;

    // Initialize map
    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
    }).setView([currentField.centroid_lat, currentField.centroid_lng], 15);

    // Add base layers
    const esriSatellite = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        attribution: "Tiles © Esri",
      }
    ).addTo(map);

    const osmLayer = L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom: 19,
        attribution: "© OpenStreetMap",
      }
    );

    L.control
      .layers(
        {
          "Esri Satellite": esriSatellite,
          OpenStreetMap: osmLayer,
        },
        {},
        {
          position: "topleft",
        }
      )
      .addTo(map);

    // Add field boundary
    if (currentField.geometry) {
      const fieldLayer = L.geoJSON(currentField.geometry, {
        style: {
          color: "#2b7a4b",
          weight: 2,
          fillOpacity: 0.05,
        },
      }).addTo(map);

      map.fitBounds(fieldLayer.getBounds(), { padding: [20, 20] });
    }

    mapRef.current = map;
  };

  const analyzeFieldVI = async () => {
    if (!fieldId || !currentField) return;

    try {
      setIsAnalyzing(true);

      let startDate: Date, endDate: Date;

      switch (analysisType) {
        case "monthly_range":
          startDate = new Date(selectedYear, startMonth - 1, 1);
          endDate = new Date(selectedYear, endMonth, 0); // Last day of end month
          break;

        case "full_year":
          startDate = new Date(selectedYear, 0, 1); // January 1st
          endDate = new Date(selectedYear, 11, 31); // December 31st
          break;

        case "ten_year_avg":
          endDate = new Date();
          startDate = new Date();
          startDate.setFullYear(startDate.getFullYear() - 10);
          break;

        default:
          return;
      }

      // Call GEE service to get timeseries data
      const response = await axios.get(`/vi/timeseries/${fieldId}`, {
        params: {
          vi_type: selectedVI,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          analysis_type: analysisType,
        },
      });

      console.log("📊 API Response:", response.data);

      if (response.data.timeseries && response.data.timeseries.length > 0) {
        const processedData = processTimeSeriesData(response.data.timeseries);
        setTimeSeriesData(processedData);
        generateChart(processedData);
        console.log(
          `✅ Successfully processed ${processedData.length} data points`
        );
      } else {
        setTimeSeriesData([]);
        setChartUrl("");
        console.warn("⚠️ No data returned from API");
        alert(
          "ไม่พบข้อมูลในช่วงเวลาที่เลือก กรุณาเลือกช่วงเวลาอื่น หรือตรวจสอบการเชื่อมต่อ Google Earth Engine"
        );
      }
    } catch (error: any) {
      console.error("Failed to analyze field VI:", error);
      setTimeSeriesData([]);
      setChartUrl("");
      const errorMessage =
        error.response?.data?.detail || error.message || "ไม่ทราบสาเหตุ";
      alert(
        `เกิดข้อผิดพลาดในการดึงข้อมูลจาก Google Earth Engine:\n\n${errorMessage}\n\nกรุณาลองใหม่อีกครั้ง หรือติดต่อผู้ดูแลระบบ`
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const processTimeSeriesData = (rawData: any[]): TimeSeriesData[] => {
    console.log("🔄 Processing timeseries data:", rawData);

    if (analysisType === "ten_year_avg") {
      // For 10-year average, data is already yearly averages from GEE
      const result = rawData
        .map((item) => {
          const date = new Date(item.measurement_date || item.date);
          const value = item.vi_value || item.value;

          return {
            date: date.getFullYear().toString(),
            value: value,
          };
        })
        .sort((a, b) => parseInt(a.date) - parseInt(b.date));

      console.log(
        "📊 Processed 10-year data (yearly averages from GEE):",
        result
      );
      return result;
    } else {
      // Monthly data - data is already monthly averages from GEE
      const result = rawData.map((item) => {
        const date = new Date(item.measurement_date || item.date);
        const value = item.vi_value || item.value;

        return {
          date: date.toLocaleDateString("th-TH", {
            month: "short",
            ...(analysisType === "monthly_range" &&
            date.getFullYear() !== new Date().getFullYear()
              ? { year: "numeric" }
              : {}),
          }),
          value: value,
        };
      });

      console.log("📅 Processed monthly data:", result);
      return result;
    }
  };

  const generateChart = (data: TimeSeriesData[]) => {
    if (data.length === 0) return;

    const chartData = {
      type: "line",
      data: {
        labels: data.map((d) => d.date),
        datasets: [
          {
            label: selectedVI,
            data: data.map((d) => d.value),
            fill: true,
            borderColor: "#2b7a4b",
            backgroundColor: "rgba(43, 122, 75, 0.1)",
            tension: 0.4,
          },
        ],
      },
      options: {
        plugins: {
          legend: {
            display: true,
          },
          title: {
            display: true,
            text: getAnalysisDescription(),
          },
        },
        scales: {
          y: {
            beginAtZero: false,
            title: {
              display: true,
              text: `ค่า ${selectedVI}`,
            },
          },
          x: {
            title: {
              display: true,
              text: analysisType === "ten_year_avg" ? "ปี" : "เดือน",
            },
          },
        },
      },
    };

    const encodedData = encodeURIComponent(JSON.stringify(chartData));
    setChartUrl(`https://quickchart.io/chart?c=${encodedData}`);
  };

  const getAvailableYears = (): number[] => {
    const currentYear = new Date().getFullYear();
    // Sentinel-2 has data from 2015, show last 10 years
    const startYear = currentYear - 9;
    return Array.from({ length: 10 }, (_, i) => startYear + i).reverse();
  };

  const getAvailableMonths = (): number[] => {
    return Array.from({ length: 12 }, (_, i) => i + 1);
  };

  const getAnalysisDescription = (): string => {
    switch (analysisType) {
      case "monthly_range":
        const startMonthName = new Date(0, startMonth - 1).toLocaleDateString(
          "th-TH",
          { month: "long" }
        );
        const endMonthName = new Date(0, endMonth - 1).toLocaleDateString(
          "th-TH",
          { month: "long" }
        );
        return `ค่าเฉลี่ยรายเดือน ${selectedVI} ช่วง ${startMonthName} - ${endMonthName} ปี ${selectedYear}`;
      case "full_year":
        return `ค่าเฉลี่ยรายเดือน ${selectedVI} ทั้งปี ${selectedYear} (มกราคม-ธันวาคม)`;
      case "ten_year_avg":
        return `ค่าเฉลี่ยรายปี ${selectedVI} (10 ปีย้อนหลัง) - ปีละ 1 ค่า`;
      default:
        return `ข้อมูล ${selectedVI}`;
    }
  };

  const generateComparisonChart = () => {
    // Use real data from timeSeriesData for current field
    const currentFieldData = timeSeriesData.slice(-4).map((d) => d.value);
    const labels = timeSeriesData.slice(-4).map((d) => d.date);

    // Add prediction label
    labels.push("คาดการณ์");

    // Generate prediction based on trend
    const trend =
      currentFieldData.length > 1
        ? (currentFieldData[currentFieldData.length - 1] -
            currentFieldData[0]) /
          currentFieldData.length
        : 0.02;
    const prediction = Math.max(
      0,
      Math.min(
        selectedVI === "VCI" ? 100 : 1,
        currentFieldData[currentFieldData.length - 1] + trend
      )
    );

    // Generate comparison field data (simulated average of similar fields)
    const comparisonData = currentFieldData.map((value, index) => {
      const variation = (Math.random() - 0.5) * 0.1;
      return Math.max(0, value - 0.03 + variation); // Slightly lower performance
    });
    const comparisonPrediction = Math.max(
      0,
      Math.min(
        selectedVI === "VCI" ? 100 : 1,
        comparisonData[comparisonData.length - 1] + trend * 0.8
      )
    );

    const chartData = {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: currentField?.name || "แปลงปัจจุบัน",
            data: [...currentFieldData, prediction],
            fill: true,
            borderColor: "#2b7a4b",
            backgroundColor: "rgba(43, 122, 75, 0.1)",
            tension: 0.4,
          },
          {
            label: "แปลงเปรียบเทียบ (เฉลี่ย)",
            data: [...comparisonData, comparisonPrediction],
            fill: true,
            borderColor: "#ff7c02",
            backgroundColor: "rgba(255, 124, 2, 0.1)",
            tension: 0.4,
          },
          {
            label: "คาดการณ์",
            data: [null, null, null, null, prediction],
            borderDash: [6, 6],
            fill: false,
            borderColor: "#6b7280",
            pointRadius: 6,
            pointBackgroundColor: "#6b7280",
          },
        ],
      },
      options: {
        plugins: {
          legend: {
            display: true,
          },
          title: {
            display: true,
            text: `การเปรียบเทียบและคาดการณ์ ${selectedVI}`,
          },
        },
        scales: {
          y: {
            beginAtZero: false,
            title: {
              display: true,
              text: `ค่า ${selectedVI}`,
            },
          },
        },
      },
    };

    const encodedData = encodeURIComponent(JSON.stringify(chartData));
    return `https://quickchart.io/chart?c=${encodedData}`;
  };

  const getComparisonStats = () => {
    if (timeSeriesData.length === 0)
      return { current: 0, comparison: 0, prediction: 0 };

    const latestValue = timeSeriesData[timeSeriesData.length - 1]?.value || 0;
    const comparisonValue = Math.max(
      0,
      latestValue - 0.03 + (Math.random() - 0.5) * 0.05
    );
    const trend =
      timeSeriesData.length > 1
        ? (timeSeriesData[timeSeriesData.length - 1].value -
            timeSeriesData[0].value) /
          timeSeriesData.length
        : 0.02;
    const prediction = Math.max(
      0,
      Math.min(selectedVI === "VCI" ? 100 : 1, latestValue + trend)
    );

    return {
      current: latestValue,
      comparison: comparisonValue,
      prediction: prediction,
    };
  };

  const handleBackClick = () => {
    navigate(`/field/${fieldId}`);
  };

  const downloadChartImage = () => {
    if (!chartUrl) return;
    const link = document.createElement("a");
    link.href = chartUrl;
    link.download = `${
      currentField?.name || "field"
    }_${selectedVI}_${analysisType}_${selectedYear}${startMonth}-${endMonth}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadAnalysisResults = () => {
    if (timeSeriesData.length === 0) return;
    const data = {
      field_name: currentField?.name,
      vi_type: selectedVI,
      analysis_type: analysisType,
      year: selectedYear,
      start_month: startMonth,
      end_month: endMonth,
      timeseries: timeSeriesData,
      description: getAnalysisDescription(),
    };
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${
      currentField?.name || "field"
    }_${selectedVI}_${analysisType}_${selectedYear}${startMonth}-${endMonth}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadCSV = () => {
    if (timeSeriesData.length === 0) return;

    try {
      // สร้างหัวตาราง CSV พร้อม BOM สำหรับภาษาไทย
      const headers = ["ชื่อแปลง", "ประเภท VI", "ปี", "เดือน", "ค่า VI"];

      // สร้างข้อมูล CSV
      const csvData = timeSeriesData.map((item) => [
        currentField?.name || "ไม่ทราบ",
        selectedVI,
        item.date,
        item.date.includes("-") ? item.date.split("-")[1] : "", // For monthly data, show month
        item.value.toFixed(4),
      ]);

      // รวมหัวตารางและข้อมูล
      const csvContent = [headers, ...csvData]
        .map((row) => row.map((cell) => `"${cell}"`).join(","))
        .join("\n");

      // เพิ่ม BOM (Byte Order Mark) สำหรับ UTF-8 เพื่อให้ Excel อ่านภาษาไทยได้ถูกต้อง
      const BOM = "\uFEFF";
      const csvString = BOM + csvContent;

      // สร้างไฟล์ CSV ด้วย encoding ที่ถูกต้อง
      const blob = new Blob([csvString], {
        type: "text/csv;charset=utf-8;",
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${
        currentField?.name || "field"
      }_${selectedVI}_${analysisType}_${selectedYear}${startMonth}-${endMonth}.csv`;

      // ดาวน์โหลดไฟล์
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // ล้าง URL
      URL.revokeObjectURL(url);

      console.log("✅ ดาวน์โหลดข้อมูล CSV สำเร็จ");
    } catch (error) {
      console.error("❌ เกิดข้อผิดพลาดในการดาวน์โหลด CSV:", error);
      alert("เกิดข้อผิดพลาดในการดาวน์โหลด CSV กรุณาลองใหม่อีกครั้ง");
    }
  };

  if (isLoading) {
    return (
      <section className="page active">
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100%",
          }}
        >
          <div>กำลังโหลด...</div>
        </div>
      </section>
    );
  }

  return (
    <section className="page active analysis-page">
      <div className="work-anal">
        <div className="map-pane">
          <div ref={mapContainerRef} className="map" />

          {/* Toolbar */}
          <div
            className="toolbar"
            style={{
              position: "absolute",
              top: "10px",
              left: "10px",
              zIndex: 1000,
              marginTop: "50px",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              backgroundColor: "transparent",
              padding: "0px",
            }}
          >
            {/* Zoom Control */}
            <div
              style={{
                width: "40px",
                height: "80px",
                backgroundColor: "#FFFFFF",
                borderRadius: "20px",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                border: "none",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
              }}
            >
              <button
                className="toolbtn-zoom"
                title="ซูมเข้า"
                onClick={() => mapRef.current?.zoomIn()}
                style={{
                  flex: 1,
                  border: "none",
                  backgroundColor: "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  fontSize: "18px",
                  fontWeight: "bold",
                  color: "#006400",
                }}
              >
                +
              </button>
              <div
                style={{
                  width: "100%",
                  height: "1px",
                  backgroundColor: "rgba(0, 100, 0, 0.2)",
                }}
              ></div>
              <button
                className="toolbtn-zoom"
                title="ซูมออก"
                onClick={() => mapRef.current?.zoomOut()}
                style={{
                  flex: 1,
                  border: "none",
                  backgroundColor: "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  fontSize: "18px",
                  fontWeight: "bold",
                  color: "#006400",
                }}
              >
                −
              </button>
            </div>

            {/* Compass Button */}
            <button
              className="toolbtn-circle"
              title="เข็มทิศ"
              onClick={() => alert("เข็มทิศ (จะพัฒนาในเวอร์ชันถัดไป)")}
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                border: "none",
                backgroundColor: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.2s ease",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z"
                  fill="#006400"
                />
                <circle cx="12" cy="12" r="2" fill="#006400" />
              </svg>
            </button>

            {/* Measurement Button */}
            <button
              className="toolbtn-circle"
              title="วัดระยะทาง"
              onClick={() => alert("โหมดวัดระยะ (จะพัฒนาในเวอร์ชันถัดไป)")}
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                border: "none",
                backgroundColor: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.2s ease",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M3 21L21 3" stroke="#006400" strokeWidth="2" />
                <path d="M3 3h6v6" stroke="#006400" strokeWidth="2" />
                <path d="M15 15h6v6" stroke="#006400" strokeWidth="2" />
                <circle cx="6" cy="6" r="1" fill="#006400" />
                <circle cx="18" cy="18" r="1" fill="#006400" />
              </svg>
            </button>

            {/* Location Button */}
            <button
              className="toolbtn-circle"
              title="ตำแหน่งของฉัน"
              onClick={() =>
                mapRef.current?.locate({ setView: true, maxZoom: 14 })
              }
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                border: "none",
                backgroundColor: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.2s ease",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="3" fill="#006400" />
                <circle
                  cx="12"
                  cy="12"
                  r="8"
                  stroke="#006400"
                  strokeWidth="2"
                  fill="none"
                />
                <path d="M12 2v4" stroke="#006400" strokeWidth="2" />
                <path d="M12 18v4" stroke="#006400" strokeWidth="2" />
                <path d="M2 12h4" stroke="#006400" strokeWidth="2" />
                <path d="M18 12h4" stroke="#006400" strokeWidth="2" />
              </svg>
            </button>
          </div>
        </div>

        <aside className="sidebar">
          <div className="backbar">
            <button className="backbtn" onClick={handleBackClick}>
              ← ย้อนกลับ
            </button>
            <h3 style={{ margin: 0 }}>การวิเคราะห์</h3>
          </div>

          {/* Tab Navigation */}
          <div className="seg">
            <button className="active" style={{ cursor: "default" }}>
              Trend Analysis
            </button>
          </div>

          {/* Trend Panel */}
          {
            <div>
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  alignItems: "center",
                  marginBottom: "15px",
                  flexWrap: "wrap",
                }}
              >
                <label htmlFor="typeSelect">
                  <b>VI:</b>
                </label>
                <select
                  id="typeSelect"
                  value={selectedVI}
                  onChange={(e) => setSelectedVI(e.target.value)}
                  disabled={isAnalyzing}
                >
                  {viTypes.map((vi) => (
                    <option key={vi.code} value={vi.code}>
                      {vi.name}
                    </option>
                  ))}
                </select>
                <button
                  className="cta"
                  style={{
                    background: isAnalyzing ? "#f0f0f0" : "var(--brand)",
                    color: isAnalyzing ? "#999" : "#fff",
                    border: `1px solid ${
                      isAnalyzing ? "#ccc" : "var(--brand)"
                    }`,
                    cursor: isAnalyzing ? "not-allowed" : "pointer",
                    padding: "10px 20px",
                    fontSize: "16px",
                    fontWeight: "bold",
                  }}
                  onClick={analyzeFieldVI}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing
                    ? "⏳ กำลังดึงข้อมูลจาก Google Earth Engine..."
                    : "📊 วิเคราะห์"}
                </button>
              </div>

              {/* Analysis Type Selection */}
              <div style={{ marginBottom: "15px" }}>
                <label>
                  <b>ประเภทการวิเคราะห์:</b>
                </label>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr",
                    gap: "8px",
                    marginTop: "8px",
                  }}
                >
                  <button
                    className={`btn ${
                      analysisType === "monthly_range"
                        ? "btn-green"
                        : "btn-outline"
                    }`}
                    onClick={() => setAnalysisType("monthly_range")}
                    style={{
                      fontSize: "14px",
                      padding: "8px 12px",
                      textAlign: "left",
                    }}
                    disabled={isAnalyzing}
                  >
                    📅 ช่วงเดือน - เลือกเดือนที่ต้องการในปีที่เลือก
                  </button>
                  <button
                    className={`btn ${
                      analysisType === "full_year" ? "btn-green" : "btn-outline"
                    }`}
                    onClick={() => setAnalysisType("full_year")}
                    style={{
                      fontSize: "14px",
                      padding: "8px 12px",
                      textAlign: "left",
                    }}
                    disabled={isAnalyzing}
                  >
                    📊 ทั้งปี - แสดงข้อมูลทั้งปีที่เลือก
                  </button>
                  <button
                    className={`btn ${
                      analysisType === "ten_year_avg"
                        ? "btn-green"
                        : "btn-outline"
                    }`}
                    onClick={() => setAnalysisType("ten_year_avg")}
                    style={{
                      fontSize: "14px",
                      padding: "8px 12px",
                      textAlign: "left",
                    }}
                    disabled={isAnalyzing}
                  >
                    📈 10 ปีย้อนหลัง - ค่าเฉลี่ยรายปี
                  </button>
                </div>
              </div>

              {/* Year Selection for full_year and monthly_range modes */}
              {(analysisType === "full_year" ||
                analysisType === "monthly_range") && (
                <div
                  style={{
                    marginBottom: "15px",
                    padding: "10px",
                    background: "#f8f9fa",
                    borderRadius: "8px",
                  }}
                >
                  <label>
                    <b>ปี:</b>
                  </label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    style={{ marginLeft: "8px", padding: "4px 8px" }}
                    disabled={isAnalyzing}
                  >
                    {getAvailableYears().map((year) => (
                      <option key={year} value={year}>
                        {year} พ.ศ. {year + 543}
                      </option>
                    ))}
                  </select>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#666",
                      marginTop: "5px",
                    }}
                  >
                    💡 Sentinel-2 มีข้อมูลตั้งแต่ปี 2015 เป็นต้นมา
                  </div>
                </div>
              )}

              {/* Month Range Selection for monthly_range mode */}
              {analysisType === "monthly_range" && (
                <div
                  style={{
                    marginBottom: "15px",
                    padding: "10px",
                    background: "#f0f8f0",
                    borderRadius: "8px",
                    border: "1px solid #e0e0e0",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: "15px",
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <label>
                        <b>จาก:</b>
                      </label>
                      <select
                        value={startMonth}
                        onChange={(e) =>
                          setStartMonth(parseInt(e.target.value))
                        }
                        style={{ marginLeft: "5px", padding: "4px 8px" }}
                        disabled={isAnalyzing}
                      >
                        {getAvailableMonths().map((month) => (
                          <option key={month} value={month}>
                            {new Date(0, month - 1).toLocaleDateString(
                              "th-TH",
                              { month: "long" }
                            )}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label>
                        <b>ถึง:</b>
                      </label>
                      <select
                        value={endMonth}
                        onChange={(e) => setEndMonth(parseInt(e.target.value))}
                        style={{ marginLeft: "5px", padding: "4px 8px" }}
                        disabled={isAnalyzing}
                      >
                        {getAvailableMonths()
                          .filter((month) => month >= startMonth)
                          .map((month) => (
                            <option key={month} value={month}>
                              {new Date(0, month - 1).toLocaleDateString(
                                "th-TH",
                                { month: "long" }
                              )}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#666",
                      marginTop: "8px",
                    }}
                  >
                    📅 เลือกช่วงเดือนที่ต้องการวิเคราะห์
                  </div>
                </div>
              )}

              {/* Chart Display */}
              <div style={{ marginBottom: "20px" }}>
                {isAnalyzing ? (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      height: "200px",
                      border: "1px solid var(--line)",
                      borderRadius: "12px",
                      background: "#f8f9fa",
                    }}
                  >
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "24px", marginBottom: "10px" }}>
                        🛰️
                      </div>
                      <div>
                        <b>กำลังดึงข้อมูลจาก Google Earth Engine</b>
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#666",
                          marginTop: "5px",
                        }}
                      >
                        {analysisType === "monthly_range" &&
                          `คำนวณค่าเฉลี่ยรายเดือน (${
                            Math.abs(endMonth - startMonth) + 1
                          } เดือน)`}
                        {analysisType === "full_year" &&
                          `คำนวณค่าเฉลี่ยรายเดือน (12 เดือน)`}
                        {analysisType === "ten_year_avg" &&
                          `คำนวณค่าเฉลี่ยรายปี (10 ปี)`}
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#999",
                          marginTop: "3px",
                        }}
                      >
                        ใช้เวลาประมาณ{" "}
                        {analysisType === "ten_year_avg"
                          ? "1-2 นาที"
                          : "15-45 วินาที"}
                      </div>
                    </div>
                  </div>
                ) : chartUrl ? (
                  <div>
                    <img
                      src={chartUrl}
                      alt="Analysis Chart"
                      style={{
                        width: "100%",
                        border: "1px solid var(--line)",
                        borderRadius: "12px",
                        marginBottom: "15px",
                      }}
                    />

                    {/* ปุ่มดาวน์โหลด */}
                    <div
                      style={{
                        display: "flex",
                        gap: "10px",
                        flexWrap: "wrap",
                        justifyContent: "center",
                        marginBottom: "20px",
                      }}
                    >
                      <button
                        className="cta"
                        style={{
                          background: "var(--brand)",
                          color: "#fff",
                          border: "none",
                          padding: "10px 20px",
                          fontSize: "14px",
                          fontWeight: "bold",
                          borderRadius: "8px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "8px",
                        }}
                        onClick={downloadChartImage}
                        disabled={isAnalyzing}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path
                            d="M19 9h-4V3H9v6H5l7 7 7-7z"
                            stroke="#fff"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M12 19v4"
                            stroke="#fff"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        ดาวน์โหลดกราฟ
                      </button>

                      <button
                        className="cta"
                        style={{
                          background: "var(--brand)",
                          color: "#fff",
                          border: "none",
                          padding: "10px 20px",
                          fontSize: "14px",
                          fontWeight: "bold",
                          borderRadius: "8px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "8px",
                        }}
                        onClick={downloadAnalysisResults}
                        disabled={isAnalyzing}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path
                            d="M19 9h-4V3H9v6H5l7 7 7-7z"
                            stroke="#fff"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M12 19v4"
                            stroke="#fff"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        ดาวน์โหลดผลลัพธ์ (JSON)
                      </button>

                      <button
                        className="cta"
                        style={{
                          background: "var(--brand)",
                          color: "#fff",
                          border: "none",
                          padding: "10px 20px",
                          fontSize: "14px",
                          fontWeight: "bold",
                          borderRadius: "8px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "8px",
                        }}
                        onClick={downloadCSV}
                        disabled={isAnalyzing}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path
                            d="M19 9h-4V3H9v6H5l7 7 7-7z"
                            stroke="#fff"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M12 19v4"
                            stroke="#fff"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        ดาวน์โหลด CSV
                      </button>
                    </div>
                  </div>
                ) : timeSeriesData.length === 0 ? (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      height: "200px",
                      border: "1px dashed #ccc",
                      borderRadius: "12px",
                      background: "#fafafa",
                    }}
                  >
                    <div style={{ textAlign: "center", color: "#666" }}>
                      <div style={{ fontSize: "48px", marginBottom: "15px" }}>
                        📊
                      </div>
                      <div>
                        <b>กดปุ่ม "วิเคราะห์" เพื่อดึงข้อมูล</b>
                      </div>
                      <div style={{ fontSize: "12px", marginTop: "5px" }}>
                        ระบบจะดึงข้อมูล {selectedVI} จาก Google Earth Engine
                      </div>
                      <div style={{ fontSize: "12px", marginTop: "3px" }}>
                        {getAnalysisDescription()}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Analysis Results Summary */}
              {timeSeriesData.length > 0 && (
                <div style={{ marginTop: "20px" }}>
                  <h4>📈 สรุปผลการวิเคราะห์</h4>
                  <div
                    style={{
                      padding: "15px",
                      background: "#f0f8f0",
                      borderRadius: "8px",
                      border: "1px solid #e0e0e0",
                    }}
                  >
                    <div>
                      <b>ประเภทการวิเคราะห์:</b> {getAnalysisDescription()}
                    </div>
                    <div>
                      <b>จำนวนข้อมูล:</b> {timeSeriesData.length} จุดข้อมูล
                    </div>
                    <div>
                      <b>ค่าเฉลี่ย:</b>{" "}
                      {(
                        timeSeriesData.reduce(
                          (sum, item) => sum + item.value,
                          0
                        ) / timeSeriesData.length
                      ).toFixed(3)}
                    </div>
                    <div>
                      <b>ค่าสูงสุด:</b>{" "}
                      {Math.max(
                        ...timeSeriesData.map((item) => item.value)
                      ).toFixed(3)}
                    </div>
                    <div>
                      <b>ค่าต่ำสุด:</b>{" "}
                      {Math.min(
                        ...timeSeriesData.map((item) => item.value)
                      ).toFixed(3)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          }
        </aside>
      </div>
    </section>
  );
};

export default AnalysisPage;
