import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet-draw";
import { useField } from "../contexts/FieldContext";
import { useAuth } from "../contexts/AuthContext";
import FieldCard from "../components/FieldCard";
import NDVILegend from "../components/NDVILegend";
import SearchPanel from "../components/SearchPanel";

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const MapPage: React.FC = () => {
  // ตัวอย่างข้อมูล legend จริงควรดึงจากข้อมูล NDVI ที่แสดงบนแผนที่
  const ndviLegendItems = [
    { color: "#d73027", label: "ต่ำมาก (0.0 - 0.2)", percent: 8 },
    { color: "#fc8d59", label: "ต่ำ (0.2 - 0.4)", percent: 15 },
    { color: "#fee08b", label: "ปานกลาง (0.4 - 0.6)", percent: 30 },
    { color: "#d9ef8b", label: "สูง (0.6 - 0.8)", percent: 35 },
    { color: "#1a9850", label: "สูงมาก (0.8 - 1.0)", percent: 12 },
  ];
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const drawnLayerRef = useRef<L.Layer | null>(null);
  const drawControlRef = useRef<any>(null);

  const { fields, createField, refreshFields, saveThumbnail } = useField();
  const {} = useAuth();
  const navigate = useNavigate();

  const [isDrawing, setIsDrawing] = useState(false);
  const [showDrawForm, setShowDrawForm] = useState(false);
  const [drawFormData, setDrawFormData] = useState({
    name: "แปลง A1",
    crop_type: "ข้าวหอมมะลิ",
    variety: "ข้าวหอมมะลิ",
    planting_season: "",
    planting_date: "",
  });

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Initialize map
    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
    }).setView([18.79, 98.99], 12);

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

    // Add layer control
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

    mapRef.current = map;

    // Initialize draw control
    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);

    const drawControl = new (L.Control as any).Draw({
      position: "topleft",
      draw: {
        polygon: {
          allowIntersection: false,
          showArea: true,
          drawError: {
            color: "#e1e100",
            message: "<strong>ข้อผิดพลาด:</strong> รูปร่างไม่สามารถเซ็กกันได้!",
          },
          shapeOptions: {
            color: "#2b7a4b",
            weight: 2,
            fillOpacity: 0.1,
          },
        },
        circle: false,
        rectangle: false,
        marker: false,
        circlemarker: false,
        polyline: false,
      },
      edit: {
        featureGroup: drawnItems,
      },
    });

    drawControlRef.current = drawControl;

    // Handle draw events
    map.on((L as any).Draw.Event.CREATED, (e: any) => {
      const layer = e.layer;
      if (drawnLayerRef.current) {
        map.removeLayer(drawnLayerRef.current);
      }

      drawnLayerRef.current = layer;
      map.addLayer(layer);
      map.fitBounds(layer.getBounds(), { padding: [20, 20] });

      // หยุดโหมดวาดและแสดงฟอร์มกรอกข้อมูล
      setIsDrawing(false);
      setShowDrawForm(true);

      console.log("✅ ผู้ใช้วาดรูปเสร็จแล้ว กำลังแสดงฟอร์มกรอกข้อมูล");
    });

    // Restore existing fields
    restoreFields();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (mapRef.current && fields.length > 0) {
      restoreFields();
    }
  }, [fields]);

  const restoreFields = () => {
    if (!mapRef.current || fields.length === 0) return;

    fields.forEach((field) => {
      try {
        const layer = L.geoJSON(field.geometry, {
          style: {
            color: "#2b7a4b",
            weight: 2,
            fillOpacity: 0.1,
          },
        }).addTo(mapRef.current!);

        // Add click handler to navigate to field detail
        layer.on("click", () => {
          navigate(`/field/${field.id}`);
        });
      } catch (error) {
        console.error("Error displaying field:", error);
      }
    });

    // Fit bounds to show all fields
    if (fields.length === 1) {
      const field = fields[0];
      const layer = L.geoJSON(field.geometry);
      mapRef.current!.fitBounds(layer.getBounds(), { padding: [20, 20] });
    }
  };

  const startDrawing = () => {
    if (!mapRef.current || !drawControlRef.current) return;

    setIsDrawing(true);
    setShowDrawForm(false);

    mapRef.current.addControl(drawControlRef.current);

    // Enable polygon drawing
    const polygonDrawer = new (L as any).Draw.Polygon(mapRef.current, {
      shapeOptions: {
        color: "#2b7a4b",
        weight: 2,
        fillOpacity: 0.12,
      },
    });
    polygonDrawer.enable();
  };

  const cancelDraw = () => {
    setShowDrawForm(false);
    setIsDrawing(false);
    if (mapRef.current && drawControlRef.current) {
      mapRef.current.removeControl(drawControlRef.current);
    }
  };

  const handleFormSubmit = async () => {
    if (!drawnLayerRef.current) {
      alert("กรุณาวาดรูปแปลงบนแผนที่ก่อน");
      return;
    }

    try {
      console.log("📝 กำลังบันทึกข้อมูลแปลง...");
      console.log("🔍 ข้อมูลที่จะส่ง:", drawFormData);

      // Validation
      if (!drawFormData.name.trim()) {
        alert("กรุณากรอกชื่อแปลง");
        return;
      }

      // Convert drawn layer to GeoJSON
      const geoJson = (drawnLayerRef.current as any).toGeoJSON();

      // ตรวจสอบ geometry
      if (!geoJson || !geoJson.geometry) {
        alert("เกิดข้อผิดพลาดในการวาดแปลง กรุณาลองใหม่");
        return;
      }

      // แปลง date format ให้ถูกต้อง
      let planting_date = null;
      if (drawFormData.planting_date) {
        try {
          planting_date = new Date(drawFormData.planting_date).toISOString();
        } catch (error) {
          console.warn("Date format error:", error);
        }
      }

      const fieldData = {
        name: drawFormData.name.trim(),
        crop_type: drawFormData.crop_type,
        variety: drawFormData.variety,
        planting_season: drawFormData.planting_season || null,
        planting_date: planting_date,
        geometry: geoJson.geometry,
      };

      console.log("🚀 กำลังส่งข้อมูลไปยัง API:", fieldData);
      const newField = await createField(fieldData);

      // Capture thumbnail
      await captureAndSaveThumbnail(newField.id);

      // Reset form และซ่อนฟอร์ม
      setShowDrawForm(false);
      setDrawFormData({
        name: "แปลง A1",
        crop_type: "ข้าวหอมมะลิ",
        variety: "ข้าวหอมมะลิ",
        planting_season: "",
        planting_date: "",
      });

      // ลบ drawn layer
      if (mapRef.current && drawnLayerRef.current) {
        mapRef.current.removeLayer(drawnLayerRef.current);
        drawnLayerRef.current = null;
      }

      alert("สร้างแปลงสำเร็จ!");
      console.log("✅ บันทึกแปลงสำเร็จ:", newField);
    } catch (error: any) {
      console.error("❌ บันทึกแปลงไม่สำเร็จ:", error);

      // แสดง error message ที่เข้าใจง่าย
      let errorMessage = "สร้างแปลงไม่สำเร็จ";

      if (error.response) {
        console.error("API Response Error:", error.response.data);
        if (error.response.status === 422) {
          errorMessage = "ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบข้อมูลที่กรอก";
        } else if (error.response.status === 401) {
          errorMessage = "กรุณาเข้าสู่ระบบใหม่";
        } else {
          errorMessage = error.response.data?.detail || errorMessage;
        }
      } else {
        errorMessage = error.message || errorMessage;
      }

      alert(errorMessage);
    }
  };

  const captureAndSaveThumbnail = async (fieldId: string) => {
    if (!mapRef.current) return;

    try {
      // Try to use leaflet-image first, fallback to canvas-based approach
      try {
        const leafletImage = (await import("leaflet-image")) as any;

        return new Promise<void>((resolve, reject) => {
          leafletImage.default(
            mapRef.current!,
            (err: any, canvas: HTMLCanvasElement) => {
              if (err) {
                reject(err);
                return;
              }

              // Resize to thumbnail size
              const thumbnailCanvas = document.createElement("canvas");
              thumbnailCanvas.width = 120;
              thumbnailCanvas.height = 90;

              const ctx = thumbnailCanvas.getContext("2d")!;
              ctx.drawImage(canvas, 0, 0, 120, 90);

              const dataUrl = thumbnailCanvas.toDataURL("image/png");

              // Save thumbnail
              saveThumbnail(fieldId, dataUrl)
                .then(() => resolve())
                .catch(reject);
            }
          );
        });
      } catch (leafletImageError) {
        console.log("leaflet-image not available, using fallback thumbnail");
        // Create a simple procedural thumbnail
        const canvas = document.createElement("canvas");
        canvas.width = 120;
        canvas.height = 90;
        const ctx = canvas.getContext("2d")!;

        // Generate a unique color based on fieldId
        const hash = fieldId.split("").reduce((a, b) => {
          a = ((a << 5) - a + b.charCodeAt(0)) & 0xffffffff;
          return a < 0 ? a + 0x100000000 : a;
        }, 0);

        const hue = hash % 360;
        const sat = 40 + (hash % 30);
        const light = 60 + (hash % 20);

        // Create a gradient background
        const gradient = ctx.createLinearGradient(0, 0, 120, 90);
        gradient.addColorStop(0, `hsl(${hue}, ${sat}%, ${light}%)`);
        gradient.addColorStop(1, `hsl(${hue + 30}, ${sat}%, ${light - 10}%)`);

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 120, 90);

        // Add some texture
        ctx.fillStyle = `hsla(${hue}, ${sat}%, ${light - 20}%, 0.3)`;
        for (let i = 0; i < 20; i++) {
          const x = (hash + i * 123) % 120;
          const y = (hash + i * 456) % 90;
          const size = 2 + ((hash + i) % 8);
          ctx.fillRect(x, y, size, size);
        }

        // Add field indicator
        ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
        ctx.fillRect(10, 10, 100, 2);
        ctx.fillRect(10, 10, 2, 70);
        ctx.fillRect(108, 10, 2, 70);
        ctx.fillRect(10, 78, 100, 2);

        // Add text
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.font = "12px Arial";
        ctx.fillText("🌾", 50, 35);
        ctx.font = "8px Arial";
        ctx.fillText("แปลง", 45, 55);

        const dataUrl = canvas.toDataURL("image/png");

        // Save thumbnail
        return saveThumbnail(fieldId, dataUrl);
      }
    } catch (error) {
      console.error("Failed to capture thumbnail:", error);
    }
  };

  const handleImportField = () => {
    alert("นำเข้าแปลง - ฟีเจอร์นี้จะพัฒนาในเวอร์ชันถัดไป");
  };

  return (
    <section className="page active map-page">
      <div className="work">
        <div className="map-pane" style={{ position: "relative" }}>
          <div ref={mapContainerRef} className="map" />
          <SearchPanel map={mapRef.current} />
          {/* Toolbar - left side controls */}
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
              onClick={() => {
                const maxZ = (mapRef.current as any)?.getMaxZoom?.() || 19;
                mapRef.current?.locate({ setView: true, maxZoom: maxZ });
              }}
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
          {/* NDVI Legend */}
          <NDVILegend items={ndviLegendItems} />
        </div>

        <aside className="sidebar">
          <div className="panel-title">แปลงของฉัน</div>
          <div className="search-row">
            <input placeholder="ค้นหาแปลงของฉัน" />
            <button onClick={refreshFields}>⟳</button>
          </div>

          {/* Field Cards */}
          {fields.map((field) => (
            <FieldCard key={field.id} field={field} />
          ))}

          {/* Add Field Actions */}
          <div
            style={{
              marginTop: "20px",
              borderTop: "1px solid var(--line)",
              paddingTop: "20px",
            }}
          >
            <div className="panel-title" style={{ fontSize: "16px" }}>
              เพิ่มแปลงใหม่
            </div>
            <div className="field-actions">
              <button
                className="btn btn-green"
                onClick={startDrawing}
                disabled={isDrawing}
              >
                {isDrawing ? "กำลังวาดแปลง..." : "วาดแปลง"}
              </button>
              <button className="btn btn-outline" onClick={handleImportField}>
                นำเข้าแปลง
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* Draw Form Modal */}
      {showDrawForm && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 2000,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "20px",
              borderRadius: "12px",
              minWidth: "400px",
              boxShadow: "0 12px 24px rgba(0,0,0,0.2)",
            }}
          >
            <h3>ข้อมูลแปลงใหม่</h3>

            <div className="field">
              <label>ชื่อแปลง</label>
              <input
                type="text"
                value={drawFormData.name}
                onChange={(e) =>
                  setDrawFormData({ ...drawFormData, name: e.target.value })
                }
                placeholder="เช่น แปลง A1"
              />
            </div>

            <div className="field">
              <label>สายพันธุ์ข้าว</label>
              <select
                value={drawFormData.variety}
                onChange={(e) =>
                  setDrawFormData({ ...drawFormData, variety: e.target.value })
                }
              >
                <option value="ข้าวหอมมะลิ">ข้าวหอมมะลิ</option>
                <option value="ข้าวกข6">ข้าวกข6</option>
                <option value="ข้าวกข15">ข้าวกข15</option>
                <option value="ข้าวปทุมธานี">ข้าวปทุมธานี</option>
                <option value="ข้าวสุพรรณบุรี">ข้าวสุพรรณบุรี</option>
                <option value="ข้าวเหนียว">ข้าวเหนียว</option>
                <option value="ข้าวไรซ์เบอรี่">ข้าวไรซ์เบอรี่</option>
                <option value="อื่นๆ">อื่นๆ</option>
              </select>
            </div>

            <div className="field">
              <label>ฤดูกาลปลูก</label>
              <select
                value={drawFormData.planting_season}
                onChange={(e) =>
                  setDrawFormData({
                    ...drawFormData,
                    planting_season: e.target.value,
                  })
                }
              >
                <option value="">เลือกฤดูกาล</option>
                <option value="นาปี">นาปี - ปลูกฤดูฝน อาศัยน้ำฝน</option>
                <option value="นาปรัง">
                  นาปรัง - ปลูกนอกฤดู ใช้น้ำชลประทาน/สูบน้ำ
                </option>
                <option value="นาดำ">นาดำ - เพาะกล้าแล้วถอนมาปักดำ</option>
                <option value="นาหว่าน">
                  นาหว่าน - หว่านเมล็ดลงแปลงโดยตรง
                </option>
                <option value="นาชลประทาน">
                  นาชลประทาน - ใช้น้ำจากระบบชลประทาน
                </option>
                <option value="นาฝน">นาฝน - อาศัยแต่น้ำฝนตามธรรมชาติ</option>
              </select>
            </div>

            <div className="field">
              <label>วันที่ปลูก</label>
              <input
                type="date"
                value={drawFormData.planting_date}
                onChange={(e) =>
                  setDrawFormData({
                    ...drawFormData,
                    planting_date: e.target.value,
                  })
                }
              />
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
              <button
                className="btn btn-green"
                onClick={handleFormSubmit}
                style={{ flex: 1 }}
              >
                เพิ่มรายแปลง
              </button>
              <button
                className="btn btn-outline"
                onClick={cancelDraw}
                style={{ flex: 1 }}
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default MapPage;
