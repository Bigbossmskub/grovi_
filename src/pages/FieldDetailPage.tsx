import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useField } from "../contexts/FieldContext";

const FieldDetailPage: React.FC = () => {
  const { fieldId } = useParams<{ fieldId: string }>();
  const navigate = useNavigate();
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const { getField, currentField, getThumbnail } = useField();
  const [isLoading, setIsLoading] = useState(true);
  const [thumbnail, setThumbnail] = useState<string | null>(null);

  useEffect(() => {
    if (!fieldId) {
      navigate("/map");
      return;
    }
    loadField();
  }, [fieldId]);

  useEffect(() => {
    if (currentField && mapContainerRef.current && !mapRef.current) {
      // เพิ่ม delay หลายแบบเพื่อให้แน่ใจว่า DOM พร้อม
      const timer1 = setTimeout(() => initializeMap(), 100);
      const timer2 = setTimeout(() => initializeMap(), 500);
      const timer3 = setTimeout(() => initializeMap(), 1000);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    }
  }, [currentField]);

  // เพิ่ม useEffect สำหรับ DOM ready
  useEffect(() => {
    if (currentField) {
      const checkAndInit = () => {
        if (mapContainerRef.current && !mapRef.current) {
          console.log("🔄 DOM ready, initializing map...");
          initializeMap();
        }
      };

      // ลอง initialize หลายครั้งในช่วงเวลาต่างๆ
      const intervals = [0, 200, 500, 1000, 2000];
      const timers = intervals.map((delay) => setTimeout(checkAndInit, delay));

      return () => timers.forEach(clearTimeout);
    }
  }, [currentField]);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  const loadField = async () => {
    if (!fieldId) return;
    try {
      setIsLoading(true);
      await getField(fieldId);

      try {
        const thumbnailData = await getThumbnail(fieldId);
        setThumbnail(thumbnailData);
      } catch (error) {
        setThumbnail(null);
      }
    } catch (error: any) {
      console.error("Failed to load field:", error);
      alert("ไม่สามารถโหลดข้อมูลแปลงได้: " + error.message);
      navigate("/map");
    } finally {
      setIsLoading(false);
    }
  };

  const initializeMap = () => {
    console.log("🚀 initializeMap called");
    console.log("📦 mapContainerRef.current:", !!mapContainerRef.current);
    console.log("📦 currentField:", !!currentField);
    console.log("📦 mapRef.current:", !!mapRef.current);

    if (!mapContainerRef.current || !currentField) {
      console.log("❌ Skipping map initialization - missing requirements");
      return;
    }

    if (mapRef.current) {
      console.log("⏭️ Map already exists, skipping");
      return;
    }

    // ตรวจสอบขนาด container
    const containerRect = mapContainerRef.current.getBoundingClientRect();
    console.log(
      "📐 Container size:",
      containerRect.width,
      "x",
      containerRect.height
    );

    if (containerRect.width === 0 || containerRect.height === 0) {
      console.log("⚠️ Container has no size, retrying in 100ms...");
      setTimeout(() => initializeMap(), 100);
      return;
    }

    console.log("✅ Starting map initialization...");
    console.log(
      "📍 Field centroid:",
      currentField.centroid_lat,
      currentField.centroid_lng
    );

    try {
      // Initialize map (คัดลอกจาก HealthPage ที่ทำงานได้ดี)
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
      }).setView([currentField.centroid_lat, currentField.centroid_lng], 15);

      console.log("🗺️ Map object created");

      // Add base layers
      const esriSatellite = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          attribution: "Tiles © Esri",
        }
      ).addTo(map);

      console.log("🛰️ Esri satellite layer added");

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

      console.log("🎛️ Layer control added");

      // Add field boundary
      if (currentField.geometry) {
        console.log("🔷 Adding field boundary:", currentField.geometry);
        const fieldLayer = L.geoJSON(currentField.geometry, {
          style: {
            color: "#2b7a4b",
            weight: 2,
            fillOpacity: 0.05,
          },
        }).addTo(map);

        map.fitBounds(fieldLayer.getBounds(), { padding: [20, 20] });
        console.log("📐 Map fitted to field bounds");
      }

      mapRef.current = map;
      console.log("✅ Map initialization completed successfully!");

      // บังคับให้แผนที่ปรับขนาดหลายครั้ง
      setTimeout(() => {
        if (map) {
          map.invalidateSize();
          console.log("🔄 Map invalidateSize #1");
        }
      }, 100);

      setTimeout(() => {
        if (map) {
          map.invalidateSize();
          console.log("🔄 Map invalidateSize #2");
        }
      }, 500);

      setTimeout(() => {
        if (map) {
          map.invalidateSize();
          console.log("🔄 Map invalidateSize #3");
        }
      }, 1000);
    } catch (error) {
      console.error("❌ Map initialization failed:", error);
    }
  };

  const formatArea = (area_m2: number): string => {
    const rai = Math.floor(area_m2 / 1600);
    const rem1 = area_m2 - rai * 1600;
    const ngan = Math.floor(rem1 / 400);
    const rem2 = rem1 - ngan * 400;
    const wah = Math.round(rem2 / 4);
    return `${rai} ไร่ ${ngan} งาน ${wah} ตร.วา`;
  };

  const formatCoordinates = (): string => {
    if (!currentField) return "";
    return `${currentField.centroid_lat.toFixed(
      6
    )}, ${currentField.centroid_lng.toFixed(6)}`;
  };

  const formatAddress = (): string => {
    return currentField?.address || "ยังไม่ได้ระบุตำแหน่ง";
  };

  const formatPlantingDate = (): string => {
    if (!currentField?.planting_date) return "ยังไม่ได้ระบุ";
    try {
      const date = new Date(currentField.planting_date);

      // ตรวจสอบว่าวันที่ถูกต้องหรือไม่
      if (isNaN(date.getTime())) {
        console.error("Invalid planting date:", currentField.planting_date);
        return "วันที่ไม่ถูกต้อง";
      }

      // แสดงวันที่แบบไทยพร้อมปี พ.ศ.
      const day = date.getDate();
      const month = date.toLocaleDateString("th-TH", { month: "long" });
      const year = date.getFullYear();
      const thaiYear = year + 543;

      return `${day} ${month} พ.ศ. ${thaiYear}`;
    } catch (error) {
      console.error(
        "Error formatting planting date:",
        error,
        currentField.planting_date
      );
      return "ยังไม่ได้ระบุ";
    }
  };

  const formatCreatedDate = (): string => {
    if (!currentField?.created_at) return "ไม่ทราบ";
    try {
      const date = new Date(currentField.created_at);

      if (isNaN(date.getTime())) {
        return "ไม่ทราบ";
      }

      const day = date.getDate();
      const month = date.toLocaleDateString("th-TH", { month: "long" });
      const year = date.getFullYear();
      const thaiYear = year + 543;

      return `${day} ${month} พ.ศ. ${thaiYear}`;
    } catch (error) {
      console.error("Error formatting created date:", error);
      return "ไม่ทราบ";
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
          <div>กำลังโหลดข้อมูลแปลง...</div>
        </div>
      </section>
    );
  }

  if (!currentField) {
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
          <div>ไม่พบข้อมูลแปลง</div>
        </div>
      </section>
    );
  }

  return (
    <section className="page active field-detail-page">
      <div className="work">
        <div className="map-pane">
          <div ref={mapContainerRef} className="map" />

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
            <button className="backbtn" onClick={() => navigate("/map")}>
              ← ย้อนกลับ
            </button>
            <h3 style={{ margin: 0 }}>รายละเอียดแปลง</h3>
          </div>

          <div
            className="field-card"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              cursor: "default",
              padding: "20px",
            }}
          >
            {/* Field title moved to the very top to avoid overflow */}
            <div
              style={{
                marginBottom: "4px",
                textAlign: "center",
                width: "100%",
              }}
            >
              <strong
                style={{
                  fontSize: "22px",
                  color: "#1a1a1a",
                  lineHeight: 1.2,
                  wordBreak: "break-word",
                  display: "inline-block",
                  textAlign: "center",
                }}
              >
                {currentField.name}
              </strong>
            </div>

            {/* Header section now shows image and meta only */}
            <div
              style={{
                display: "flex",
                gap: "16px",
                alignItems: "flex-start",
              }}
            >
              <img
                className="field-thumb"
                src={
                  thumbnail ||
                  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="120"><rect width="100%" height="100%" rx="10" ry="10" fill="#fff" stroke="#e6e8ef"/><text x="10" y="24" font-size="14" fill="#6b7280">thumb</text></svg>'
                }
                alt="Field thumbnail"
                style={{
                  width: "160px",
                  height: "120px",
                  objectFit: "cover",
                  borderRadius: "12px",
                  border: "1px solid var(--line)",
                  flexShrink: 0,
                }}
              />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ marginBottom: "16px" }}>
                  <span
                    className="pill"
                    style={{
                      display: "inline-block",
                      padding: "8px 16px",
                      borderRadius: "20px",
                      background: "var(--brand-light)",
                      color: "var(--brand)",
                      border: "1px solid rgba(31, 157, 85, 0.2)",
                      fontSize: "16px",
                      fontWeight: "500",
                    }}
                  >
                    {currentField.crop_type || "ข้าว"}
                  </span>
                </div>
              </div>
            </div>

            {/* Information grid */}
            <div
              style={{
                backgroundColor: "#fefefe",
                padding: "12px",
                borderRadius: "12px",
                border: "1px solid var(--line)",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: "6px",
                }}
              >
                {/* Size */}
                <div
                  style={{
                    padding: "6px",
                  }}
                >
                  <div className="meta-row" style={{ marginBottom: "3px" }}>
                    📏 <strong>ขนาด:</strong>
                  </div>
                  <div
                    style={{
                      fontSize: "16px",
                      color: "#059669",
                      fontWeight: "bold",
                      marginLeft: "24px",
                    }}
                  >
                    {formatArea(currentField.area_m2)}
                  </div>
                </div>

                {/* Location */}
                <div
                  style={{
                    padding: "6px",
                  }}
                >
                  <div className="meta-row" style={{ marginBottom: "3px" }}>
                    <img
                      src="/src/icon/ตำแหน่ง.png"
                      alt="ตำแหน่ง"
                      style={{ width: "16px", height: "16px" }}
                    />
                    <strong>ตำแหน่ง:</strong>
                  </div>
                  <div
                    style={{
                      fontSize: "14px",
                      color: "#6b7280",
                      lineHeight: "1.4",
                      marginLeft: "24px",
                    }}
                  >
                    {formatAddress()}
                  </div>
                </div>

                {/* Coordinates */}
                <div
                  style={{
                    padding: "6px",
                  }}
                >
                  <div className="meta-row" style={{ marginBottom: "3px" }}>
                    <img
                      src="/src/icon/COMPASS.png"
                      alt="พิกัด"
                      style={{ width: "16px", height: "16px" }}
                    />
                    <strong>พิกัด:</strong>
                  </div>
                  <div
                    style={{
                      fontSize: "14px",
                      fontFamily: "monospace",
                      color: "#6b7280",
                      marginLeft: "24px",
                    }}
                  >
                    {formatCoordinates()}
                  </div>
                </div>

                {/* Planting Date */}
                <div
                  style={{
                    padding: "6px",
                  }}
                >
                  <div className="meta-row" style={{ marginBottom: "3px" }}>
                    <img
                      src="/src/icon/ชนิดสายพัน.png"
                      alt="ปลูกเมื่อ"
                      style={{ width: "16px", height: "16px" }}
                    />
                    <strong>ปลูกเมื่อ:</strong>
                  </div>
                  <div
                    style={{
                      fontSize: "14px",
                      color: "#6b7280",
                      marginLeft: "24px",
                    }}
                  >
                    {formatPlantingDate()}
                  </div>
                </div>

                {/* Variety */}
                <div
                  style={{
                    padding: "6px",
                  }}
                >
                  <div className="meta-row" style={{ marginBottom: "3px" }}>
                    <img
                      src="/src/icon/สายพัน.png"
                      alt="สายพันธุ์"
                      style={{ width: "16px", height: "16px" }}
                    />
                    <strong>สายพันธุ์:</strong>
                  </div>
                  <div
                    style={{
                      fontSize: "14px",
                      color: "#6b7280",
                      marginLeft: "24px",
                    }}
                  >
                    {currentField.variety ||
                      currentField.crop_type ||
                      "ยังไม่ได้ระบุ"}
                  </div>
                </div>

                {/* Season */}
                <div
                  style={{
                    padding: "6px",
                  }}
                >
                  <div className="meta-row" style={{ marginBottom: "3px" }}>
                    🚰 <strong>ฤดูกาล:</strong>
                  </div>
                  <div
                    style={{
                      fontSize: "14px",
                      color: "#6b7280",
                      marginLeft: "24px",
                    }}
                  >
                    {currentField.planting_season || "ยังไม่ได้ระบุ"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="feature-grid">
            <div
              className="feature"
              onClick={() => navigate(`/health/${fieldId}`)}
            >
              <div style={{ fontSize: "24px", marginBottom: "8px" }}>
                <img
                  src="/src/icon/การติดตามข้าว.png"
                  alt="ติดตามความสมบูรณ์ข้าว"
                  style={{ width: "32px", height: "32px" }}
                />
              </div>
              <div>ติดตามความสมบูรณ์ข้าว</div>
              <div
                style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}
              >
                วิเคราะห์ดัชนีจากดาวเทียม
              </div>
            </div>

            <div
              className="feature"
              onClick={() => navigate(`/analysis/${fieldId}`)}
            >
              <div style={{ fontSize: "24px", marginBottom: "8px" }}>
                <img
                  src="/src/icon/การวิเคราะห์.png"
                  alt="วิเคราะห์"
                  style={{ width: "32px", height: "32px" }}
                />
              </div>
              <div>วิเคราะห์</div>
              <div
                style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}
              >
                แนวโน้มและคาดการณ์
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: "20px",
              padding: "16px",
              backgroundColor: "#f8f9fa",
              borderRadius: "12px",
              border: "1px solid var(--line)",
            }}
          >
            <h4 style={{ margin: "0 0 10px 0" }}>ข้อมูลเพิ่มเติม</h4>
            <div style={{ fontSize: "14px", color: "#6b7280" }}>
              <div>สร้างเมื่อ: {formatCreatedDate()}</div>
              <div>รหัสแปลง: {currentField.id.slice(0, 8)}...</div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
};

export default FieldDetailPage;
